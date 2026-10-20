import { useMemo, useState } from "react";
import type { Snapshot, Expense } from "../types";
import { monthStats, budgetFor, sum, totalsBy } from "../lib/analytics";
import { dayKey, monthKey, monthName, shiftMonth } from "../lib/dates";
import { money } from "../lib/money";
import { Icon } from "../components/Icon";
import { Donut, Bars, Sparkline, Heatmap } from "../components/Charts";
import type { Slice } from "../components/Charts";
import { MonthPicker } from "./History";
export function Insights({ data }: { data: Snapshot }) {
  const [view, setView] = useState<"month" | "year">("month"),
    [month, setMonth] = useState(monthKey()),
    [year, setYear] = useState(new Date().getFullYear()),
    [compare, setCompare] = useState("previous");
  const currency = data.settings.currency,
    stats = useMemo(
      () => monthStats(data.expenses, month),
      [data.expenses, month],
    ),
    yearItems = data.expenses.filter(
      (e) => new Date(e.timestamp).getFullYear() === year,
    ),
    items = view === "month" ? stats.items : yearItems,
    total = sum(items);
  const categorySlices: Slice[] = totalsBy(items, "categoryId").map((s) => ({
    ...s,
    label: data.categories.find((c) => c.id === s.id)?.name || "Other",
    colour: data.categories.find((c) => c.id === s.id)?.colour || "#84956d",
  }));
  const methodColours = [
    "#527360",
    "#b98767",
    "#9eaa8f",
    "#c7b697",
    "#859c9b",
    "#b69b91",
  ];
  const methodSlices: Slice[] = totalsBy(items, "paymentMethodId").map(
    (s, i) => ({
      ...s,
      label:
        s.id === "unset"
          ? "Not specified"
          : data.paymentMethods.find((m) => m.id === s.id)?.name || "Other",
      colour: methodColours[i % methodColours.length],
    }),
  );
  const months = Array.from(
      { length: 12 },
      (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`,
    ),
    monthly = months.map((m) => ({
      label: new Date(m + "-02").toLocaleDateString("en", { month: "short" }),
      value: sum(yearItems.filter((e) => monthKey(e.timestamp) === m)),
      budget: budgetFor(data.budgets, m).total,
    }));
  const compareMonth = shiftMonth(month, compare === "previous" ? -1 : -12),
    previous = monthStats(data.expenses, compareMonth),
    delta = total - previous.spent;
  const activeMonths = monthly.filter((v) => v.value > 0),
    lightest = [...activeMonths].sort((a, b) => a.value - b.value)[0],
    fullest = [...activeMonths].sort((a, b) => b.value - a.value)[0];
  const now = new Date(),
    elapsedMonths =
      year < now.getFullYear()
        ? 12
        : year === now.getFullYear()
          ? now.getMonth() + 1
          : 0;
  const weekdayTotals = Array.from({ length: 7 }, (_, i) =>
    sum(items.filter((e) => new Date(e.timestamp).getDay() === i)),
  );
  const weekdayCount = Array(7).fill(0),
    patternStart =
      view === "year" ? new Date(year, 0, 1) : new Date(month + "-01T00:00"),
    patternEnd =
      view === "year"
        ? new Date(year + 1, 0, 1)
        : new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 1);
  for (
    let d = new Date(patternStart);
    d < patternEnd && d <= now;
    d.setDate(d.getDate() + 1)
  )
    weekdayCount[d.getDay()]++;
  const weekdays = weekdayTotals.map((v, i) => ({
      label: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i],
      value: weekdayCount[i] ? Math.round(v / weekdayCount[i]) : 0,
    })),
    topDay = [...weekdays].sort((a, b) => b.value - a.value)[0];
  const referenceItems =
      view === "month"
        ? previous.items
        : data.expenses.filter(
            (e) => new Date(e.timestamp).getFullYear() === year - 1,
          ),
    reference = totalsBy(referenceItems, "categoryId");
  const growth = categorySlices
    .map((c) => {
      const before = reference.find((p) => p.id === c.id)?.value || 0;
      return { ...c, before, change: c.value - before };
    })
    .filter((c) => c.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 3);
  const biggest =
    view === "month"
      ? stats.biggest
      : [...items].sort((a, b) => b.amount - a.amount)[0];
  return (
    <div className="page-enter">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SEE THE BIGGER PICTURE</span>
          <h1>
            A clearer view<span className="clay">.</span>
          </h1>
          <p>Small details. Useful perspective.</p>
        </div>
        <span className="outline-leaf">
          <Icon name="leaf" size={38} />
        </span>
      </div>
      <div className="insights-toolbar">
        <div className="segmented">
          <button
            onClick={() => setView("month")}
            className={view === "month" ? "active" : ""}
          >
            Month
          </button>
          <button
            onClick={() => setView("year")}
            className={view === "year" ? "active" : ""}
          >
            Year
          </button>
        </div>
        {view === "month" ? (
          <MonthPicker month={month} onChange={setMonth} />
        ) : (
          <div className="month-picker">
            <button
              className="icon-button"
              aria-label="Previous year"
              onClick={() => setYear(year - 1)}
            >
              <Icon name="chevron" className="rotate" size={17} />
            </button>
            <label>
              <input
                className="year-input"
                type="number"
                min="1900"
                max="9999"
                aria-label="Analysis year"
                value={year}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n >= 1900 && n <= 9999) setYear(n);
                }}
              />
            </label>
            <button
              className="icon-button"
              aria-label="Next year"
              onClick={() => setYear(year + 1)}
            >
              <Icon name="chevron" size={17} />
            </button>
          </div>
        )}
      </div>
      <div className="metrics-grid">
        <div className="metric total">
          <span>Total spent</span>
          <strong>{money(total, currency)}</strong>
          <small>{items.length} recorded expenses</small>
        </div>
        <div className="metric">
          <span>{view === "month" ? "Daily average" : "Monthly average"}</span>
          <strong>
            {money(
              view === "month"
                ? stats.average
                : elapsedMonths
                  ? Math.round(total / elapsedMonths)
                  : 0,
              currency,
            )}
          </strong>
          <small>
            {view === "month" ? "Across elapsed days" : "Across elapsed months"}
          </small>
        </div>
        <div className="metric">
          <span>
            {view === "month" ? "Month-end projection" : "Lightest month"}
          </span>
          <strong>
            {view === "month"
              ? money(stats.projected, currency)
              : lightest?.label || "No expenses yet"}
          </strong>
          <small>
            {view === "month"
              ? "Based on your daily pace"
              : lightest
                ? money(lightest.value, currency)
                : "Your story will appear here"}
          </small>
        </div>
        <div className="metric">
          <span>
            {view === "month" ? "Biggest single expense" : "Fullest month"}
          </span>
          <strong>
            {view === "month"
              ? money(biggest?.amount || 0, currency)
              : fullest?.label || "No expenses yet"}
          </strong>
          <small>
            {view === "month"
              ? biggest?.note ||
                data.categories.find((c) => c.id === biggest?.categoryId)
                  ?.name ||
                "A fresh page"
              : fullest
                ? money(fullest.value, currency)
                : "Your story will appear here"}
          </small>
        </div>
      </div>
      <div className="analytics-grid">
        <section className="panel chart-panel category-chart">
          <div className="section-heading">
            <h2>Where it went</h2>
            <span className="eyebrow">BY CATEGORY</span>
          </div>
          <Donut slices={categorySlices} currency={currency} />
          {categorySlices[0] && (
            <div className="chart-note">
              <Icon name="leaf" size={17} />
              <span>
                <strong>{categorySlices[0].label}</strong> is your top category,{" "}
                {Math.round((categorySlices[0].value / total) * 100)}% of
                spending.
              </span>
            </div>
          )}
        </section>
        <section className="panel chart-panel">
          <div className="section-heading">
            <h2>{view === "month" ? "A day at a time" : "Month by month"}</h2>
            <span className="eyebrow">
              {view === "month" ? "DAILY SPENDING" : "SPEND & BUDGET"}
            </span>
          </div>
          <Bars
            key={view + month + year}
            values={view === "month" ? stats.daily : monthly}
            daily={view === "month"}
            budget={view === "year"}
            currency={currency}
          />
          <p className="chart-subtext">
            {view === "month"
              ? "Some days are quiet. Some are a little fuller."
              : "Budgets carry forward from the last amount you set."}
          </p>
        </section>
        <section className="panel chart-panel">
          <div className="section-heading">
            <h2>How you paid</h2>
            <span className="eyebrow">PAYMENT METHODS</span>
          </div>
          <Donut slices={methodSlices} currency={currency} />
        </section>
        {view === "month" ? (
          <section className="panel comparison-panel">
            <div className="section-heading">
              <h2>A little perspective</h2>
              <select
                aria-label="Compare month with"
                value={compare}
                onChange={(e) => setCompare(e.target.value)}
              >
                <option value="previous">Previous month</option>
                <option value="year">Same month last year</option>
              </select>
            </div>
            <div className="comparison-values">
              <div>
                <span>{monthName(month, true)}</span>
                <strong>{money(stats.spent, currency)}</strong>
              </div>
              <div>
                <span>{monthName(compareMonth, true)}</span>
                <strong>{money(previous.spent, currency)}</strong>
              </div>
            </div>
            <div className="compare-track">
              <span
                style={{
                  width: `${Math.max(1, (stats.spent / Math.max(1, stats.spent, previous.spent)) * 100)}%`,
                }}
              />
            </div>
            <div className="compare-track previous">
              <span
                style={{
                  width: `${Math.max(1, (previous.spent / Math.max(1, stats.spent, previous.spent)) * 100)}%`,
                }}
              />
            </div>
            <p className="comparison-text">
              {!stats.items.length && !previous.items.length
                ? "Add a few expenses to compare these months."
                : `${money(Math.abs(delta), currency)} ${delta >= 0 ? "more" : "less"}${previous.spent ? ` (${Math.round((Math.abs(delta) / previous.spent) * 100)}%)` : ""} than ${monthName(compareMonth, true)}.`}
            </p>
            <p className="chart-subtext">
              {month === monthKey()
                ? `Current month includes ${new Date().getDate()} days so far. `
                : ""}
              Comparisons use each month’s recorded total.
            </p>
          </section>
        ) : (
          <section className="panel chart-panel">
            <div className="section-heading">
              <h2>Category rhythms</h2>
              <span className="eyebrow">JAN → DEC</span>
            </div>
            {data.categories
              .filter((c) => yearItems.some((e) => e.categoryId === c.id))
              .map((c) => (
                <div className="trend-row" key={c.id}>
                  <span>
                    <i style={{ background: c.colour }} />
                    {c.name}
                  </span>
                  <Sparkline
                    colour={c.colour}
                    values={months.map((m) =>
                      sum(
                        yearItems.filter(
                          (e) =>
                            e.categoryId === c.id &&
                            monthKey(e.timestamp) === m,
                        ),
                      ),
                    )}
                  />
                  <strong>
                    {money(
                      sum(yearItems.filter((e) => e.categoryId === c.id)),
                      currency,
                    )}
                  </strong>
                </div>
              ))}
            {!items.length && (
              <p className="muted">
                Your categories will find their rhythm here.
              </p>
            )}
          </section>
        )}
        <section className="panel chart-panel pattern-panel">
          <div className="section-heading">
            <h2>Your weekly rhythm</h2>
            <Icon name="calendar" size={19} />
          </div>
          <Bars
            values={
              data.settings.weekStart === 1
                ? [...weekdays.slice(1), weekdays[0]]
                : weekdays
            }
            currency={currency}
          />
          <p className="chart-note">
            {total ? (
              <>
                <Icon name="spark" size={18} />
                <span>
                  <strong>{topDay.label}</strong> has your highest daily average
                  at {money(topDay.value, currency)}.
                </span>
              </>
            ) : (
              "Your everyday patterns will appear as you go."
            )}
          </p>
        </section>
        <section className="panel growth-panel">
          <span className="eyebrow">A FEW THINGS TO NOTICE</span>
          <h2>The little shifts</h2>
          <p className="muted">
            Categories that grew{" "}
            {view === "month"
              ? `from ${monthName(compareMonth, true)}`
              : `from ${year - 1}`}
            .
          </p>
          {growth.length ? (
            growth.map((c) => (
              <div className="growth-row" key={c.id}>
                <span className="growth-dot" style={{ background: c.colour }} />
                <div>
                  <strong>{c.label}</strong>
                  <small>
                    {c.before
                      ? `${Math.round((c.change / c.before) * 100)}% increase`
                      : "New spending this period"}
                  </small>
                </div>
                <strong>+{money(c.change, currency)}</strong>
              </div>
            ))
          ) : (
            <div className="gentle-empty">
              <Icon name="leaf" size={26} />
              <p>No growing categories in this comparison.</p>
            </div>
          )}
        </section>
        {view === "year" && (
          <section className="panel chart-panel heatmap-panel">
            <div className="section-heading">
              <h2>A year in little squares</h2>
              <span className="eyebrow">{year}</span>
            </div>
            <Heatmap
              year={year}
              expenses={yearItems}
              weekStart={data.settings.weekStart}
              currency={currency}
            />
          </section>
        )}
      </div>
    </div>
  );
}
