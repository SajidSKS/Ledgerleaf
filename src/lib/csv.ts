import type { Snapshot, Expense, Category, PaymentMethod } from "../types";
import { dayKey, timeKey } from "./dates";
import { plain, toMinor } from "./money";
const columns = [
  "Date",
  "Time",
  "Amount",
  "Category",
  "Payment Method",
  "Note",
];
const escape = (v: string) =>
  /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
export function exportCSV(data: Snapshot, items: Expense[]): string {
  const cats = new Map(data.categories.map((c) => [c.id, c.name])),
    methods = new Map(data.paymentMethods.map((m) => [m.id, m.name]));
  return (
    "\uFEFF" +
    [
      columns,
      ...[...items]
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((e) => [
          dayKey(e.timestamp),
          timeKey(e.timestamp),
          plain(e.amount),
          cats.get(e.categoryId) || "Uncategorised",
          e.paymentMethodId ? methods.get(e.paymentMethodId) || "" : "",
          e.note,
        ]),
    ]
      .map((row) => row.map(escape).join(","))
      .join("\r\n")
  );
}
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += c;
    } else if (c === '"') {
      if (field || closed) throw new Error("Unexpected quote in CSV.");
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
      closed = false;
    } else if (c === "\r" || c === "\n") {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((v) => v.length)) rows.push(row);
      row = [];
      field = "";
      closed = false;
    } else {
      if (closed) throw new Error("Unexpected text after a closing CSV quote.");
      field += c;
    }
  }
  if (quoted) throw new Error("A CSV quote was not closed.");
  row.push(field);
  if (row.some((v) => v.length)) rows.push(row);
  return rows;
}
export function importCSV(
  text: string,
  data: Snapshot,
): Pick<Snapshot, "expenses" | "categories" | "paymentMethods"> {
  const rows = parseCSV(text),
    header = rows.shift();
  const legacy = ["Date", "Time", "Amount", "Category", "Note"];
  const modern = header?.join("|") === columns.join("|");
  if (!modern && header?.join("|") !== legacy.join("|"))
    throw new Error(
      "Use columns: Date, Time, Amount, Category, Payment Method, Note.",
    );
  const categories: Category[] = [...data.categories],
    paymentMethods: PaymentMethod[] = [...data.paymentMethods],
    expenses: Expense[] = [];
  rows.forEach((row, i) => {
    if (row.length !== header!.length)
      throw new Error(`Row ${i + 2}: incorrect number of columns.`);
    const [date, time, amount, cat] = row,
      method = modern ? row[4].trim() : "",
      note = modern ? row[5] : row[4];
    const stamp = new Date(`${date}T${time}:00`).getTime();
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^\d{2}:\d{2}$/.test(time) ||
      !Number.isFinite(stamp) ||
      dayKey(stamp) !== date ||
      timeKey(stamp) !== time
    )
      throw new Error(`Row ${i + 2}: invalid date or time.`);
    let minor: number;
    try {
      minor = toMinor(amount);
    } catch {
      throw new Error(`Row ${i + 2}: invalid amount.`);
    }
    if (!minor || !cat.trim())
      throw new Error(`Row ${i + 2}: amount and category are required.`);
    let c = categories.find(
      (c) => c.name.toLowerCase() === cat.trim().toLowerCase(),
    );
    if (!c) {
      c = {
        id: crypto.randomUUID(),
        name: cat.trim().slice(0, 80),
        colour: "#84956d",
        icon: "tag",
        archived: false,
      };
      categories.push(c);
    }
    let m = paymentMethods.find(
      (m) => m.name.toLowerCase() === method.toLowerCase(),
    );
    if (method && !m) {
      m = {
        id: crypto.randomUUID(),
        name: method.slice(0, 80),
        icon: "card",
        archived: false,
      };
      paymentMethods.push(m);
    }
    expenses.push({
      id: crypto.randomUUID(),
      amount: minor,
      categoryId: c.id,
      paymentMethodId: m?.id || null,
      note: note.slice(0, 2000),
      timestamp: stamp,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
  if (!expenses.length) throw new Error("This CSV has no expense rows.");
  return { expenses, categories, paymentMethods };
}
