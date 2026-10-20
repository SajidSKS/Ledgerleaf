import type { Backup, Snapshot } from "../types";
import { defaultSettings } from "../types";
export const makeBackup = (data: Snapshot): Backup => ({
  ...data,
  format: "ledgerleaf",
  version: 1,
  exportedAt: new Date().toISOString(),
});
export function validateBackup(text: string): Backup {
  const b = JSON.parse(text);
  const fail = () => {
    throw new Error(
      "This file is not a valid Ledgerleaf v1 backup. Nothing was changed.",
    );
  };
  if (
    b?.format !== "ledgerleaf" ||
    b.version !== 1 ||
    !["expenses", "categories", "paymentMethods", "budgets"].every((key) =>
      Array.isArray(b[key]),
    )
  )
    fail();
  const str = (v: unknown) =>
    typeof v === "string" && v.length > 0 && v.length <= 2000;
  const minor = (v: unknown) =>
    typeof v === "number" &&
    Number.isSafeInteger(v) &&
    v >= 0 &&
    v <= 999999999999;
  const stamp = (v: unknown) =>
    typeof v === "number" &&
    Number.isFinite(v) &&
    Number.isFinite(new Date(v).getTime());
  for (const key of ["expenses", "categories", "paymentMethods"])
    if (new Set(b[key].map((v: { id: string }) => v.id)).size !== b[key].length)
      fail();
  if (
    new Set(b.budgets.map((v: { month: string }) => v.month)).size !==
    b.budgets.length
  )
    fail();
  for (const c of b.categories)
    if (
      !str(c.id) ||
      !str(c.name) ||
      !/^#[0-9a-f]{6}$/i.test(c.colour) ||
      !str(c.icon) ||
      typeof c.archived !== "boolean"
    )
      fail();
  for (const m of b.paymentMethods)
    if (
      !str(m.id) ||
      !str(m.name) ||
      !str(m.icon) ||
      typeof m.archived !== "boolean"
    )
      fail();
  const cats = new Set(b.categories.map((c: { id: string }) => c.id)),
    methods = new Set(b.paymentMethods.map((m: { id: string }) => m.id));
  for (const e of b.expenses)
    if (
      !str(e.id) ||
      !minor(e.amount) ||
      e.amount === 0 ||
      !cats.has(e.categoryId) ||
      (e.paymentMethodId !== null && !methods.has(e.paymentMethodId)) ||
      typeof e.note !== "string" ||
      e.note.length > 2000 ||
      ![e.timestamp, e.createdAt, e.updatedAt].every(stamp)
    )
      fail();
  for (const budget of b.budgets)
    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(budget.month) ||
      !minor(budget.total) ||
      !budget.limits ||
      typeof budget.limits !== "object" ||
      Array.isArray(budget.limits) ||
      !Object.entries(budget.limits).every(
        ([id, value]) => cats.has(id) && minor(value),
      )
    )
      fail();
  const s = b.settings;
  if (
    !s ||
    !["INR", "USD", "EUR", "GBP", "AED"].includes(s.currency) ||
    !["light", "dark", "auto"].includes(s.theme) ||
    ![0, 1].includes(s.weekStart) ||
    !(s.lastBackup === null || stamp(s.lastBackup)) ||
    !(
      s.reminderDismissed === null ||
      (typeof s.reminderDismissed === "string" &&
        /^\d{4}-\d{2}$/.test(s.reminderDismissed))
    ) ||
    typeof s.sampleLoaded !== "boolean"
  )
    fail();
  return {
    format: "ledgerleaf",
    version: 1,
    exportedAt: typeof b.exportedAt === "string" ? b.exportedAt : "",
    expenses: b.expenses,
    categories: b.categories,
    paymentMethods: b.paymentMethods,
    budgets: b.budgets,
    settings: { ...defaultSettings, ...s },
  };
}
