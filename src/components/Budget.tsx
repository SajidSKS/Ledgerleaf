import { useState, useEffect } from "react";
import type { Snapshot, Budget as BudgetType, Expense } from "../types";
import { budgetFor, sum } from "../lib/analytics";
import { monthKey, monthName, daysInMonth } from "../lib/dates";
import { money, plain, toMinor } from "../lib/money";
import { Icon } from "./Icon";

export function Count({
  value,
  currency,
  className = "",
}: {
  value: number;
  currency: string;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let frame: number;
    const from = shown,
      start = performance.now();
    function tick(now: number) {
      const p = Math.min(1, (now - start) / 480);
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className={className}>{money(shown, currency)}</span>;
}
export function BudgetCard({
  data,
  onEdit,
}: {
  data: Snapshot;
  onEdit: () => void;
}) {
  const month = monthKey(),
    budget = budgetFor(data.budgets, month),
    spent = sum(data.expenses.filter((e) => monthKey(e.timestamp) === month)),
    left = budget.total - spent,
    ratio = budget.total ? spent / budget.total : 0,
    days = daysInMonth(month) - new Date().getDate() + 1;
  return (
    <div
      className={`budget-card ${ratio >= 1 ? "over" : ratio >= 0.8 ? "near" : ""}`}
    >
      <div className="section-heading">
        <span className="eyebrow">YOUR MONTH, AT A GLANCE</span>
        <button
          className="icon-button"
          aria-label="Edit monthly budget"
          onClick={onEdit}
        >
          <Icon name="edit" size={17} />
        </button>
      </div>
      <div className="budget-month">
        <span>{monthName(month)}</span>
        <span className="month-dot" />
      </div>
      <p className="budget-label">
        {budget.total ? "Left to spend" : "Your monthly budget"}
      </p>
      <Count
        value={budget.total ? left : 0}
        currency={data.settings.currency}
        className="budget-remaining"
      />
      <div
        className="budget-progress"
        role="progressbar"
        aria-label="Budget spent"
        aria-valuenow={Math.min(100, Math.round(ratio * 100))}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      </div>
      <div className="budget-breakdown">
        <div>
          <span>Spent so far</span>
          <strong>{money(spent, data.settings.currency)}</strong>
        </div>
        <div>
          <span>Monthly budget</span>
          <button onClick={onEdit}>
            {budget.total
              ? money(budget.total, data.settings.currency)
              : "Set a budget"}
            <Icon name="edit" size={12} />
          </button>
        </div>
      </div>
      <div className="safe-spend">
        <span className="safe-icon">
          <Icon name="leaf" size={24} />
        </span>
        <div>
          <span>A comfortable daily pace</span>
          <strong>
            {budget.total
              ? money(Math.floor(left / days), data.settings.currency)
              : "Make a little room"}
          </strong>
          <small>
            {budget.total
              ? `per day · ${days} days left this month`
              : "Set your budget to find your daily pace"}
          </small>
        </div>
      </div>
      <svg
        className="budget-botanical"
        viewBox="0 0 160 200"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M40 210c30-65 34-112 59-174M72 127c-43-1-56-28-53-53 28 3 54 17 53 53Zm10-34c37 5 58-13 64-41-32-1-51 14-64 41ZM91 68C65 49 65 26 78 10c21 14 28 34 13 58Zm-32 91c34 13 61 3 75-22-30-9-53-1-75 22Z"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    </div>
  );
}
export function BudgetEditor({
  data,
  month,
  onSave,
}: {
  data: Snapshot;
  month: string;
  onSave: (b: BudgetType) => Promise<void>;
}) {
  const [period, setPeriod] = useState(month),
    initial = budgetFor(data.budgets, period),
    [total, setTotal] = useState(plain(initial.total)),
    [limits, setLimits] = useState<Record<string, string>>(
      Object.fromEntries(
        Object.entries(initial.limits).map(([id, v]) => [id, plain(v)]),
      ),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  function changePeriod(m: string) {
    setPeriod(m);
    const b = budgetFor(data.budgets, m);
    setTotal(plain(b.total));
    setLimits(
      Object.fromEntries(
        Object.entries(b.limits).map(([id, v]) => [id, plain(v)]),
      ),
    );
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const b = {
            month: period,
            total: toMinor(total),
            limits: Object.fromEntries(
              Object.entries(limits)
                .filter(([, v]) => v.trim())
                .map(([id, v]) => [id, toMinor(v)]),
            ),
          };
          await onSave(b);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not save budget.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="muted">
        A plan for your month. It carries forward until you change it. Your
        expense history always stays.
      </p>
      <label className="field">
        <span>Month</span>
        <input
          type="month"
          value={period}
          required
          onInput={(e) => {
            if (e.currentTarget.value) changePeriod(e.currentTarget.value);
          }}
          onChange={(e) => {
            if (e.target.value) changePeriod(e.target.value);
          }}
        />
      </label>
      <label className="field">
        <span>Monthly budget ({data.settings.currency})</span>
        <input
          inputMode="decimal"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          required
        />
      </label>
      <div className="section-heading limits-title">
        <h3>Category limits</h3>
        <small className="muted">Optional</small>
      </div>
      {data.categories
        .filter((c) => !c.archived || limits[c.id])
        .map((c) => (
          <label className="limit-field" key={c.id}>
            <span>
              <Icon name={c.icon} size={18} />
              {c.name}
            </span>
            <input
              inputMode="decimal"
              aria-label={`${c.name} limit`}
              placeholder="No limit"
              value={limits[c.id] || ""}
              onChange={(e) => setLimits({ ...limits, [c.id]: e.target.value })}
            />
          </label>
        ))}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary full" disabled={busy}>
        {busy ? "Saving…" : "Save budget"}
        <Icon name="check" />
      </button>
    </form>
  );
}
export function ExpenseRow({
  expense,
  data,
  onEdit,
  onDelete,
  compact = false,
}: {
  expense: Expense;
  data: Snapshot;
  onEdit: () => void;
  onDelete?: () => void;
  compact?: boolean;
}) {
  const category = data.categories.find((c) => c.id === expense.categoryId),
    method = data.paymentMethods.find((m) => m.id === expense.paymentMethodId),
    [start, setStart] = useState<{ x: number; y: number } | null>(null),
    [drag, setDrag] = useState(0);
  return (
    <div className={`expense-row-wrap ${drag < -35 ? "swiping" : ""}`}>
      <div className="swipe-backdrop" aria-hidden="true">
        <Icon name="trash" />
        Release to delete
      </div>
      <div
        className={`expense-row ${compact ? "compact" : ""}`}
        style={{ transform: `translateX(${drag}px)` }}
        onTouchStart={(e) => {
          if (onDelete)
            setStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        }}
        onTouchMove={(e) => {
          if (!start) return;
          const dx = e.touches[0].clientX - start.x,
            dy = e.touches[0].clientY - start.y;
          if (Math.abs(dy) > 35) {
            setStart(null);
            setDrag(0);
          } else if (Math.abs(dx) > Math.abs(dy) && dx < 0)
            setDrag(Math.max(-140, dx));
        }}
        onTouchEnd={() => {
          if (drag < -95) onDelete?.();
          setDrag(0);
          setStart(null);
        }}
      >
        <button className="expense-main" onClick={onEdit}>
          <span
            className="category-icon"
            style={
              {
                "--chip-colour": category?.colour || "#84956d",
              } as React.CSSProperties
            }
          >
            <Icon name={category?.icon || "tag"} size={21} />
          </span>
          <span className="expense-text">
            <strong>{expense.note || category?.name || "Expense"}</strong>
            <span>
              {category?.name}
              {!compact && (
                <>
                  {" "}
                  ·{" "}
                  {new Date(expense.timestamp).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              )}
              {method && <small className="method-badge">{method.name}</small>}
            </span>
          </span>
          <span className="expense-amount">
            {money(expense.amount, data.settings.currency)}
          </span>
        </button>
        {onDelete && (
          <button
            className="row-delete icon-button"
            onClick={onDelete}
            aria-label={`Delete ${expense.note || category?.name}`}
          >
            <Icon name="trash" size={17} />
          </button>
        )}
      </div>
    </div>
  );
}
