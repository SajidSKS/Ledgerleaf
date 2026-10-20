export function toMinor(value: string): number {
  const clean = value.trim();
  if (!/^\d{1,10}(\.\d{0,2})?$/.test(clean))
    throw new Error("Use a positive amount with up to two decimal places.");
  const [whole, fraction = ""] = clean.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount > 999999999999)
    throw new Error("This amount is too large.");
  return amount;
}
export function plain(amount: number) {
  return (amount / 100).toFixed(2);
}
export function money(amount: number, currency = "INR", decimals = false) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}
export function symbol(currency: string) {
  return (
    new Intl.NumberFormat("en", { style: "currency", currency })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value || currency
  );
}
