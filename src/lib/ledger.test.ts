import { sampleData } from "../data/sample";
import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { toMinor, plain } from "./money";
import { budgetFor, monthStats } from "./analytics";
import { exportCSV, importCSV, parseCSV } from "./csv";
import { makeBackup, validateBackup } from "./backup";
import { defaultCategories, defaultMethods, defaultSettings } from "../types";
import type { Snapshot, Expense, Budget } from "../types";
import { storage } from "../data/storage";
const stamp = new Date(2026, 0, 15, 13, 45, 29).getTime();
const expense: Expense = {
  id: "test",
  amount: 12345,
  categoryId: "food",
  paymentMethodId: null,
  note: 'Lunch, "with Nihal"\nTea too',
  timestamp: stamp,
  createdAt: stamp,
  updatedAt: stamp,
};
const empty = (): Snapshot => ({
  expenses: [],
  categories: structuredClone(defaultCategories),
  paymentMethods: structuredClone(defaultMethods),
  budgets: [],
  settings: { ...defaultSettings },
});
describe("integer money and permanent periods", () => {
  it("parses paise without floating point rounding", () => {
    expect(toMinor("0.29")).toBe(29);
    expect(toMinor("9999999999.99")).toBe(999999999999);
    expect(toMinor("12.1")).toBe(1210);
    expect(plain(101)).toBe("1.01");
  });
  it.each(["1.001", "-12", "1e4", "NaN", "12,000", ""])(
    "rejects invalid amount %s",
    (v) => expect(() => toMinor(v)).toThrow(),
  );
  it("carries the last budget forward without leaking a future budget backwards", () => {
    const budgets: Budget[] = [
      { month: "2025-12", total: 10000, limits: { food: 5000 } },
      { month: "2026-03", total: 20000, limits: {} },
    ];
    expect(budgetFor(budgets, "2026-01")).toEqual({
      month: "2026-01",
      total: 10000,
      limits: { food: 5000 },
    });
    expect(budgetFor(budgets, "2025-01").total).toBe(0);
    expect(budgetFor(budgets, "2027-12").total).toBe(20000);
  });
  it("filters months without altering the original log", () => {
    const log = [
      expense,
      { ...expense, id: "other", timestamp: new Date(2025, 11, 1).getTime() },
    ];
    expect(monthStats(log, "2026-01", new Date(2026, 0, 20)).spent).toBe(12345);
    expect(log).toHaveLength(2);
  });
});
describe("portable exports", () => {
  it("roundtrips quotes, commas, newlines, blank methods, and exact paise", () => {
    const data = { ...empty(), expenses: [expense] };
    const csv = exportCSV(data, data.expenses);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(parseCSV(csv)[0]).toEqual([
      "Date",
      "Time",
      "Amount",
      "Category",
      "Payment Method",
      "Note",
    ]);
    const restored = importCSV(csv, empty()).expenses[0];
    expect(restored.note).toBe(expense.note);
    expect(restored.amount).toBe(12345);
    expect(restored.paymentMethodId).toBe(null);
    expect(parseCSV(csv)[1].slice(0, 3)).toEqual([
      "2026-01-15",
      "13:45",
      "123.45",
    ]);
  });
  it("imports legacy five-column CSV and creates missing labels", () => {
    const result = importCSV(
      "Date,Time,Amount,Category,Note\r\n2026-02-28,12:30,20.01,Tuition,Class",
      empty(),
    );
    expect(result.expenses[0].amount).toBe(2001);
    expect(result.categories.at(-1)?.name).toBe("Tuition");
  });
  it("accepts the payment-method layout and creates a custom payment", () => {
    const result = importCSV(
      "Date,Time,Amount,Category,Payment Method,Note\n2026-01-01,08:00,1.99,Food & drink,Wallet,Tea",
      empty(),
    );
    expect(result.paymentMethods.at(-1)?.name).toBe("Wallet");
    expect(result.expenses[0].paymentMethodId).toBe(
      result.paymentMethods.at(-1)?.id,
    );
  });
  it("rejects impossible dates, malformed quotes and invalid money", () => {
    expect(() =>
      importCSV(
        "Date,Time,Amount,Category,Note\n2026-02-30,12:00,1,Food,X",
        empty(),
      ),
    ).toThrow();
    expect(() => parseCSV('a,"unclosed')).toThrow();
    expect(() =>
      importCSV(
        "Date,Time,Amount,Category,Note\n2026-02-28,12:00,1.999,Food,X",
        empty(),
      ),
    ).toThrow();
  });
  it("validates references and safe integer money in JSON backups", () => {
    const b = makeBackup({ ...empty(), expenses: [expense] });
    expect(validateBackup(JSON.stringify(b)).expenses).toHaveLength(1);
    expect(() =>
      validateBackup(
        JSON.stringify({
          ...b,
          expenses: [{ ...expense, categoryId: "missing" }],
        }),
      ),
    ).toThrow();
    expect(() =>
      validateBackup(
        JSON.stringify({ ...b, expenses: [{ ...expense, amount: 1.5 }] }),
      ),
    ).toThrow();
    expect(() =>
      validateBackup(
        JSON.stringify({
          ...b,
          categories: [...b.categories, b.categories[0]],
        }),
      ),
    ).toThrow();
  });
});
describe("Dexie storage integrity", () => {
  beforeEach(async () => {
    await storage.init();
    await storage.restore(makeBackup(empty()));
  });
  it("retains past years and category labels when archived", async () => {
    await storage.saveExpense(expense);
    await storage.saveExpense({
      ...expense,
      id: "last-year",
      timestamp: new Date(2025, 0, 1).getTime(),
    });
    await storage.saveCategory({ ...defaultCategories[0], archived: true });
    const d = await storage.snapshot();
    expect(d.expenses).toHaveLength(2);
    expect(d.categories.find((c) => c.id === "food")?.name).toBe(
      "Food & drink",
    );
    expect(d.categories.find((c) => c.id === "food")?.archived).toBe(true);
  });
  it("skips duplicate CSV exports despite second/millisecond truncation", async () => {
    await storage.saveExpense(expense);
    const d = await storage.snapshot(),
      incoming = importCSV(exportCSV(d, d.expenses), d);
    expect(await storage.merge(incoming)).toBe(0);
    expect((await storage.snapshot()).expenses).toHaveLength(1);
  });
  it("restores a complete ledger and preserves payment references and budgets", async () => {
    const b = makeBackup({
      ...empty(),
      expenses: [{ ...expense, paymentMethodId: "upi" }],
      budgets: [{ month: "2026-01", total: 100000, limits: { food: 50000 } }],
    });
    await storage.restore(b);
    const d = await storage.snapshot();
    expect(d.expenses[0].paymentMethodId).toBe("upi");
    expect(d.budgets[0].limits.food).toBe(50000);
  });
  it("adds sample labels after an empty restored backup and seeds only once", async () => {
    await storage.restore(
      makeBackup({ ...empty(), categories: [], paymentMethods: [] }),
    );
    const sample = sampleData();
    await storage.seed(sample);
    await storage.seed(sample);
    const d = await storage.snapshot();
    expect(d.expenses).toHaveLength(sample.expenses.length);
    expect(
      d.expenses.every((e) => d.categories.some((c) => c.id === e.categoryId)),
    ).toBe(true);
    expect(
      d.expenses.every(
        (e) =>
          !e.paymentMethodId ||
          d.paymentMethods.some((m) => m.id === e.paymentMethodId),
      ),
    ).toBe(true);
  });
  it("rolls a failed restore transaction back instead of losing history", async () => {
    await storage.saveExpense(expense);
    const b = makeBackup(empty());
    b.expenses = [{ ...expense, id: undefined as unknown as string }];
    await expect(storage.restore(b)).rejects.toThrow();
    expect((await storage.snapshot()).expenses[0].id).toBe("test");
  });
});
