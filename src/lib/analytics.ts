import type { Budget, Expense } from "../types";
import { dayKey, daysInMonth, monthKey, monthDate } from "./dates";
export const sum = (expenses: Expense[]) =>
  expenses.reduce((total, e) => total + e.amount, 0);
export function budgetFor(budgets: Budget[], month: string): Budget {
  const prior = budgets
    .filter((b) => b.month <= month)
    .sort((a, b) => b.month.localeCompare(a.month))[0];
  return { month, total: prior?.total || 0, limits: prior?.limits || {} };
}
export function totalsBy(
  expenses: Expense[],
  field: "categoryId" | "paymentMethodId",
) {
  const map = new Map<string, number>();
  for (const e of expenses) {
    const key = e[field] || "unset";
    map.set(key, (map.get(key) || 0) + e.amount);
  }
  return [...map]
    .map(([id, value]) => ({ id, value }))
    .sort((a, b) => b.value - a.value);
}
export function monthStats(
  expenses: Expense[],
  month: string,
  now = new Date(),
) {
  const items = expenses.filter((e) => monthKey(e.timestamp) === month);
  const days = daysInMonth(month),
    current = monthKey(now),
    elapsed = month < current ? days : month === current ? now.getDate() : 0;
  const spent = sum(items),
    actual = sum(items.filter((e) => dayKey(e.timestamp) <= dayKey(now)));
  const average = elapsed ? Math.round(actual / elapsed) : 0;
  return {
    items,
    spent,
    days,
    elapsed,
    average,
    projected: month < current ? spent : Math.max(spent, average * days),
    biggest: [...items].sort((a, b) => b.amount - a.amount)[0],
    daily: Array.from({ length: days }, (_, i) => {
      const d = monthDate(month);
      d.setDate(i + 1);
      return {
        label: String(i + 1),
        value: sum(items.filter((e) => dayKey(e.timestamp) === dayKey(d))),
      };
    }),
  };
}
