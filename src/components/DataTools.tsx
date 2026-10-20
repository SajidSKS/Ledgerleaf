import { useState } from "react";
import type { Snapshot, Backup, Expense } from "../types";
import { monthKey, dayKey } from "../lib/dates";
import { exportCSV, importCSV } from "../lib/csv";
import { exportFile } from "../lib/files";
import { makeBackup, validateBackup } from "../lib/backup";
import { money } from "../lib/money";
import { sum } from "../lib/analytics";
import { Icon } from "./Icon";
export async function backupFile(data: Snapshot) {
  const b = makeBackup(data);
  await exportFile(
    `Ledgerleaf-backup-${dayKey(new Date())}.json`,
    JSON.stringify(b, null, 2),
    "application/json;charset=utf-8",
  );
}
export function ExportDialog({
  data,
  onClose,
  notify,
}: {
  data: Snapshot;
  onClose: () => void;
  notify: (v: string) => void;
}) {
  const [scope, setScope] = useState("month"),
    [from, setFrom] = useState(monthKey() + "-01"),
    [to, setTo] = useState(dayKey(new Date())),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const rows = data.expenses.filter(
    (e) =>
      scope === "all" ||
      (scope === "month" && monthKey(e.timestamp) === monthKey()) ||
      (scope === "year" &&
        new Date(e.timestamp).getFullYear() === new Date().getFullYear()) ||
      (scope === "custom" &&
        dayKey(e.timestamp) >= from &&
        dayKey(e.timestamp) <= to),
  );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (scope === "custom" && (!from || !to || from > to)) {
          setError("Choose a valid date range.");
          return;
        }
        setBusy(true);
        try {
          await exportFile(
            `Ledgerleaf-${scope}-${dayKey(new Date())}.csv`,
            exportCSV(data, rows),
            "text/csv;charset=utf-8",
          );
          notify(`${rows.length} expenses exported.`);
          onClose();
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Export could not complete.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="muted">
        A tidy CSV for Excel, Sheets, or wherever you keep your records.
      </p>
      <label className="field">
        <span>Choose a period</span>
        <select value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="month">This month</option>
          <option value="year">This year</option>
          <option value="all">All time</option>
          <option value="custom">Custom range</option>
        </select>
      </label>
      {scope === "custom" && (
        <div className="date-range">
          <label className="field">
            <span>From</span>
            <input
              type="date"
              value={from}
              required
              onInput={(e) => setFrom(e.currentTarget.value)}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Through</span>
            <input
              type="date"
              min={from}
              value={to}
              required
              onInput={(e) => setTo(e.currentTarget.value)}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
      )}
      <div className="export-summary">
        <Icon name="book" size={26} />
        <div>
          <strong>{rows.length} expenses</strong>
          <span>{money(sum(rows), data.settings.currency)} in total</span>
        </div>
      </div>
      <p className="chart-subtext">
        Date, Time, Amount, Category, Payment Method, Note. UTF-8 with BOM.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary full" disabled={busy}>
        {busy ? "Exporting…" : "Export CSV"}
        <Icon name="download" size={18} />
      </button>
    </form>
  );
}
export function ImportDialog({
  data,
  onRestore,
  onMerge,
  onBackup,
}: {
  data: Snapshot;
  onRestore: (b: Backup) => Promise<void>;
  onMerge: (
    data: Pick<Snapshot, "expenses" | "categories" | "paymentMethods">,
  ) => Promise<void>;
  onBackup: () => Promise<void>;
}) {
  const [file, setFile] = useState(""),
    [backup, setBackup] = useState<Backup | null>(null),
    [csv, setCSV] = useState<Pick<
      Snapshot,
      "expenses" | "categories" | "paymentMethods"
    > | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  async function read(file: File) {
    setError("");
    setBackup(null);
    setCSV(null);
    setConfirmed(false);
    setFile(file.name);
    try {
      if (file.size > 50 * 1024 * 1024)
        throw new Error("Choose a file under 50 MB.");
      const text = await file.text();
      if (file.name.toLowerCase().endsWith(".json"))
        setBackup(validateBackup(text));
      else setCSV(importCSV(text, data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this file.");
    }
  }
  return (
    <div>
      <p className="muted">
        Restore a full Ledgerleaf JSON backup, or bring in a CSV. Files stay on
        this device.
      </p>
      <label className="file-drop">
        <Icon name="upload" size={28} />
        <strong>{file || "Choose a JSON or CSV file"}</strong>
        <span>Tap to browse · up to 50 MB</span>
        <input
          type="file"
          accept=".json,.csv,application/json,text/csv"
          onChange={(e) => {
            if (e.target.files?.[0]) void read(e.target.files[0]);
          }}
        />
      </label>
      {backup && (
        <>
          <div className="export-summary">
            <Icon name="book" size={25} />
            <div>
              <strong>
                {backup.expenses.length} expenses · {backup.budgets.length}{" "}
                budgets
              </strong>
              <span>
                {backup.categories.length} categories ·{" "}
                {backup.paymentMethods.length} payment methods
              </span>
            </div>
          </div>
          <p>
            Restoring replaces the current ledger, budgets, and preferences with
            this backup.
          </p>
          <button
            className="button secondary full"
            onClick={async () => {
              try {
                await onBackup();
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            <Icon name="download" size={17} />
            Back up my current ledger first
          </button>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Replace my current ledger with this backup
          </label>
        </>
      )}
      {csv && (
        <>
          <div className="export-summary">
            <Icon name="book" size={25} />
            <div>
              <strong>{csv.expenses.length} valid expense rows</strong>
              <span>
                {money(sum(csv.expenses), data.settings.currency)} to review for
                import
              </span>
            </div>
          </div>
          <p className="muted">
            CSV expenses are added to your ledger. Matching date, time, amount,
            category, payment, and note rows are skipped. Existing budgets stay.
          </p>
          <div className="import-preview">
            {csv.expenses.slice(0, 3).map((e) => (
              <div key={e.id}>
                <span>
                  {dayKey(e.timestamp)} ·{" "}
                  {csv.categories.find((c) => c.id === e.categoryId)?.name}
                </span>
                <strong>{money(e.amount, data.settings.currency)}</strong>
              </div>
            ))}
          </div>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {(backup || csv) && (
        <button
          className="button primary full"
          disabled={busy || (!!backup && !confirmed)}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              if (backup) await onRestore(backup);
              else if (csv) await onMerge(csv);
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Import failed. Nothing was changed.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Importing…" : backup ? "Restore this backup" : "Import CSV"}
          <Icon name="check" size={18} />
        </button>
      )}
    </div>
  );
}
