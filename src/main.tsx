import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/dm-sans";
import App from "./App";
import "./styles.css";
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="startup-error">
        <h1>A small pause.</h1>
        <p>Your ledger stays in device storage. Reload to try again.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload Ledgerleaf
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
