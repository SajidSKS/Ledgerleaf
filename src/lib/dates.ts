export const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (date: number | Date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const monthKey = (date: number | Date = new Date()) =>
  dayKey(date).slice(0, 7);
export const timeKey = (date: number | Date) => {
  const d = new Date(date);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const localInput = (date: number | Date) =>
  `${dayKey(date)}T${timeKey(date)}`;
export const monthDate = (month: string) =>
  new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1);
export const monthName = (month: string, short = false) =>
  monthDate(month).toLocaleDateString("en-IN", {
    month: short ? "short" : "long",
    year: "numeric",
  });
export function shiftMonth(month: string, by: number) {
  const d = monthDate(month);
  d.setMonth(d.getMonth() + by);
  return monthKey(d);
}
export const daysInMonth = (month: string) => {
  const d = monthDate(month);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
};
export function dayLabel(day: string) {
  const today = dayKey(new Date()),
    yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return day === today
    ? "Today"
    : day === dayKey(yesterday)
      ? "Yesterday"
      : new Date(day + "T12:00").toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: day.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric",
        });
}
