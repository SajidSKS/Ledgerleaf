import { useMemo, useState } from "react";
import type { Expense, Snapshot } from "../types";
import {
  dayKey,
  dayLabel,
  monthKey,
  monthName,
  shiftMonth,
} from "../lib/dates";
import { sum } from "../lib/analytics";
import { money } from "../lib/money";
import { Icon } from "../components/Icon";
import { ExpenseRow } from "../components/Budget";
export function MonthPicker({
  month,
  onChange,
}: {
  month: string;
  onChange: (m: string) => void;
}) {
  return (
    <div className="month-picker">
      <button
        className="icon-button"
        aria-label="Previous month"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <Icon name="chevron" className="rotate" size={17} />
      </button>
      <label>
        {monthName(month)}
        <Icon name="down" size={13} />
        <input
          type="month"
          value={month}
          aria-label="Choose month"
          onInput={(e) => {
            if (e.currentTarget.value) onChange(e.currentTarget.value);
          }}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
        />
      </label>
      <button
        className="icon-button"
        aria-label="Next month"
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <Icon name="chevron" size={17} />
      </button>
    </div>
  );
}
export function History({
  data,
  onEdit,
  onDelete,
  onExport,
}: {
  data: Snapshot;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
  onExport: () => void;
}) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [method, setMethod] = useState(""),
    [month, setMonth] = useState(monthKey()),
    [scope, setScope] = useState("month"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const rows = useMemo(
    () =>
      data.expenses
        .filter(
          (e) =>
            (scope === "all" ||
              scope === "range" ||
              monthKey(e.timestamp) === month) &&
            (!query || e.note.toLowerCase().includes(query.toLowerCase())) &&
            (!category || e.categoryId === category) &&
            (!method ||
              (method === "unset"
                ? !e.paymentMethodId
                : e.paymentMethodId === method)) &&
            (scope !== "range" ||
              ((!from || dayKey(e.timestamp) >= from) &&
                (!to || dayKey(e.timestamp) <= to))),
        )
        .sort((a, b) => b.timestamp - a.timestamp),
    [data.expenses, query, category, method, month, scope, from, to],
  );
  const groups = new Map<string, Expense[]>();
  rows.forEach((e) => {
    const k = dayKey(e.timestamp);
    groups.set(k, [...(groups.get(k) || []), e]);
  });
  return (
    <div className="page-enter">
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE EVERYDAY DETAILS</span>
          <h1>
            Your history<span className="clay">.</span>
          </h1>
          <p>Every little thing, all in one place.</p>
        </div>
        <button className="button secondary small" onClick={onExport}>
          <Icon name="download" size={17} />
          Export
        </button>
      </div>
      <div className="panel history-panel">
        <div className="history-toolbar">
          <div className="segmented">
            <button
              className={scope === "month" ? "active" : ""}
              onClick={() => setScope("month")}
            >
              Month
            </button>
            <button
              className={scope === "all" ? "active" : ""}
              onClick={() => setScope("all")}
            >
              All time
            </button>
            <button
              className={scope === "range" ? "active" : ""}
              onClick={() => setScope("range")}
            >
              Custom
            </button>
          </div>
          {scope === "month" && (
            <MonthPicker month={month} onChange={setMonth} />
          )}
        </div>
        <div className="history-filters">
          <label className="search-field">
            <Icon name="search" size={18} />
            <input
              aria-label="Search notes"
              placeholder="Find a little detail…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.archived ? " (archived)" : ""}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by payment method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="">All payments</option>
            <option value="unset">Not specified</option>
            {data.paymentMethods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.archived ? " (archived)" : ""}
              </option>
            ))}
          </select>
        </div>
        {scope === "range" && (
          <div className="date-range">
            <label className="field">
              <span>From</span>
              <input
                type="date"
                value={from}
                onInput={(e) => setFrom(e.currentTarget.value)}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Through</span>
              <input
                type="date"
                value={to}
                min={from}
                onInput={(e) => setTo(e.currentTarget.value)}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
        )}
        <div className="history-summary">
          <span>
            {rows.length} {rows.length === 1 ? "expense" : "expenses"}
          </span>
          <strong>{money(sum(rows), data.settings.currency)}</strong>
        </div>
        {groups.size ? (
          [...groups].map(([day, items]) => (
            <section className="history-day" key={day}>
              <div className="day-heading">
                <h3>{dayLabel(day)}</h3>
                <span>{money(sum(items), data.settings.currency)}</span>
              </div>
              {items.map((e) => (
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  data={data}
                  onEdit={() => onEdit(e)}
                  onDelete={() => onDelete(e)}
                />
              ))}
            </section>
          ))
        ) : (
          <div className="empty-state">
            <span className="empty-icon">
              <Icon name="book" size={32} />
            </span>
            <h3>
              {data.expenses.length ? "No matching moments." : "A fresh page."}
            </h3>
            <p>
              {data.expenses.length
                ? "Try another date, category, or note."
                : "Your first expense is the start of your story."}
            </p>
          </div>
        )}
        <p className="history-hint">
          Tap to edit. Swipe left to delete. Your history stays across every
          month.
        </p>
      </div>
    </div>
  );
}
