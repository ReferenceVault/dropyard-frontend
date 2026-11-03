import React from "react";

/** Profile-initial chip. Every avatar is the brand green with white initials. */
export function AvatarChip({
  name,
  size = "md",
}: {
  name: string;
  /** Used to vary the colour per user; avatars are now all brand green. Kept so callers needn't change. */
  seed?: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  const sizing = size === "sm"
    ? "h-7 w-7 text-[10px]"
    : size === "lg"
    ? "h-10 w-10 text-sm"
    : "h-8 w-8 text-[11px]";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold text-white bg-dy-green-strong ${sizing} ring-2 ring-white shadow-sm flex-shrink-0`}
      aria-hidden
    >
      {initials}
    </span>
  );
}
