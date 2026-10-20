import type { CSSProperties } from "react";
const paths: Record<string, React.ReactNode> = {
  leaf: (
    <>
      <path d="M5 19C1 6 13 3 21 3c0 11-4 17-14 15" />
      <path d="M4 21 17 7m-8 9-1-6m4 3 6-1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  history: (
    <>
      <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v16h17M8 15v-4m5 4V7m5 8v-6" />
    </>
  ),
  settings: (
    <>
      <path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  utensils: (
    <>
      <path d="M5 3v6m3-6v6m3-6v6H5m3 0v12M19 3c-4 3-4 8 0 9V3Zm0 9v9" />
    </>
  ),
  bus: (
    <>
      <rect x="4" y="3" width="16" height="15" rx="3" />
      <path d="M4 10h16M8 18v3m8-3v3M7 14h1m8 0h1M9 6h6" />
    </>
  ),
  bag: (
    <>
      <path d="M5 7h14l1 14H4L5 7Z" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </>
  ),
  basket: (
    <>
      <path d="m3 10 3 10h12l3-10H3Zm4 0 4-7m6 7-4-7M9 13v4m6-4v4" />
    </>
  ),
  bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z" />,
  spark: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2" width="11" height="20" rx="3" />
      <path d="M10 5h5m-4 14h3" />
    </>
  ),
  cash: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M5 9h1m12 6h1" />
    </>
  ),
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="M2 10h20M6 15h4" />
    </>
  ),
  tag: (
    <>
      <path d="M3 3h9l9 9-9 9-9-9V3Z" />
      <circle cx="8" cy="8" r="1" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm12 1h2a3 3 0 0 1 0 6h-2M7 3v2m5-2v2" />
    </>
  ),
  heart: (
    <path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-4 4 1 10 8 15 7-5 12-11 8-15Z" />
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7" />
    </>
  ),
  book: (
    <>
      <path d="M12 5C9 3 5 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 1Zm0 0v16" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 3v4m10-4v4M3 11h18m-14 4h3m4 0h3" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  down: <path d="m6 9 6 6 6-6" />,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  backspace: (
    <>
      <path d="M9 5H21v14H9L2 12l7-7Z" />
      <path d="m12 9 6 6m-6 0 6-6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="7" />
      <path d="m16 16 5 5" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
    </>
  ),
  edit: (
    <>
      <path d="m15 4 5 5M3 21l2-7L17 2l5 5L10 19l-7 2Z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" />
    </>
  ),
  moon: <path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z" />,
  monitor: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8m-4-4v4" />
    </>
  ),
  wifi: (
    <>
      <path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0m-9 4a4 4 0 0 1 6 0" />
      <circle cx="12" cy="20" r=".7" />
    </>
  ),
};
export function Icon({
  name,
  size = 20,
  className = "",
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {paths[name] || paths.tag}
    </svg>
  );
}
