import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { storage } from "./data/storage";
import type { Snapshot, Expense } from "./types";
import { defaultSettings } from "./types";
import { sampleData } from "./data/sample";
import { monthKey, dayKey } from "./lib/dates";
import { budgetFor, sum } from "./lib/analytics";
import { money } from "./lib/money";
import { Icon } from "./components/Icon";
import { Entry } from "./components/Entry";
import { BudgetCard, BudgetEditor, ExpenseRow } from "./components/Budget";
import { Modal } from "./components/Modal";
import { ExportDialog, ImportDialog, backupFile } from "./components/DataTools";
import { History } from "./pages/History";
import { Insights } from "./pages/Insights";
import { Settings } from "./pages/Settings";
import type { InstallPrompt } from "./pages/Settings";
type Page = "add" | "history" | "insights" | "settings";
const nav = [
  { id: "add", label: "Add expense", mobile: "Add", icon: "plus" },
  { id: "history", label: "History", mobile: "History", icon: "history" },
  { id: "insights", label: "Insights", mobile: "Insights", icon: "chart" },
  { id: "settings", label: "Settings", mobile: "Settings", icon: "settings" },
] as const;
export default function App() {
  const [data, setData] = useState<Snapshot | null>(null),
    [page, setPage] = useState<Page>("add"),
    [fatal, setFatal] = useState(""),
    [toast, setToast] = useState(""),
    [undo, setUndo] = useState<Expense | null>(null),
    [modal, setModal] = useState<"budget" | "export" | "import" | null>(null),
    [editing, setEditing] = useState<Expense | null>(null),
    [install, setInstall] = useState<InstallPrompt | null>(null),
    [online, setOnline] = useState(navigator.onLine),
    [clock, setClock] = useState(Date.now()),
    [globalBusy, setGlobalBusy] = useState(false);
  const channel = useRef<BroadcastChannel | null>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const refresh = useCallback(async () => {
    setData(await storage.snapshot());
  }, []);
  useEffect(() => {
    let mounted = true;
    storage
      .init()
      .then(() => storage.snapshot())
      .then((d) => {
        if (mounted) setData(d);
      })
      .catch((e) =>
        setFatal(
          `Your device storage could not open. ${e instanceof Error ? e.message : ""}`,
        ),
      );
    if ("BroadcastChannel" in window) {
      channel.current = new BroadcastChannel("ledgerleaf-changes");
      channel.current.onmessage = () => void refresh();
    }
    const prompt = (e: Event) => {
        e.preventDefault();
        setInstall(e as InstallPrompt);
      },
      network = () => setOnline(navigator.onLine),
      focus = () => {
        setClock(Date.now());
        void refresh();
      },
      installed = () => setInstall(null);
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    window.addEventListener("focus", focus);
    window.addEventListener("appinstalled", installed);
    const interval = setInterval(() => setClock(Date.now()), 60000);
    return () => {
      mounted = false;
      channel.current?.close();
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
      window.removeEventListener("focus", focus);
      window.removeEventListener("appinstalled", installed);
      clearInterval(interval);
      clearTimeout(toastTimer.current);
    };
  }, [refresh]);
  useEffect(() => {
    const theme = data?.settings.theme || defaultSettings.theme,
      query = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved =
        theme === "auto" ? (query.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      if (Capacitor.isNativePlatform())
        void SystemBars.setStyle({
          style:
            resolved === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
        }).catch(() => {});
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [data?.settings.theme]);
  function notify(message: string) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 5000);
  }
  async function mutate(fn: () => Promise<unknown>) {
    await fn();
    await refresh();
    channel.current?.postMessage("changed");
  }
  async function backup() {
    if (!data) return;
    await backupFile(data);
    await mutate(() =>
      storage.saveSettings({
        ...data.settings,
        lastBackup: Date.now(),
        reminderDismissed: null,
      }),
    );
    notify("Backup exported. Keep the file somewhere safe.");
  }
  async function remove(e: Expense) {
    try {
      await mutate(() => storage.deleteExpense(e.id));
      setEditing(null);
      setUndo(e);
      notify("Expense removed.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not delete expense.");
    }
  }
  function go(next: Page) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  if (fatal)
    return (
      <div className="startup-error">
        <Icon name="leaf" size={46} />
        <h1>A small pause.</h1>
        <p role="alert">{fatal}</p>
        <p>Allow site storage and open Ledgerleaf in a regular browser tab.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    );
  if (!data)
    return (
      <div className="loading-screen">
        <Icon name="leaf" size={40} />
        <span>Ledgerleaf</span>
      </div>
    );
  const currentMonth = monthKey(clock),
    recent = [...data.expenses]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3),
    today = sum(
      data.expenses.filter((e) => dayKey(e.timestamp) === dayKey(clock)),
    ),
    budget = budgetFor(data.budgets, currentMonth),
    spent = sum(
      data.expenses.filter((e) => monthKey(e.timestamp) === currentMonth),
    ),
    limits = Object.entries(budget.limits).filter(([, v]) => v > 0);
  const backupDue =
    data.expenses.length > 0 &&
    (!data.settings.lastBackup ||
      monthKey(data.settings.lastBackup) < currentMonth) &&
    data.settings.reminderDismissed !== currentMonth;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("add");
          }}
        >
          <span className="brand-symbol">
            <Icon name="leaf" size={28} />
          </span>
          <span>
            Ledgerleaf<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="sidebar-caption">A LITTLE MORE CLARITY.</div>
        <nav className="side-nav" aria-label="Main navigation">
          {nav.map((n) => (
            <button
              key={n.id}
              className={page === n.id ? "active" : ""}
              aria-current={page === n.id ? "page" : undefined}
              onClick={() => go(n.id)}
            >
              <Icon name={n.icon} />
              <span>{n.label}</span>
              {page === n.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <svg
            className="sidebar-illustration"
            viewBox="0 0 150 170"
            aria-hidden="true"
            fill="none"
          >
            <path
              d="M70 161c13-38 8-74 27-127M80 112c-33 2-49-20-47-43 27 1 46 16 47 43Zm6-26c28 5 47-13 52-34-26-1-43 12-52 34ZM93 59C73 44 73 21 84 8c18 14 22 33 9 51Zm-16 78c27 8 49-1 59-22-27-8-46 2-59 22Z"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path d="M41 162h73" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          <p>
            Good days start
            <br />
            with a little clarity.
          </p>
          <span className="local-status">
            <i className="status-dot" />
            {offlineReady ? "Offline ready" : "Always local"}
          </span>
          <span className="sidebar-private">
            <Icon name="lock" size={12} />
            Private by nature.
          </span>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <span className="topbar-label">YOUR EVERYDAY LEDGER</span>
          <a
            className="mobile-brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              go("add");
            }}
          >
            <Icon name="leaf" size={25} />
            Ledgerleaf<span>.</span>
          </a>
          <div className="topbar-right">
            <span className="today-date">
              {new Date(clock).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="device-badge">
              <Icon name={online ? "lock" : "wifi"} size={13} />
              {online ? "On your device" : "Offline"}
            </span>
            <button
              className="avatar-button"
              onClick={() => go("settings")}
              aria-label="Open settings"
            >
              S
            </button>
          </div>
        </header>
        {needRefresh && (
          <div className="update-banner">
            <span>
              A fresh version is ready. Finish your entry, then update.
            </span>
            <button onClick={() => void updateServiceWorker(true)}>
              Update
              <Icon name="arrow" size={14} />
            </button>
          </div>
        )}
        <div className={`page-content ${page === "add" ? "add-page" : ""}`}>
          {page === "add" ? (
            <>
              <div className="page-heading add-heading">
                <div>
                  <span className="eyebrow">
                    LESS KEEPING TRACK. MORE LIVING.
                  </span>
                  <h1>
                    A little clarity,
                    <br className="desktop-break" /> every day
                    <span className="clay">.</span>
                  </h1>
                  <p>The small spends. The bigger picture. All yours.</p>
                </div>
                <div className="today-total">
                  <span>Spent today</span>
                  <strong>{money(today, data.settings.currency)}</strong>
                </div>
              </div>
              <div className="mobile-budget-summary">
                <button onClick={() => setModal("budget")}>
                  <span className="mobile-left">
                    <Icon name="leaf" size={18} />
                    <strong>
                      {budget.total
                        ? money(budget.total - spent, data.settings.currency)
                        : "Set a budget"}
                    </strong>
                    {budget.total ? "left" : ""}
                  </span>
                  <span className="mobile-pace">
                    <b>
                      {budget.total
                        ? money(
                            Math.floor(
                              (budget.total - spent) /
                                (new Date(
                                  new Date(clock).getFullYear(),
                                  new Date(clock).getMonth() + 1,
                                  0,
                                ).getDate() -
                                  new Date(clock).getDate() +
                                  1),
                            ),
                            data.settings.currency,
                          )
                        : "Your monthly plan"}
                    </b>
                    {budget.total
                      ? "safe to spend today"
                      : "A little room to grow"}
                  </span>
                </button>
                <div className="tiny-progress">
                  <span
                    style={{
                      width: `${budget.total ? Math.min(100, (spent / budget.total) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="add-grid">
                <section className="panel entry-card">
                  <Entry
                    data={data}
                    onSave={(e) => mutate(() => storage.saveExpense(e))}
                    onCategory={(c) => mutate(() => storage.saveCategory(c))}
                    onMethod={(m) => mutate(() => storage.saveMethod(m))}
                  />
                </section>
                <aside className="overview-column">
                  <BudgetCard data={data} onEdit={() => setModal("budget")} />
                  {limits.length > 0 && (
                    <section className="panel limits-card">
                      <div className="section-heading">
                        <h3>A little room for everything</h3>
                        <button
                          className="icon-button"
                          aria-label="Edit category limits"
                          onClick={() => setModal("budget")}
                        >
                          <Icon name="edit" size={15} />
                        </button>
                      </div>
                      {limits.map(([id, limit]) => {
                        const c = data.categories.find((c) => c.id === id),
                          v = sum(
                            data.expenses.filter(
                              (e) =>
                                e.categoryId === id &&
                                monthKey(e.timestamp) === currentMonth,
                            ),
                          );
                        return (
                          <div className="category-limit" key={id}>
                            <div>
                              <span>
                                <i style={{ background: c?.colour }} />
                                {c?.name}
                              </span>
                              <small>
                                {money(v, data.settings.currency)} /{" "}
                                {money(limit, data.settings.currency)}
                              </small>
                            </div>
                            <div className="tiny-progress">
                              <span
                                style={{
                                  width: `${Math.min(100, (v / limit) * 100)}%`,
                                  background: c?.colour,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </section>
                  )}
                  <section className="recent-card">
                    <div className="section-heading">
                      <h2>The latest little things</h2>
                      <button
                        className="text-button"
                        onClick={() => go("history")}
                      >
                        View all
                        <Icon name="arrow" size={14} />
                      </button>
                    </div>
                    {recent.length ? (
                      recent.map((e) => (
                        <ExpenseRow
                          key={e.id}
                          expense={e}
                          data={data}
                          onEdit={() => setEditing(e)}
                          compact
                        />
                      ))
                    ) : (
                      <div className="recent-empty">
                        <Icon name="book" size={28} />
                        <h3>A fresh page, just for you.</h3>
                        <p>
                          Add your first expense.
                          <br />
                          The little things add up to clarity.
                        </p>
                        <button
                          className="text-button"
                          disabled={globalBusy}
                          onClick={async () => {
                            setGlobalBusy(true);
                            try {
                              await mutate(() => storage.seed(sampleData()));
                              notify("Sample data added. Take a look around.");
                            } catch (e) {
                              notify(String(e));
                            } finally {
                              setGlobalBusy(false);
                            }
                          }}
                        >
                          Load sample data
                          <Icon name="arrow" size={15} />
                        </button>
                      </div>
                    )}
                  </section>
                  <div className="quiet-note">
                    <Icon name="leaf" size={20} />
                    <p>
                      Not every day needs a plan.
                      <br />
                      Just a little room to grow.
                    </p>
                  </div>
                </aside>
              </div>
              <div className="add-footer">
                <span>
                  <Icon name="lock" size={12} />
                  Your money story stays with you.
                </span>
                <span>One small entry at a time.</span>
              </div>
            </>
          ) : page === "history" ? (
            <History
              data={data}
              onEdit={setEditing}
              onDelete={remove}
              onExport={() => setModal("export")}
            />
          ) : page === "insights" ? (
            <Insights data={data} />
          ) : (
            <Settings
              data={data}
              onSettings={(s) => mutate(() => storage.saveSettings(s))}
              onCategory={(c) => mutate(() => storage.saveCategory(c))}
              onMethod={(m) => mutate(() => storage.saveMethod(m))}
              onBudget={() => setModal("budget")}
              onBackup={backup}
              onImport={() => setModal("import")}
              onExport={() => setModal("export")}
              onSample={async () => {
                await mutate(() => storage.seed(sampleData()));
                notify("Sample data added. Explore your insights.");
              }}
              install={install}
              onInstall={async () => {
                if (install) {
                  await install.prompt();
                  await install.userChoice;
                  setInstall(null);
                }
              }}
              offlineReady={offlineReady}
            />
          )}
          {backupDue && (
            <div className="backup-reminder">
              <Icon name="book" size={20} />
              <span>
                <strong>A little peace of mind.</strong> Your monthly backup is
                ready when you are.
              </span>
              <button
                className="text-button"
                onClick={() => void backup().catch((e) => notify(String(e)))}
              >
                Back up
                <Icon name="download" size={15} />
              </button>
              <button
                className="icon-button"
                aria-label="Remind me next month"
                onClick={() =>
                  void mutate(() =>
                    storage.saveSettings({
                      ...data.settings,
                      reminderDismissed: currentMonth,
                    }),
                  ).catch((e) => notify(String(e)))
                }
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          )}
        </div>
      </main>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {nav.map((n) => (
          <button
            key={n.id}
            className={page === n.id ? "active" : ""}
            aria-current={page === n.id ? "page" : undefined}
            onClick={() => go(n.id)}
          >
            <span>
              <Icon name={n.icon} size={22} />
            </span>
            {n.mobile}
          </button>
        ))}
      </nav>
      {(toast || undo) && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          <span>{toast || "Expense removed."}</span>
          {undo && (
            <button
              onClick={async () => {
                try {
                  await mutate(() => storage.saveExpense(undo));
                  setUndo(null);
                  notify("Expense restored.");
                } catch (e) {
                  notify(String(e));
                }
              }}
            >
              Undo
            </button>
          )}
          <button
            className="toast-close"
            onClick={() => {
              setToast("");
              setUndo(null);
            }}
            aria-label="Dismiss"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {modal === "budget" && (
        <Modal title="A plan for the month" onClose={() => setModal(null)}>
          <BudgetEditor
            data={data}
            month={currentMonth}
            onSave={async (b) => {
              await mutate(() => storage.saveBudget(b));
              setModal(null);
              notify("Your budget has a fresh start.");
            }}
          />
        </Modal>
      )}
      {modal === "export" && (
        <Modal title="Take your ledger with you" onClose={() => setModal(null)}>
          <ExportDialog
            data={data}
            onClose={() => setModal(null)}
            notify={notify}
          />
        </Modal>
      )}
      {modal === "import" && (
        <Modal title="Bring your story back" onClose={() => setModal(null)}>
          <ImportDialog
            data={data}
            onBackup={backup}
            onRestore={async (b) => {
              await mutate(() => storage.restore(b));
              setModal(null);
              setUndo(null);
              notify("Your full ledger has been restored.");
            }}
            onMerge={async (incoming) => {
              let count = 0;
              await mutate(async () => {
                count = await storage.merge(incoming);
              });
              setModal(null);
              notify(`${count} expenses imported. Matching rows skipped.`);
            }}
          />
        </Modal>
      )}
      {editing && (
        <Modal title="The little details" onClose={() => setEditing(null)}>
          <Entry
            key={editing.id}
            data={data}
            existing={editing}
            onSave={async (e) => {
              await mutate(() => storage.saveExpense(e));
              setEditing(null);
              notify("Expense updated.");
            }}
            onCategory={(c) => mutate(() => storage.saveCategory(c))}
            onMethod={(m) => mutate(() => storage.saveMethod(m))}
            onDelete={() => void remove(editing)}
          />
        </Modal>
      )}
    </div>
  );
}
