import React from "react";
import { UserAvatar } from "@/components/UserAvatar";

const SIZE_PX = { sm: 28, md: 32, lg: 40 } as const;

/**
 * Admin's person chip — the shared UserAvatar (photo → DropYard avatar →
 * initials) at the admin table sizes, with the white ring the tables use.
 * Without `avatar` (e.g. a contact-form sender who has no account) it shows
 * initials, exactly as before.
 */
export function AvatarChip({
  name,
  avatar,
  size = "md",
}: {
  name: string;
  /** The resolved `avatar` from the API, when the row is a DropYard user. */
  avatar?: unknown;
  /** Used to vary the colour per user; avatars are now all brand green. Kept so callers needn't change. */
  seed?: string;
  size?: "sm" | "md" | "lg";
}) {
  const px = SIZE_PX[size];
  return (
    <UserAvatar
      avatar={avatar}
      name={name}
      size={px}
      decorative
      fontSize={size === "sm" ? 10 : size === "lg" ? 14 : 11}
      fontWeight={700}
      style={{ boxShadow: "0 0 0 2px #fff, 0 1px 2px rgba(15, 23, 42, 0.08)" }}
    />
  );
}
