import { useState } from "react";
import { money } from "../lib/money";
import { dayKey } from "../lib/dates";
import { sum } from "../lib/analytics";
import type { Expense } from "../types";

export interface Slice {
  id: string;
  label: string;
  value: number;
  colour: string;
}
export function Donut({
  slices,
  currency,
  center = "TOTAL SPENT",
}: {
  slices: Slice[];
  currency: string;
  center?: string;
}) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  let start = 0;
  return (
    <div className="donut-layout">
      <div className="donut">
        <svg
          viewBox="0 0 200 200"
          role="img"
          aria-label={`Spending breakdown, ${money(total, currency)}`}
        >
          <circle
            cx="100"
            cy="100"
            r="78"
            fill="none"
            stroke="var(--line)"
            strokeWidth="24"
          />
          {slices.map((s) => {
            const length = total ? (s.value / total) * 490.09 : 0,
              offset = start;
            start += length;
            return (
              <circle
                key={s.id}
                cx="100"
                cy="100"
                r="78"
                fill="none"
                stroke={s.colour}
                strokeWidth="24"
                strokeDasharray={`${Math.max(length - (length > 5 ? 3 : 0), 0)} ${490.09 - Math.max(length - (length > 5 ? 3 : 0), 0)}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 100 100)"
              >
                <title>
                  {s.label}: {money(s.value, currency)}
                </title>
              </circle>
            );
          })}
        </svg>
        <div className="donut-center">
          <span>{center}</span>
          <strong>{money(total, currency)}</strong>
        </div>
      </div>
      <div className="legend">
        {slices.length ? (
          slices.map((s) => (
            <div key={s.id}>
              <span className="legend-label">
                <i style={{ background: s.colour }} />
                {s.label}
              </span>
              <span>
                <strong>{money(s.value, currency)}</strong>
                <small>{Math.round((s.value / total) * 100)}%</small>
              </span>
            </div>
          ))
        ) : (
          <p className="muted">Your first expense starts the picture.</p>
        )}
      </div>
    </div>
  );
}
export function Bars({
  values,
  currency,
  budget = false,
  daily = false,
}: {
  values: { label: string; value: number; budget?: number }[];
  currency: string;
  budget?: boolean;
  daily?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(
      100,
      ...values.map((v) => Math.max(v.value, v.budget || 0)),
    ),
    w = 600,
    h = 175,
    gap = w / values.length,
    barW = Math.min(27, gap * (budget ? 0.36 : 0.55));
  return (
    <div className="bar-chart">
      <div className="chart-caption">
        <span>
          {selected === null
            ? "Tap a bar to explore"
            : `${daily ? "Day " : ""}${values[selected].label}`}
        </span>
        <strong>
          {selected === null
            ? money(max, currency)
            : money(values[selected].value, currency)}
          {selected !== null && budget
            ? ` / ${money(values[selected].budget || 0, currency)}`
            : ""}
        </strong>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h + 30}`}
        role="img"
        aria-label={budget ? "Monthly spending and budget" : "Daily spending"}
      >
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1="0"
            x2={w}
            y1={h - f * h}
            y2={h - f * h}
            stroke="var(--line)"
            strokeDasharray={f ? "3 5" : undefined}
          />
        ))}
        {values.map((v, i) => (
          <g
            key={i}
            tabIndex={0}
            role="button"
            aria-label={`${v.label}, spent ${money(v.value, currency)}${budget ? `, budget ${money(v.budget || 0, currency)}` : ""}`}
            onFocus={() => setSelected(i)}
            onClick={() => setSelected(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setSelected(i);
            }}
          >
            <rect
              x={i * gap}
              y="0"
              width={gap}
              height={h + 24}
              fill="transparent"
            />
            {budget && (
              <rect
                x={i * gap + (gap - barW * 2 - 3) / 2 + barW + 3}
                y={h - ((v.budget || 0) / max) * h}
                width={barW}
                height={((v.budget || 0) / max) * h}
                rx="3"
                fill="var(--sand)"
              />
            )}
            <rect
              x={
                i * gap + (gap - barW * (budget ? 2 : 1) - (budget ? 3 : 0)) / 2
              }
              y={h - (v.value / max) * h}
              width={barW}
              height={Math.max((v.value / max) * h, v.value ? 2 : 0)}
              rx="3"
              fill={selected === i ? "var(--clay)" : "var(--green)"}
              className="animated-bar"
            >
              <title>
                {v.label}: {money(v.value, currency)}
              </title>
            </rect>
            {(!daily ||
              i === 0 ||
              i === values.length - 1 ||
              (i + 1) % 5 === 0) && (
              <text
                x={i * gap + gap / 2}
                y={h + 23}
                textAnchor="middle"
                fill="var(--muted)"
                fontSize="12"
              >
                {v.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      {budget && (
        <div className="chart-key">
          <span>
            <i style={{ background: "var(--green)" }} />
            Spent
          </span>
          <span>
            <i style={{ background: "var(--sand)" }} />
            Budget
          </span>
        </div>
      )}
    </div>
  );
}
export function Sparkline({
  values,
  colour,
}: {
  values: number[];
  colour: string;
}) {
  const max = Math.max(1, ...values),
    points = values
      .map(
        (v, i) =>
          `${(i * 110) / Math.max(values.length - 1, 1)},${30 - (v / max) * 26}`,
      )
      .join(" ");
  return (
    <svg
      viewBox="0 0 112 34"
      width="112"
      height="34"
      role="img"
      aria-label={`Monthly amounts: ${values.map((v) => (v / 100).toFixed(2)).join(", ")}`}
    >
      <polyline
        fill="none"
        stroke={colour}
        strokeWidth="2"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
export function Heatmap({
  year,
  expenses,
  weekStart,
  currency,
}: {
  year: number;
  expenses: Expense[];
  weekStart: 0 | 1;
  currency: string;
}) {
  const [active, setActive] = useState("");
  const start = new Date(year, 0, 1),
    offset = (start.getDay() - weekStart + 7) % 7,
    count = Math.round(
      (new Date(year + 1, 0, 1).getTime() - start.getTime()) / 86400000,
    );
  const daily = new Map<string, number>();
  for (const e of expenses) {
    const k = dayKey(e.timestamp);
    daily.set(k, (daily.get(k) || 0) + e.amount);
  }
  const max = Math.max(1, ...daily.values());
  return (
    <>
      <div className="heatmap-scroll">
        <svg
          viewBox="0 0 724 124"
          width="724"
          height="124"
          role="img"
          aria-label={`Daily spending calendar for ${year}`}
        >
          {Array.from({ length: 12 }, (_, m) => {
            const d = new Date(year, m, 1),
              idx =
                Math.round((d.getTime() - start.getTime()) / 86400000) + offset;
            return (
              <text
                key={m}
                x={28 + Math.floor(idx / 7) * 13}
                y="13"
                fontSize="10"
                fill="var(--muted)"
              >
                {d.toLocaleDateString("en", { month: "short" })}
              </text>
            );
          })}
          {Array.from({ length: 7 }, (_, r) => (
            <text
              key={r}
              x="0"
              y={34 + r * 13}
              fontSize="9"
              fill="var(--muted)"
            >
              {["S", "M", "T", "W", "T", "F", "S"][(r + weekStart) % 7]}
            </text>
          ))}
          {Array.from({ length: count }, (_, i) => {
            const d = new Date(year, 0, i + 1),
              key = dayKey(d),
              v = daily.get(key) || 0;
            return (
              <rect
                key={i}
                tabIndex={0}
                role="button"
                aria-label={`${key}: ${money(v, currency)}`}
                onFocus={() => setActive(key)}
                onClick={() => setActive(key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setActive(key);
                }}
                x={28 + Math.floor((i + offset) / 7) * 13}
                y={24 + ((i + offset) % 7) * 13}
                width="10"
                height="10"
                rx="2"
                fill={v ? "var(--green)" : "var(--line)"}
                opacity={v ? 0.25 + (v / max) * 0.75 : 1}
              >
                <title>
                  {key}: {money(v, currency)}
                </title>
              </rect>
            );
          })}
        </svg>
      </div>
      <div className="chart-caption">
        <span>
          {active
            ? `${active}: ${money(daily.get(active) || 0, currency)}`
            : "A year of everyday moments. Tap a day."}
        </span>
        <span>
          Less <i className="heat-swatch" /> More
        </span>
      </div>
    </>
  );
}
