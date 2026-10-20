import type { Snapshot, Expense } from "../types";
import { defaultCategories, defaultMethods, defaultSettings } from "../types";
import { monthKey, daysInMonth } from "../lib/dates";
export function sampleData(): Snapshot {
  const now = new Date(),
    expenses: Expense[] = [],
    budgets = [];
  const notes: Record<string, string[]> = {
    food: [
      "Lunch with Nihal",
      "Coffee & a quiet moment",
      "Evening chai",
      "Dosa at the canteen",
    ],
    transport: ["Auto to college", "Bus fare", "Weekend ride"],
    shopping: ["A new notebook", "Everyday essentials"],
    groceries: ["Weekly groceries", "Fruit & vegetables"],
    bills: ["Mobile recharge", "Internet bill"],
    leisure: ["Movie night", "A book for the weekend"],
  };
  let randomSeed = 3421;
  const random = () => {
    randomSeed = (randomSeed * 16807) % 2147483647;
    return randomSeed / 2147483647;
  };
  for (let offset = 23; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1),
      month = monthKey(d);
    budgets.push({
      month,
      total: 1500000,
      limits: { food: 450000, shopping: 300000 },
    });
    const max = offset === 0 ? now.getDate() : daysInMonth(month);
    for (let day = 1; day <= max; day++) {
      const count = random() > 0.25 ? (random() > 0.5 ? 2 : 1) : 0;
      for (let n = 0; n < count; n++) {
        const category =
          defaultCategories[Math.floor(random() * defaultCategories.length)];
        const amount =
          (category.id === "bills"
            ? 299 + Math.floor(random() * 500)
            : category.id === "shopping"
              ? 200 + Math.floor(random() * 1400)
              : 30 + Math.floor(random() * 380)) * 100;
        const stamp = new Date(
          d.getFullYear(),
          d.getMonth(),
          day,
          8 + Math.floor(random() * 13),
          Math.floor(random() * 60),
        ).getTime();
        if (stamp > now.getTime()) continue;
        expenses.push({
          id: crypto.randomUUID(),
          categoryId: category.id,
          amount,
          paymentMethodId:
            random() > 0.12
              ? defaultMethods[Math.floor(random() * 3)].id
              : null,
          note: notes[category.id][
            Math.floor(random() * notes[category.id].length)
          ],
          timestamp: stamp,
          createdAt: stamp,
          updatedAt: stamp,
        });
      }
    }
  }
  return {
    expenses,
    budgets,
    categories: defaultCategories,
    paymentMethods: defaultMethods,
    settings: { ...defaultSettings, sampleLoaded: true },
  };
}
