import { useEffect, useRef, useState } from "react";
import type { Category, Expense, PaymentMethod, Snapshot } from "../types";
import { Icon } from "./Icon";
import { localInput, dayKey } from "../lib/dates";
import { plain, symbol, toMinor } from "../lib/money";

const categoryOrder = [
  "food",
  "transport",
  "shopping",
  "groceries",
  "bills",
  "leisure",
];
const methodOrder = ["upi", "cash", "card"];
function rank(order: string[], id: string) {
  const index = order.indexOf(id);
  return index < 0 ? order.length : index;
}
function entryCategories(data: Snapshot, selected?: string) {
  const uses = new Map<string, number>();
  for (const e of data.expenses)
    uses.set(e.categoryId, (uses.get(e.categoryId) || 0) + 1);
  return data.categories
    .filter((c) => !c.archived || c.id === selected)
    .sort(
      (a, b) =>
        (uses.get(b.id) || 0) - (uses.get(a.id) || 0) ||
        rank(categoryOrder, a.id) - rank(categoryOrder, b.id),
    );
}

const iconChoices = [
  "utensils",
  "coffee",
  "bus",
  "bag",
  "basket",
  "bolt",
  "spark",
  "heart",
  "home",
  "book",
  "tag",
  "phone",
  "card",
  "cash",
];
const colours = [
  "#b87755",
  "#748c89",
  "#aa8b69",
  "#84956d",
  "#a79986",
  "#c29685",
  "#557260",
  "#99795c",
];
export function ItemCreator({
  type,
  items,
  onSave,
  onClose,
}: {
  type: "category" | "method";
  items: { name: string }[];
  onSave: (v: Category | PaymentMethod) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(""),
    [icon, setIcon] = useState(type === "category" ? "tag" : "card"),
    [colour, setColour] = useState(colours[0]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="inline-creator"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (
          items.some((v) => v.name.toLowerCase() === name.trim().toLowerCase())
        ) {
          setError("That name already exists.");
          return;
        }
        setBusy(true);
        try {
          await onSave({
            id: crypto.randomUUID(),
            name: name.trim(),
            icon,
            archived: false,
            ...(type === "category" ? { colour } : {}),
          });
          onClose();
        } catch (e) {
          setError(String(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="section-heading">
        <strong>
          New {type === "category" ? "category" : "payment method"}
        </strong>
        <button
          type="button"
          className="icon-button"
          aria-label="Cancel"
          onClick={onClose}
        >
          <Icon name="close" size={17} />
        </button>
      </div>
      <label className="field">
        <span>Name</span>
        <input
          autoFocus
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === "category" ? "e.g. Education" : "e.g. Wallet"}
          required
        />
      </label>
      <span className="field-label">Choose an icon</span>
      <div className="icon-choices">
        {iconChoices.map((v) => (
          <button
            type="button"
            key={v}
            className={icon === v ? "selected" : ""}
            onClick={() => setIcon(v)}
            aria-label={v}
            aria-pressed={icon === v}
          >
            <Icon name={v} />
          </button>
        ))}
      </div>
      {type === "category" && (
        <>
          <span className="field-label">Colour</span>
          <div className="colour-choices">
            {colours.map((c) => (
              <button
                type="button"
                aria-label={c}
                aria-pressed={colour === c}
                style={{ background: c }}
                key={c}
                onClick={() => setColour(c)}
              >
                {colour === c && <Icon name="check" size={17} />}
              </button>
            ))}
            <input
              type="color"
              value={colour}
              onChange={(e) => setColour(e.target.value)}
              aria-label="Custom colour"
            />
          </div>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary small" disabled={busy}>
        Create {type === "category" ? "category" : "method"}
        <Icon name="check" size={17} />
      </button>
    </form>
  );
}

export function Entry({
  data,
  onSave,
  onCategory,
  onMethod,
  existing,
  onDelete,
}: {
  data: Snapshot;
  onSave: (expense: Expense) => Promise<void>;
  onCategory: (c: Category) => Promise<void>;
  onMethod: (m: PaymentMethod) => Promise<void>;
  existing?: Expense;
  onDelete?: () => void;
}) {
  const [amount, setAmount] = useState(existing ? plain(existing.amount) : "0"),
    [category, setCategory] = useState(
      existing?.categoryId || entryCategories(data)[0]?.id || "",
    ),
    [method, setMethod] = useState<string | null>(
      existing?.paymentMethodId || null,
    ),
    [note, setNote] = useState(existing?.note || ""),
    [timestamp, setTimestamp] = useState(existing?.timestamp || Date.now()),
    [customDate, setCustomDate] = useState(!!existing),
    [dateOpen, setDateOpen] = useState(false),
    [create, setCreate] = useState<"category" | "method" | null>(null),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState("");
  const amountRef = useRef<HTMLDivElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const cats = entryCategories(data, category);
  function press(key: string) {
    setError("");
    setSaved(false);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      navigator.vibrate?.(8);
    setAmount((prev) => {
      if (key === "back") return prev.length === 1 ? "0" : prev.slice(0, -1);
      if (key === ".") return prev.includes(".") ? prev : prev + ".";
      if (prev.includes(".") && prev.split(".")[1].length >= 2) return prev;
      if (prev.replace(".", "").length >= 10) return prev;
      return prev === "0" ? key : prev + key;
    });
  }
  async function save() {
    if (busy) return;
    setError("");
    try {
      const minor = toMinor(amount);
      if (!minor) throw new Error("Add an amount first.");
      if (!category) throw new Error("Choose a category.");
      if (!Number.isFinite(timestamp))
        throw new Error("Choose a valid date and time.");
      setBusy(true);
      const now = Date.now();
      await onSave({
        id: existing?.id || crypto.randomUUID(),
        amount: minor,
        categoryId: category,
        paymentMethodId: method,
        note: note.trim(),
        timestamp: customDate ? timestamp : now,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      });
      if (!existing) {
        setAmount("0");
        setNote("");
        setMethod(null);
        setTimestamp(Date.now());
        setCustomDate(false);
        setDateOpen(false);
        setSaved(true);
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
          navigator.vibrate?.([12, 35, 18]);
        timer.current = setTimeout(() => setSaved(false), 1800);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this expense.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`entry-panel ${existing ? "editing" : ""}`}>
      <div className="entry-top">
        <span className="eyebrow">
          {existing ? "EDIT EXPENSE" : "A MOMENT. A LITTLE MORE CLARITY."}
        </span>
        <span className="entry-corner">
          <Icon name="leaf" size={20} />
        </span>
      </div>
      <div
        className={`amount-display ${saved ? "saved" : ""}`}
        ref={amountRef}
        tabIndex={0}
        role="group"
        aria-label="Expense amount. Use the keypad or number keys."
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (/^[0-9.]$/.test(e.key)) {
            e.preventDefault();
            press(e.key);
          } else if (e.key === "Backspace") {
            e.preventDefault();
            press("back");
          } else if (e.key === "Enter") {
            e.preventDefault();
            void save();
          }
        }}
      >
        <span className="currency">{symbol(data.settings.currency)}</span>
        <span
          className={amount.length > 8 ? "long-number" : ""}
          aria-live="polite"
        >
          {new Intl.NumberFormat(
            data.settings.currency === "INR" ? "en-IN" : "en-US",
            { maximumFractionDigits: 0 },
          ).format(Number(amount.split(".")[0]))}
          {amount.includes(".") ? "." + amount.split(".")[1] : ""}
        </span>
        <span className="amount-cursor" />
      </div>
      <div className="amount-caption">
        {saved ? (
          <span className="saved-caption">
            <Icon name="check" size={15} /> A little more in the picture.
          </span>
        ) : (
          "What did you spend?"
        )}
      </div>
      <div className="keypad" aria-label="Amount keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"].map(
          (k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              aria-label={
                k === "back" ? "Backspace" : k === "." ? "Decimal point" : k
              }
            >
              {k === "back" ? <Icon name="backspace" size={24} /> : k}
            </button>
          ),
        )}
      </div>
      <div className="entry-fields">
        <div className="field-heading">
          <label id="category-label">Category</label>
          <small>{cats.length ? "Pick what fits" : ""}</small>
        </div>
        <div
          className="chips category-chips"
          role="group"
          aria-labelledby="category-label"
        >
          {cats.map((c) => (
            <button
              key={c.id}
              className={`chip ${category === c.id ? "active" : ""}`}
              style={{ "--chip-colour": c.colour } as React.CSSProperties}
              onClick={() => setCategory(c.id)}
              aria-pressed={category === c.id}
            >
              <Icon name={c.icon} size={17} />
              {c.name}
            </button>
          ))}
          <button
            className="chip add-chip"
            onClick={() => setCreate(create === "category" ? null : "category")}
            aria-label="Create category"
          >
            <Icon name="plus" size={19} />
          </button>
        </div>
        {create === "category" && (
          <ItemCreator
            type="category"
            items={data.categories}
            onClose={() => setCreate(null)}
            onSave={async (c) => {
              await onCategory(c as Category);
              setCategory(c.id);
            }}
          />
        )}
        <div className="field-heading payment-heading">
          <label id="payment-label">Paid with</label>
          <small>Optional</small>
        </div>
        <div
          className="chips method-chips"
          role="group"
          aria-labelledby="payment-label"
        >
          {[...data.paymentMethods]
            .sort((a, b) => rank(methodOrder, a.id) - rank(methodOrder, b.id))
            .filter((m) => !m.archived || m.id === method)
            .map((m) => (
              <button
                key={m.id}
                className={`chip ${method === m.id ? "active" : ""}`}
                onClick={() => setMethod(method === m.id ? null : m.id)}
                aria-pressed={method === m.id}
              >
                <Icon name={m.icon} size={16} />
                {m.name}
              </button>
            ))}
          <button
            className="chip add-chip"
            onClick={() => setCreate(create === "method" ? null : "method")}
            aria-label="Create payment method"
          >
            <Icon name="plus" size={19} />
          </button>
        </div>
        {create === "method" && (
          <ItemCreator
            type="method"
            items={data.paymentMethods}
            onClose={() => setCreate(null)}
            onSave={async (m) => {
              await onMethod(m);
              setMethod(m.id);
            }}
          />
        )}
        <label className="note-field">
          <Icon name="edit" size={17} />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="A little note, if you like…"
            maxLength={2000}
            aria-label="Optional note"
          />
        </label>
        <div className="entry-date-row">
          <button
            className="date-button"
            onClick={() => setDateOpen(!dateOpen)}
          >
            <Icon name="calendar" size={17} />
            {!customDate
              ? "Today, now"
              : `${dayKey(timestamp) === dayKey(new Date()) ? "Today" : new Date(timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: new Date(timestamp).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined })}, ${new Date(timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
            <Icon name="down" size={13} />
          </button>
          {existing && onDelete && (
            <button className="text-button danger" onClick={onDelete}>
              <Icon name="trash" size={16} />
              Delete
            </button>
          )}
        </div>
        {dateOpen && (
          <label className="field date-picker">
            <span>Date & time</span>
            <input
              type="datetime-local"
              aria-label="Date & time"
              required
              value={localInput(timestamp)}
              onInput={(e) => {
                if (e.currentTarget.value) {
                  setTimestamp(new Date(e.currentTarget.value).getTime());
                  setCustomDate(true);
                }
              }}
              onBlur={(e) => {
                if (e.currentTarget.value && e.currentTarget.value !== localInput(timestamp)) {
                  setTimestamp(new Date(e.currentTarget.value).getTime());
                  setCustomDate(true);
                }
              }}
              onChange={(e) => {
                if (e.target.value) {
                  setTimestamp(new Date(e.target.value).getTime());
                  setCustomDate(true);
                }
              }}
            />
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setCustomDate(false);
                setTimestamp(Date.now());
                setDateOpen(false);
              }}
            >
              Use now
            </button>
          </label>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button
          className={`button primary save-button ${saved ? "success" : ""}`}
          onClick={save}
          disabled={busy}
        >
          {saved ? (
            <>
              <Icon name="check" />
              Expense saved
            </>
          ) : busy ? (
            "Saving…"
          ) : (
            <>
              {existing ? "Save changes" : "Save expense"}
              <Icon name="arrow" />
            </>
          )}
        </button>
        <p className="entry-footnote">
          <Icon name="lock" size={12} />
          Just for you. Saved on this device.
        </p>
      </div>
    </div>
  );
}
