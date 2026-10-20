# Ledgerleaf

A quiet, mobile-first expense tracker. Fast entry, a permanent ledger, and useful perspective. React, TypeScript, Vite, Dexie, and hand-drawn SVG charts. No backend, accounts, tracking, or runtime CDN dependencies. Fonts and app assets are bundled for offline use.

## Run

Install Node.js 24 LTS, then run these commands in this directory:

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL Vite prints. The first screen is expense entry. Use the custom keypad, choose a category, and save. Payment method and note are optional. No system keyboard opens for the amount. Desktop users can focus the amount display and use number keys, Backspace, and Enter.

Your ledger starts empty, with no invented budget. Set a monthly budget from the budget card or Settings. “Load sample data” adds two years of deterministic sample expenses and budgets exactly once, preserving your entries. It does not reset anything.

```sh
pnpm test       # 19 money, CSV, backup, retention, and transaction tests
pnpm build      # TypeScript check, optimized assets, manifest, service worker
pnpm preview    # Serve the production build for offline/install testing
```

The development server does not register a service worker. Test offline behavior against `pnpm preview` or your HTTPS deployment.

## What works

- Amount keypad, haptic feedback where supported, reduced-motion support, category creation with icon and colour, optional custom payment methods, notes, backdating, save animation, and live budget updates.
- Monthly budgets inherit the last earlier budget, including category limits. Editing a historical month changes the inherited plan until the next explicit override. Zero is a valid budget. This is a recurring budget amount, not an automatic rollover of unspent money.
- Remaining budget, spent total, progress, category limits, and safe-to-spend-today. Daily pace divides remaining paise by calendar days left including today. Negative balances remain visible in warm clay tones.
- Searchable history with category, payment, and date filters. All-time and custom-range views. Tap an expense to edit. Swipe left over 95px to delete on touch devices, or use the delete control in its editor. Undo restores the exact record until you dismiss the undo message, delete another expense, or reload.
- Month analytics: category/payment donuts, daily bars, average, projection, biggest expense, top category, previous-month and previous-year comparison, weekday averages, and category growth.
- Year analytics: 12-month spend/budget bars, category sparklines, payment breakdown, lightest/fullest months with recorded spending, average across elapsed calendar months, weekday averages, category growth, and a horizontally scrollable daily heatmap. Tap/focus chart bars and days for exact amounts.
- Currency label (INR by default with Indian digit grouping), light/dark/system appearance, week start, category/payment archiving and renaming, category colours, complete backup/restore, CSV import/export, and install guidance.

## Permanent data and backups

`src/data/storage.ts` is the only Dexie adapter. All UI mutations go through the `LedgerStorage` interface. A future native SQLite adapter can implement that interface without changing screens.

IndexedDB database: `ledgerleaf-v1`, schema version 1.

```ts
Expense = {
  id: string,
  amount: number, // positive integer paise/minor units
  categoryId: string,
  paymentMethodId: string | null,
  note: string,
  timestamp: number,
  createdAt: number,
  updatedAt: number, // epoch milliseconds
};
Category = { id, name, colour, icon, archived };
PaymentMethod = { id, name, icon, archived };
Budget = { month: "YYYY-MM", total: number, limits: Record<string, number> };
```

There is one expense log. A month or year is only a filter. No timer, migration, or month boundary deletes expenses. Category and payment removal archives the label rather than deleting it. Renaming a label updates how existing entries display it.

`navigator.storage.persist()` is requested on startup. Browsers decide whether to grant it, and Settings shows the result. Persistence is not a backup. Clearing site data, using private browsing, changing origin, or uninstalling the native app can remove local records. Browser and native WebView ledgers are separate stores. Move between them with a JSON backup.

The in-app monthly backup reminder appears when you next open the app in a month with expenses and no backup exported that month. Dismissing it waits until next month. The app does not schedule OS notifications while closed.

JSON backup contains all expenses across all years, archived labels, payment methods, budgets, and preferences. Restore validates IDs, references, integer amounts, dates, and settings before showing a replacement confirmation. The replacement runs in one IndexedDB transaction. If it fails, the previous ledger stays. Export your current ledger from the restore dialog before replacing it. Backup files contain your plain financial records, so save them somewhere private. The app stores no encryption key or online copy.

CSV is a migration format for expenses only. It does not carry budgets, settings, or archive status. Columns are exactly:

```csv
Date,Time,Amount,Category,Payment Method,Note
2026-10-19,13:45,125.00,Food & drink,UPI,Lunch
```

Dates and times use the device’s local timezone. Amounts are plain numbers with two decimal places. Exports include a UTF-8 BOM, CRLF row endings, and RFC-style quoting for commas, quotes, and newlines. Imports also accept the older five-column layout without Payment Method. Missing labels are created. Empty methods become `null`. Imports merge transactionally and skip rows matching the same minute, amount, category, payment method, and note, including repeats inside a file. Two genuinely separate identical purchases in the same minute need a distinct note to survive CSV deduplication. JSON preserves exact IDs, timestamps, and all such purchases.

Currency changes relabel existing amounts. They do not convert exchange rates or create separate currency ledgers.

