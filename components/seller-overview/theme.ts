// The seller Overview's colours (the client's redesign). Orange is the
// seller's colour in every Drop state; green only marks live status (the
// LIVE NOW pill and the time-remaining tile). Every text pairing here meets
// WCAG AA (4.5:1), measured: orange #C2410C is 5.2:1 on white, 4.8:1 on the
// peach card and 4.55:1 on the light peach chips; muted text is 5.6:1+.
export const SO = {
  page:        "#FAF8F6",
  card:        "#FFFFFF",
  line:        "#ECE6E0",
  ink:         "#1C1917",
  text:        "#3F3A36",
  muted:       "#6B625C",
  orange:      "#C2410C",
  orangeHover: "#9A3412",
  orangeTint:  "#FFEDE0",
  peach:       "#FFF4EC",
  peachLine:   "#F9DDC8",
  peachDeep:   "#FDE3D0",
  green:       "#166534",
  greenLive:   "#15803D",
  greenTint:   "#E3F4E1",
  greenWash:   "#F1F8EE",
  greenLine:   "#DCEBD6",
  price:       "#2F7D32",
  purple:      "#7C3AED",
  purpleTint:  "#F1EAFE",
  shadow:      "0 1px 2px rgba(28,25,23,0.04), 0 4px 14px -6px rgba(28,25,23,0.08)",
} as const;

export const SO_FONT = "var(--font-instrument-sans), -apple-system, BlinkMacSystemFont, sans-serif";
export const SO_HAND = "var(--font-caveat), 'Segoe Script', cursive";
