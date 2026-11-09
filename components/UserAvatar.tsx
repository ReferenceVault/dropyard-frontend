"use client";

import React, { useState } from "react";
import { avatarAlt, initialsOf, normaliseAvatar, type ResolvedAvatar } from "@/lib/avatar";

/**
 * The one circular profile image used everywhere a person appears: dashboard
 * headers, item cards, the item modal, messages, claims, Q&A, the public item
 * page, the homepage and admin.
 *
 * Shows the person's choice, in this order:
 *   uploaded photo → DropYard avatar → initials
 * and falls back to initials on its own if the image fails to load (deleted
 * file, network blip), so a broken picture is never shown.
 *
 * Styled inline on purpose: it renders identically inside the dashboards'
 * inline-style JSX (whose global `* { margin: 0 }` reset beats Tailwind
 * utilities) and on the Tailwind public pages.
 *
 * Sharpness: the photo is stored at 512×512 and drawn with object-fit: cover
 * at the requested CSS size, so even the largest use (90px) has 3× pixels for
 * high-DPI screens. Avatars are SVG and sharp at any size.
 *
 * Accessibility: by default it's announced as an image ("Profile picture of
 * Anthony", "Anthony's avatar: A green leaf", or just the name for initials).
 * Pass `decorative` when the name is printed right next to it, so screen
 * readers don't hear the name twice.
 */
export interface UserAvatarProps {
  avatar?: ResolvedAvatar | null | unknown;
  name?: string | null;
  /** Diameter in CSS pixels. */
  size?: number;
  decorative?: boolean;
  /** Initials fill; the brand green unless a surface needs its own colour. */
  initialsBg?: string;
  initialsColor?: string;
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  /** Header avatars are above the fold; everything else loads lazily. */
  eager?: boolean;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const AVATAR_GREEN = "#33802B";

export function UserAvatar({
  avatar,
  name,
  size = 32,
  decorative = false,
  initialsBg = AVATAR_GREEN,
  initialsColor = "#FFFFFF",
  fontFamily = "var(--font-instrument-sans), -apple-system, BlinkMacSystemFont, sans-serif",
  fontWeight = 800,
  fontSize,
  eager = false,
  title,
  className,
  style,
}: UserAvatarProps) {
  const resolved = normaliseAvatar(avatar);
  const url = resolved.type === "INITIALS" ? null : resolved.url;
  // Remember which URL failed rather than a boolean, so a new picture gets a
  // fresh attempt without an effect to reset state.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = url !== null && failedUrl !== url;
  const label = avatarAlt(showImage ? resolved : { type: "INITIALS" }, name);

  const box: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    borderRadius: "50%",
    overflow: "hidden",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    background: showImage ? "#F3F8F3" : initialsBg,
    color: initialsColor,
    lineHeight: 1,
    userSelect: "none",
    ...style,
  };

  if (showImage) {
    return (
      <span className={className} style={box} title={title}>
        {/* Plain <img>: S3/CDN photo URLs vary by environment and next/image
            would need every host in remotePatterns, as with item photos. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          // A server-rendered <img> (the public item page) can fail before
          // React hydrates and attaches onError, so the event is missed. When
          // the element mounts, an image that has already finished loading
          // with no pixels is a failure too.
          ref={(el) => { if (el && el.complete && el.naturalWidth === 0) setFailedUrl(url); }}
          src={url}
          alt={decorative ? "" : label}
          width={size}
          height={size}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          onError={() => setFailedUrl(url)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{
        ...box,
        fontFamily,
        fontWeight,
        fontSize: fontSize ?? Math.max(9, Math.round(size * 0.38)),
        letterSpacing: "0.01em",
      }}
      title={title}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label })}
    >
      {initialsOf(name)}
    </span>
  );
}

export default UserAvatar;
