export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  paymentMethodId: string | null;
  note: string;
  timestamp: number;
  createdAt: number;
  updatedAt: number;
}
export interface Category {
  id: string;
  name: string;
  colour: string;
  icon: string;
  archived: boolean;
}
export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  archived: boolean;
}
export interface Budget {
  month: string;
  total: number;
  limits: Record<string, number>;
}
export interface Settings {
  currency: string;
  theme: "light" | "dark" | "auto";
  weekStart: 0 | 1;
  lastBackup: number | null;
  reminderDismissed: string | null;
  sampleLoaded: boolean;
}
export interface Snapshot {
  expenses: Expense[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  budgets: Budget[];
  settings: Settings;
}
export interface Backup extends Snapshot {
  format: "ledgerleaf";
  version: 1;
  exportedAt: string;
}
export const defaultSettings: Settings = {
  currency: "INR",
  theme: "auto",
  weekStart: 1,
  lastBackup: null,
  reminderDismissed: null,
  sampleLoaded: false,
};
export const defaultCategories: Category[] = [
  {
    id: "food",
    name: "Food & drink",
    colour: "#b87755",
    icon: "utensils",
    archived: false,
  },
  {
    id: "transport",
    name: "Transport",
    colour: "#748c89",
    icon: "bus",
    archived: false,
  },
  {
    id: "shopping",
    name: "Shopping",
    colour: "#aa8b69",
    icon: "bag",
    archived: false,
  },
  {
    id: "groceries",
    name: "Groceries",
    colour: "#84956d",
    icon: "basket",
    archived: false,
  },
  {
    id: "bills",
    name: "Bills",
    colour: "#a79986",
    icon: "bolt",
    archived: false,
  },
  {
    id: "leisure",
    name: "Leisure",
    colour: "#c29685",
    icon: "spark",
    archived: false,
  },
];
export const defaultMethods: PaymentMethod[] = [
  { id: "upi", name: "UPI", icon: "phone", archived: false },
  { id: "cash", name: "Cash", icon: "cash", archived: false },
  { id: "card", name: "Card", icon: "card", archived: false },
];
