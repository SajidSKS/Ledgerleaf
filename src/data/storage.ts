import Dexie, { type Table } from "dexie";
import type {
  Snapshot,
  Expense,
  Category,
  PaymentMethod,
  Budget,
  Settings,
  Backup,
} from "../types";
import { defaultSettings, defaultCategories, defaultMethods } from "../types";

// The UI uses this interface only. Replace this adapter to migrate to SQLite.
export interface LedgerStorage {
  init(): Promise<void>;
  snapshot(): Promise<Snapshot>;
  saveExpense(expense: Expense): Promise<void>;
  deleteExpense(id: string): Promise<void>;
  saveCategory(category: Category): Promise<void>;
  saveMethod(method: PaymentMethod): Promise<void>;
  saveBudget(budget: Budget): Promise<void>;
  saveSettings(settings: Settings): Promise<void>;
  restore(backup: Backup): Promise<void>;
  merge(
    data: Pick<Snapshot, "expenses" | "categories" | "paymentMethods">,
  ): Promise<number>;
  seed(data: Snapshot): Promise<void>;
}
class LedgerDB extends Dexie {
  expenses!: Table<Expense, string>;
  categories!: Table<Category, string>;
  paymentMethods!: Table<PaymentMethod, string>;
  budgets!: Table<Budget, string>;
  preferences!: Table<{ id: string; value: Settings }, string>;
  constructor() {
    super("ledgerleaf-v1");
    this.version(1).stores({
      expenses: "id,timestamp,categoryId,paymentMethodId,createdAt",
      categories: "id",
      paymentMethods: "id",
      budgets: "month",
      preferences: "id",
    });
  }
}
const db = new LedgerDB();
export const storage: LedgerStorage = {
  async init() {
    await db.transaction(
      "rw",
      [db.categories, db.paymentMethods, db.preferences],
      async () => {
        if (!(await db.preferences.get("settings"))) {
          await db.categories.bulkPut(defaultCategories);
          await db.paymentMethods.bulkPut(defaultMethods);
          await db.preferences.put({ id: "settings", value: defaultSettings });
        }
      },
    );
    // Best effort. The browser can decline, so portable backups remain essential.
    try {
      await navigator.storage?.persist?.();
    } catch {
      /* Some browsers do not implement persistence. */
    }
  },
  async snapshot() {
    return db.transaction("r", db.tables, async () => {
      const [expenses, categories, paymentMethods, budgets, prefs] =
        await Promise.all([
          db.expenses.toArray(),
          db.categories.toArray(),
          db.paymentMethods.toArray(),
          db.budgets.toArray(),
          db.preferences.get("settings"),
        ]);
      return {
        expenses,
        categories,
        paymentMethods,
        budgets,
        settings: { ...defaultSettings, ...prefs?.value },
      };
    });
  },
  async saveExpense(e) {
    await db.expenses.put(e);
  },
  async deleteExpense(id) {
    await db.expenses.delete(id);
  },
  async saveCategory(c) {
    await db.categories.put(c);
  },
  async saveMethod(m) {
    await db.paymentMethods.put(m);
  },
  async saveBudget(b) {
    await db.budgets.put(b);
  },
  async saveSettings(s) {
    await db.preferences.put({ id: "settings", value: s });
  },
  async restore(data) {
    await db.transaction("rw", db.tables, async () => {
      await Promise.all(db.tables.map((table) => table.clear()));
      await db.expenses.bulkPut(data.expenses);
      await db.categories.bulkPut(data.categories);
      await db.paymentMethods.bulkPut(data.paymentMethods);
      await db.budgets.bulkPut(data.budgets);
      await db.preferences.put({ id: "settings", value: data.settings });
    });
  },
  async merge(data) {
    return db.transaction(
      "rw",
      [db.expenses, db.categories, db.paymentMethods],
      async () => {
        const old = await db.expenses.toArray();
        const fingerprint = (e: Expense) =>
          [
            Math.floor(e.timestamp / 60000),
            e.amount,
            e.categoryId,
            e.paymentMethodId || "",
            e.note,
          ].join("|");
        const seen = new Set(old.map(fingerprint));
        const incoming = data.expenses.filter((e) => {
          const k = fingerprint(e);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        for (const c of data.categories)
          if (!(await db.categories.get(c.id))) await db.categories.put(c);
        for (const m of data.paymentMethods)
          if (!(await db.paymentMethods.get(m.id)))
            await db.paymentMethods.put(m);
        await db.expenses.bulkAdd(
          incoming.map((e) => ({ ...e, id: crypto.randomUUID() })),
        );
        return incoming.length;
      },
    );
  },
  async seed(data) {
    await db.transaction("rw", db.tables, async () => {
      if ((await db.preferences.get("settings"))?.value.sampleLoaded) return;
      for (const c of data.categories)
        if (!(await db.categories.get(c.id))) await db.categories.put(c);
      for (const m of data.paymentMethods)
        if (!(await db.paymentMethods.get(m.id)))
          await db.paymentMethods.put(m);
      await db.expenses.bulkAdd(data.expenses);
      for (const b of data.budgets)
        if (!(await db.budgets.get(b.month))) await db.budgets.put(b);
      const current =
        (await db.preferences.get("settings"))?.value || defaultSettings;
      await db.preferences.put({
        id: "settings",
        value: { ...current, sampleLoaded: true },
      });
    });
  },
};
