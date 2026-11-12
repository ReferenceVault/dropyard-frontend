// Colours and type for the shared Messages pieces. The same values as the
// dashboards' own `C` / `F` tokens (DropYard_BuyerDashboard.jsx and
// DropYard_SellerDashboard.jsx), so these components sit inside either
// dashboard's inline-style JSX without a seam.
export const MC = {
  paper: "#FFFFFF",
  sand: "#FBFDFB",
  fawn: "#E3EAE2",
  smoke: "#D4DDD3",
  ash: "#60745D",
  mink: "#5F755C",
  ink: "#0F360B",
  green: "#33802B",
  greenDeep: "#2C6126",
  greenMist: "#E2EFE0",
  /** Selected inbox row — the mockup's pale green. */
  greenWash: "#F1F7F0",
  amber: "#F99605",
  amberDeep: "#A35C00",
  amberMist: "#FFF7ED",
  /** Unread count badge: the brand orange, deep enough for white text at 4.9:1. */
  orange: "#B35600",
  claret: "#CC3B2A",
  claretMist: "#FDECEC",
  greyMist: "#F0F3F0",
  /** Incoming chat bubble. */
  bubbleIn: "#F1F3F1",
  /** Outgoing chat bubble — pale green, dark text. */
  bubbleOut: "#E2EFE0",
  seen: "#2F6FB3",
} as const;

export const MF = {
  head: "var(--font-instrument-sans), -apple-system, BlinkMacSystemFont, sans-serif",
  body: "var(--font-instrument-sans), -apple-system, BlinkMacSystemFont, sans-serif",
} as const;