## Offline and Android installation

Production builds generate a manifest, 192px and 512px PNG icons, and a precaching service worker through `vite-plugin-pwa`. All app bundles, local fonts, and icons are cached. There are no network data calls. A first successful online visit is required before a browser can work offline. The app displays “Offline ready” after precaching finishes. Updates prompt you to finish an entry before refreshing.

Use HTTPS for installation, except on localhost. On Android Chrome, visit your deployed URL, then use Settings → Install Ledgerleaf when offered, or Chrome’s menu → Add to Home screen / Install app. Open it, make an expense, close it, switch to airplane mode, and reopen. All four screens, chart filters, entry, history, and data tools should work offline. Download/share destinations can depend on the receiving app and device.

## Free deployment

### Netlify

Push this directory as a repository root to your Git provider. Connect it to a free Netlify site. `netlify.toml` sets Node 24, `pnpm build`, and the `dist` publishing directory. Alternatively run `pnpm build` locally and drag the `dist` folder onto Netlify’s manual deploy page. No environment variables or backend services are needed.

### GitHub Pages

Push this directory as a GitHub repository root. In the repository, choose Settings → Pages → Source: GitHub Actions. Run “Deploy web app to GitHub Pages” from Actions. The included workflow checks, builds, and uploads `dist`. Relative asset paths and service-worker scope support both root domains and `/repository-name/` subpaths. The app uses in-memory tabs, so there are no server routes to configure.

Keep the deployed origin stable. Device records belong to that origin. Back up before moving to a different host.

## Wrap with Capacitor and build a debug APK

Capacitor 8, Android, Filesystem, and Share are included. Native export goes through `src/lib/files.ts`: browser downloads use a Blob and anchor, while native builds write UTF-8 to the Filesystem cache and open the native Share sheet. No anchor downloads are used in a native WebView. The storage adapter remains Dexie until you supply a SQLite adapter.

### Build entirely in GitHub Actions

1. Push this directory as the repository root, including `pnpm-lock.yaml` and `.github/workflows/android-debug.yml`.
2. Open Actions → Android debug APK → Run workflow. It also runs on pushes to `main`.
3. The workflow installs Node 24, pnpm 11.25.0, Java 21, Android platform 36, and build tools 36.0.0. It tests the data layer, builds the web app, creates the Android project if missing, syncs Capacitor plugins, and runs Gradle `assembleDebug`.
4. Download the “Ledgerleaf-debug-apk” artifact from the completed run. Extract `app-debug.apk`, transfer it to your Android phone, and open it to install.

This is a debug APK, signed with the build runner’s disposable debug key. Separate cloud runs can produce different signing keys, which Android treats as incompatible updates. Export your ledger before removing an older debug build. For repeatable upgrades, configure a persistent signing key in GitHub secrets and a release signing configuration. No secret or keystore is included here.

### Build locally

Install Android Studio Otter 2025.2.1 or newer, Android SDK platform 36 and build tools 36.0.0, and JDK 21. Then:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm exec cap add android     # first time only
pnpm exec cap sync android
node scripts/prepare-android.mjs # branded Android launcher icons
pnpm exec cap open android
```

In Android Studio choose Build → Build APK(s), or run:

```sh
# macOS / Linux
cd android
./gradlew assembleDebug
```

```powershell
# Windows PowerShell, from project root
Set-Location android
.\gradlew.bat assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`. After web changes, rebuild and run `pnpm exec cap sync android` again. The generated `android/` directory is ignored so the included workflow can regenerate it cleanly. If you add native code, commit the native project by removing that ignore rule. Capacitor config uses `webDir: 'dist'`, no remote server URL, and app ID `app.ledgerleaf.personal`.

Capacitor 8 handles edge-to-edge insets through CSS variables. The UI uses viewport-fit and safe-area insets for navigation and the mobile save dock. Test keyboard, status/navigation bars, haptics, export/share, and data survival on your target phone before distributing an APK.

Official references: [Capacitor environment](https://capacitorjs.com/docs/getting-started/environment-setup), [Capacitor 8 Android requirements](https://capacitorjs.com/docs/updating/8-0), [Share API](https://capacitorjs.com/docs/apis/share), [Vite PWA registration](https://vite-pwa-org.netlify.app/guide/register-service-worker).

## Structure

```text
src/
  components/   # Keypad/entry, budget cards, modal, SVG charts, data dialogs
  data/         # Dexie storage interface/adapter and optional sample generator
  lib/          # Integer money, local dates, CSV, JSON validation, file export
  pages/        # History, Insights, Settings
  App.tsx       # Navigation, data lifecycle, dialogs, undo, reminders
  types.ts      # Permanent data contracts and initial labels
  styles.css    # Paper/forest/clay palette, responsive layout, themes, motion
public/         # Offline app icons
.github/workflows/ # Web deployment and cloud debug APK builds
```

The tests cover money parsing, permanent-period filtering, budget inheritance, CSV quoting/payment/legacy imports, invalid input, backup references, archive retention, CSV deduplication, complete restoration, and rollback on failure. Physical Android installation and APK generation require Android tooling or running the included workflow. They are separate from the web production build.
