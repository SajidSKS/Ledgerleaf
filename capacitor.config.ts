import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "app.ledgerleaf.personal",
  appName: "Ledgerleaf",
  webDir: "dist",
  backgroundColor: "#f6f4ed",
  plugins: {
    SystemBars: {
      insetsHandling: "native",
      initialViewportFitValueHint: "cover",
    },
  },
};
export default config;
