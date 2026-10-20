import { useEffect, useState } from "react";
import type {
  Snapshot,
  Settings as Preferences,
  Category,
  PaymentMethod,
} from "../types";
import { Icon } from "../components/Icon";
import { ItemCreator } from "../components/Entry";
import { money } from "../lib/money";
import { budgetFor } from "../lib/analytics";
import { monthKey } from "../lib/dates";
export interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function Settings({
  data,
  onSettings,
  onCategory,
  onMethod,
  onBudget,
  onBackup,
  onImport,
  onExport,
  onSample,
  install,
  onInstall,
  offlineReady,
}: {
  data: Snapshot;
  onSettings: (s: Preferences) => Promise<void>;
  onCategory: (c: Category) => Promise<void>;
  onMethod: (m: PaymentMethod) => Promise<void>;
  onBudget: () => void;
  onBackup: () => Promise<void>;
  onImport: () => void;
  onExport: () => void;
  onSample: () => Promise<void>;
  install: InstallPrompt | null;
  onInstall: () => void;
  offlineReady: boolean;
}) {
  const [create, setCreate] = useState<"category" | "method" | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [persistent, setPersistent] = useState<boolean | null>(null),
    [rename, setRename] = useState<{
      type: "category" | "method";
      id: string;
      name: string;
    } | null>(null);
  useEffect(() => {
    navigator.storage
      ?.persisted?.()
      .then(setPersistent)
      .catch(() => setPersistent(false));
  }, []);
  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not complete this action.",
      );
    } finally {
      setBusy("");
    }
  }
  const standalone = matchMedia("(display-mode: standalone)").matches;
  return (
    <div className="page-enter">
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAKE YOURSELF AT HOME</span>
          <h1>
            Your own way<span className="clay">.</span>
          </h1>
          <p>A few small settings. A ledger that feels like you.</p>
        </div>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="settings-grid">
        <section className="panel settings-card">
          <div className="section-heading">
            <h2>The everyday</h2>
            <Icon name="sun" />
          </div>
          <label className="setting-row">
            <span>
              <strong>Currency</strong>
              <small>
                Changing this relabels amounts. It does not convert them.
              </small>
            </span>
            <select
              aria-label="Currency"
              value={data.settings.currency}
              onChange={(e) =>
                void run("settings", () =>
                  onSettings({ ...data.settings, currency: e.target.value }),
                )
              }
            >
              <option value="INR">₹ INR</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
              <option value="GBP">£ GBP</option>
              <option value="AED">AED</option>
            </select>
          </label>
          <div className="setting-row">
            <span>
              <strong>Appearance</strong>
              <small>Find your comfortable light.</small>
            </span>
          </div>
          <div className="theme-options">
            {(["light", "dark", "auto"] as const).map((t) => (
              <button
                key={t}
                aria-pressed={data.settings.theme === t}
                onClick={() =>
                  void run("settings", () =>
                    onSettings({ ...data.settings, theme: t }),
                  )
                }
                className={data.settings.theme === t ? "selected" : ""}
              >
                <Icon
                  name={
                    t === "light" ? "sun" : t === "dark" ? "moon" : "monitor"
                  }
                />
                {t === "auto" ? "System" : t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <label className="setting-row">
            <span>
              <strong>Your week starts on</strong>
              <small>Used for weekly charts and the calendar.</small>
            </span>
            <select
              aria-label="Week start day"
              value={data.settings.weekStart}
              onChange={(e) =>
                void run("settings", () =>
                  onSettings({
                    ...data.settings,
                    weekStart: Number(e.target.value) as 0 | 1,
                  }),
                )
              }
            >
              <option value="1">Monday</option>
              <option value="0">Sunday</option>
            </select>
          </label>
          <button className="setting-action" onClick={onBudget}>
            <span>
              <strong>Monthly budget & category limits</strong>
              <small>
                {money(
                  budgetFor(data.budgets, monthKey()).total,
                  data.settings.currency,
                )}{" "}
                · carries forward automatically
              </small>
            </span>
            <Icon name="chevron" size={18} />
          </button>
        </section>
        <section className="panel settings-card">
          <div className="section-heading">
            <h2>Your data, in your hands</h2>
            <Icon name="lock" />
          </div>
          <p className="muted">
            Everything stays on this device. No account, no tracking, no server.
            Keep a backup somewhere you trust.
          </p>
          <button
            className="setting-action"
            disabled={busy === "backup"}
            onClick={() => void run("backup", onBackup)}
          >
            <span className="setting-action-icon">
              <Icon name="download" />
            </span>
            <span>
              <strong>
                {busy === "backup" ? "Preparing backup…" : "Back up everything"}
              </strong>
              <small>
                {data.settings.lastBackup
                  ? `Last exported ${new Date(data.settings.lastBackup).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                  : "One JSON file. Your entire ledger."}
              </small>
            </span>
            <Icon name="chevron" size={18} />
          </button>
          <button className="setting-action" onClick={onImport}>
            <span className="setting-action-icon">
              <Icon name="upload" />
            </span>
            <span>
              <strong>Restore or import</strong>
              <small>Ledgerleaf JSON or a CSV from another ledger</small>
            </span>
            <Icon name="chevron" size={18} />
          </button>
          <button className="setting-action" onClick={onExport}>
            <span className="setting-action-icon">
              <Icon name="book" />
            </span>
            <span>
              <strong>Export a CSV</strong>
              <small>A month, a year, or your own date range</small>
            </span>
            <Icon name="chevron" size={18} />
          </button>
          <div className="storage-status">
            <i className={persistent ? "status-dot" : "status-dot amber"} />
            <span>
              {persistent
                ? "Persistent device storage granted"
                : persistent === null
                  ? "Checking device storage…"
                  : "Standard device storage. Keep regular backups."}
            </span>
          </div>
          <p className="chart-subtext">
            A gentle backup reminder appears each month when you open
            Ledgerleaf. Clearing site data or uninstalling can remove local
            records.
          </p>
        </section>
        <section className="panel settings-card">
          <div className="section-heading">
            <h2>Your categories</h2>
            <button
              className="icon-button"
              aria-label="Add category"
              onClick={() =>
                setCreate(create === "category" ? null : "category")
              }
            >
              <Icon name="plus" />
            </button>
          </div>
          <p className="muted">
            Archive a category when you’re done with it. Its name stays with
            every past expense.
          </p>
          {data.categories.map((c) => (
            <div
              key={c.id}
              className={`management-row ${c.archived ? "archived" : ""}`}
            >
              <span
                className="category-icon"
                style={{ "--chip-colour": c.colour } as React.CSSProperties}
              >
                <Icon name={c.icon} />
              </span>
              {rename?.id === c.id ? (
                <form
                  className="rename-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (
                      rename.name.trim() &&
                      !data.categories.some(
                        (v) =>
                          v.id !== c.id &&
                          v.name.toLowerCase() ===
                            rename.name.trim().toLowerCase(),
                      )
                    )
                      void run("rename", async () => {
                        await onCategory({ ...c, name: rename.name.trim() });
                        setRename(null);
                      });
                  }}
                >
                  <input
                    autoFocus
                    aria-label="Category name"
                    required
                    maxLength={40}
                    value={rename.name}
                    onChange={(e) =>
                      setRename({ ...rename, name: e.target.value })
                    }
                  />
                  <button className="icon-button" aria-label="Save name">
                    <Icon name="check" size={17} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Cancel rename"
                    onClick={() => setRename(null)}
                  >
                    <Icon name="close" size={17} />
                  </button>
                </form>
              ) : (
                <>
                  <button
                    className="management-name"
                    onClick={() =>
                      setRename({ type: "category", id: c.id, name: c.name })
                    }
                  >
                    {c.name}
                    {c.archived && <small>Archived</small>}
                  </button>
                  <label className="manage-colour">
                    <input
                      type="color"
                      aria-label={`Change ${c.name} colour`}
                      value={c.colour}
                      onChange={(e) =>
                        void run("colour", () =>
                          onCategory({ ...c, colour: e.target.value }),
                        )
                      }
                    />
                  </label>
                  <button
                    className="text-button"
                    onClick={() =>
                      void run("archive", () =>
                        onCategory({ ...c, archived: !c.archived }),
                      )
                    }
                  >
                    {c.archived ? "Restore" : "Archive"}
                  </button>
                </>
              )}
            </div>
          ))}
          {create === "category" && (
            <ItemCreator
              type="category"
              items={data.categories}
              onClose={() => setCreate(null)}
              onSave={(c) => onCategory(c as Category)}
            />
          )}
        </section>
        <section className="panel settings-card">
          <div className="section-heading">
            <h2>Ways to pay</h2>
            <button
              className="icon-button"
              aria-label="Add payment method"
              onClick={() => setCreate(create === "method" ? null : "method")}
            >
              <Icon name="plus" />
            </button>
          </div>
          <p className="muted">A little extra context, whenever you want it.</p>
          {data.paymentMethods.map((m) => (
            <div
              key={m.id}
              className={`management-row ${m.archived ? "archived" : ""}`}
            >
              <span className="method-icon">
                <Icon name={m.icon} />
              </span>
              {rename?.id === m.id ? (
                <form
                  className="rename-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (
                      rename.name.trim() &&
                      !data.paymentMethods.some(
                        (v) =>
                          v.id !== m.id &&
                          v.name.toLowerCase() ===
                            rename.name.trim().toLowerCase(),
                      )
                    )
                      void run("rename", async () => {
                        await onMethod({ ...m, name: rename.name.trim() });
                        setRename(null);
                      });
                  }}
                >
                  <input
                    autoFocus
                    aria-label="Payment method name"
                    required
                    maxLength={40}
                    value={rename.name}
                    onChange={(e) =>
                      setRename({ ...rename, name: e.target.value })
                    }
                  />
                  <button className="icon-button" aria-label="Save name">
                    <Icon name="check" size={17} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Cancel rename"
                    onClick={() => setRename(null)}
                  >
                    <Icon name="close" size={17} />
                  </button>
                </form>
              ) : (
                <>
                  <button
                    className="management-name"
                    onClick={() =>
                      setRename({ type: "method", id: m.id, name: m.name })
                    }
                  >
                    {m.name}
                    {m.archived && <small>Archived</small>}
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      void run("archive", () =>
                        onMethod({ ...m, archived: !m.archived }),
                      )
                    }
                  >
                    {m.archived ? "Restore" : "Archive"}
                  </button>
                </>
              )}
            </div>
          ))}
          {create === "method" && (
            <ItemCreator
              type="method"
              items={data.paymentMethods}
              onClose={() => setCreate(null)}
              onSave={(m) => onMethod(m)}
            />
          )}
          <div className="install-card">
            <Icon name="leaf" size={32} />
            <h3>A little closer to hand.</h3>
            <p>
              {standalone
                ? "Ledgerleaf is already on your home screen."
                : install
                  ? "Keep your ledger a tap away. Install it on your home screen."
                  : "In Chrome on Android, open the browser menu and choose “Add to Home screen” or “Install app”."}
            </p>
            {install && (
              <button className="button secondary" onClick={onInstall}>
                Install Ledgerleaf
                <Icon name="plus" size={17} />
              </button>
            )}
            <span className="local-status">
              <i className="status-dot" />
              {offlineReady
                ? "Offline ready"
                : "Offline cache prepares after the first full visit"}
            </span>
          </div>
        </section>
        <section className="sample-card">
          <div>
            <span className="eyebrow">A PEEK AT THE POSSIBILITIES</span>
            <h2>See your ledger come to life.</h2>
            <p>
              Load two years of sample expenses to explore every chart. Your own
              entries stay. Sample data is added once.
            </p>
          </div>
          <button
            className="button secondary"
            disabled={data.settings.sampleLoaded || busy === "sample"}
            onClick={() => void run("sample", onSample)}
          >
            {data.settings.sampleLoaded ? (
              <>
                <Icon name="check" size={17} />
                Sample data loaded
              </>
            ) : busy === "sample" ? (
              "Loading…"
            ) : (
              <>
                Load sample data
                <Icon name="arrow" size={18} />
              </>
            )}
          </button>
        </section>
      </div>
      <p className="settings-footer">
        Ledgerleaf 1.0 · Thoughtfully simple. Entirely yours.
      </p>
    </div>
  );
}
