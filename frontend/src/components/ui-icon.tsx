type UiIconName =
  | "grid_view"
  | "terminal"
  | "notifications"
  | "restaurant"
  | "construction"
  | "account_balance_wallet"
  | "package_2"
  | "bolt"
  | "confirmation_number"
  | "payments"
  | "local_shipping"
  | "add_circle"
  | "timer"
  | "wb_sunny"
  | "lunch_dining"
  | "dark_mode"
  | "qr_code"
  | "save"
  | "star";

const ICON_PATHS: Record<UiIconName, string[]> = {
  grid_view: [
    "M4 4h6v6H4z",
    "M14 4h6v6h-6z",
    "M4 14h6v6H4z",
    "M14 14h6v6h-6z",
  ],
  terminal: [
    "M3 5h18v14H3z",
    "M7 9l3 3-3 3",
    "M12 15h5",
  ],
  notifications: [
    "M12 4a4 4 0 0 1 4 4v2.5l1.5 2.5v1H6.5v-1L8 10.5V8a4 4 0 0 1 4-4",
    "M10 17a2 2 0 0 0 4 0",
  ],
  restaurant: [
    "M7 3v8",
    "M10 3v8",
    "M7 7h3",
    "M14 3v18",
    "M14 10h4",
  ],
  construction: [
    "M3 21l8-8",
    "M7 11l6 6",
    "M13 5l6 6",
    "M12 6l6-3",
    "M18 12l3-6",
  ],
  account_balance_wallet: [
    "M3 7h18v12H3z",
    "M3 10h18",
    "M15 14h4",
  ],
  package_2: [
    "M3 8l9-5 9 5-9 5-9-5z",
    "M3 8v8l9 5 9-5V8",
    "M12 13v8",
  ],
  bolt: ["M13 2L6 13h5l-1 9 8-12h-5z"],
  confirmation_number: [
    "M4 8h16v8H4z",
    "M8 8V6",
    "M16 8V6",
    "M8 16v2",
    "M16 16v2",
  ],
  payments: [
    "M3 7h18v10H3z",
    "M6 11h12",
    "M7 14h4",
  ],
  local_shipping: [
    "M3 7h10v8H3z",
    "M13 10h4l3 3v2h-7z",
    "M7 17a1.8 1.8 0 1 0 0.01 0",
    "M17 17a1.8 1.8 0 1 0 0.01 0",
  ],
  add_circle: [
    "M12 3a9 9 0 1 0 0.01 0",
    "M12 8v8",
    "M8 12h8",
  ],
  timer: [
    "M12 8v5l3 2",
    "M9 3h6",
    "M12 5a8 8 0 1 0 0.01 0",
  ],
  wb_sunny: [
    "M12 4v2",
    "M12 18v2",
    "M4 12h2",
    "M18 12h2",
    "M6.5 6.5l1.5 1.5",
    "M16 16l1.5 1.5",
    "M6.5 17.5L8 16",
    "M16 8l1.5-1.5",
    "M12 8a4 4 0 1 0 0.01 0",
  ],
  lunch_dining: [
    "M4 10h16",
    "M6 10V7",
    "M10 10V7",
    "M14 10V7",
    "M7 14h10",
    "M9 17h6",
  ],
  dark_mode: ["M14 4a7 7 0 1 0 6 10 8 8 0 1 1-6-10z"],
  qr_code: [
    "M4 4h6v6H4z",
    "M14 4h6v6h-6z",
    "M4 14h6v6H4z",
    "M14 14h2",
    "M18 14h2",
    "M14 18h2",
    "M18 18h2",
  ],
  save: [
    "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z",
    "M17 21v-8H7v8",
    "M7 3v5h8",
  ],
  star: [
    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  ],
};

export function UiIcon({ name, className }: { name: UiIconName; className?: string }) {
  const paths = ICON_PATHS[name];

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "size-5"}
    >
      {paths.map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

export type { UiIconName };
