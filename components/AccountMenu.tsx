"use client";

// The public header's account menu: the user's avatar, which opens a menu of
// where they can go (dashboards, settings, help) and Sign out.
//
// Menu-button pattern: Enter / Space / ArrowDown open it on the first item,
// ArrowUp on the last; inside, the arrow keys, Home and End move, Esc closes
// and returns focus to the avatar, Tab closes and moves on. A click outside
// closes it too.
//
// A dot on the avatar says something is unread (conversations on either side
// or bell entries; see useUnreadSummary), and the menu then starts with an
// "N unread" line that leads to it.

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  LayoutGrid, Store, Settings, CircleHelp, LogOut, ShieldCheck, Tag, Bell,
  type LucideIcon,
} from "lucide-react";
import type { AuthUser } from "@/context/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import { Z } from "@/lib/layers";
import { unreadHref, type UnreadSummary } from "@/components/useUnreadSummary";

interface Item {
  label: string;
  icon: LucideIcon;
  href?: string;
  onSelect?: () => void;
  /** A second, smaller line under the label. */
  detail?: string;
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** What this account can open. See the comments for the role rules. */
export function accountMenuItems(user: AuthUser, signout: () => void, unread: UnreadSummary | null = null): Item[] {
  const role = user.role;
  const items: Item[] = [];
  if (unread && unread.total > 0) {
    const messages = unread.buyer + unread.seller;
    items.push({
      label: `${unread.total} unread`,
      detail: [messages && plural(messages, "conversation"), unread.events && plural(unread.events, "notification")].filter(Boolean).join(" · "),
      icon: Bell,
      href: unreadHref(unread),
    });
  }
  // A SELLER-only account has no buyer side: /buyer always opens it in seller
  // mode, whatever ?mode= says, so a "Buyer dashboard" link would lie.
  if (role !== "SELLER") items.push({ label: "Buyer dashboard", icon: LayoutGrid, href: "/buyer?mode=buyer" });
  // A BUYER-only account hasn't set up selling yet: the seller dashboard is
  // where the existing seller onboarding starts (same place as Sell Something).
  items.push(role === "BUYER"
    ? { label: "Start selling", icon: Tag, href: "/buyer?mode=seller" }
    : { label: "Seller dashboard", icon: Store, href: "/buyer?mode=seller" });
  // Buyer-only accounts: the buyer Settings page (profile picture, name,
  // email, password, delete account). Everyone who sells: the seller Settings,
  // which opens on the same Account section and also holds the selling
  // preferences (notifications, payments, pickup), so all of it is in one place.
  items.push({
    label: "Account settings",
    icon: Settings,
    href: role === "BUYER" ? "/buyer?mode=buyer&tab=settings" : "/buyer?mode=seller&tab=settings",
  });
  items.push({ label: "Help & How It Works", icon: CircleHelp, href: "/how-it-works" });
  if (role === "ADMIN") items.push({ label: "Admin", icon: ShieldCheck, href: "/admin" });
  items.push({ label: "Sign out", icon: LogOut, onSelect: signout });
  return items;
}

export function AccountMenu({ user, signout, size = 40, unread = null }: { user: AuthUser; signout: () => void; size?: number; unread?: UnreadSummary | null }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusOnOpen = useRef<"first" | "last">("first");
  const menuId = useId();
  const name = user.firstName || user.name || "your account";
  const items = accountMenuItems(user, signout, unread);
  const hasUnread = !!unread && unread.total > 0;

  const menuItems = () => [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }, []);

  // Focus the first (or last) item once the menu is on screen.
  useEffect(() => {
    if (!open) return;
    const list = menuItems();
    (focusOnOpen.current === "last" ? list[list.length - 1] : list[0])?.focus();
  }, [open]);

  // A click anywhere else closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      close(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);

  const openWith = (where: "first" | "last") => { focusOnOpen.current = where; setOpen(true); };

  const onButtonKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); openWith("first"); }
    else if (e.key === "ArrowUp") { e.preventDefault(); openWith("last"); }
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    const list = menuItems();
    const i = list.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => { e.preventDefault(); list[(n + list.length) % list.length]?.focus(); };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(list.length - 1);
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === "Tab") close(false);
    // A link is followed by Enter only; menu items take Space too.
    else if (e.key === " " && document.activeElement?.tagName === "A") { e.preventDefault(); (document.activeElement as HTMLElement).click(); }
  };

  const itemClass = "dy-focus flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] font-medium text-dy-forest transition-colors hover:bg-dy-pale focus-visible:bg-dy-pale";

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Account menu for ${name}${hasUnread ? ", you have unread notifications" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : openWith("first"))}
        onKeyDown={onButtonKey}
        className="dy-focus relative block rounded-full ring-1 ring-dy-line transition-shadow hover:ring-2 hover:ring-dy-green aria-expanded:ring-2 aria-expanded:ring-dy-green"
      >
        <UserAvatar avatar={user.avatar} name={user.name} size={size} decorative eager initialsBg="#E2EFE0" initialsColor="#2C6126" />
        {/* Decorative: the button's name says it. */}
        {hasUnread && <span aria-hidden data-unread-dot className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-dy-red ring-2 ring-white" />}
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={`Account menu for ${name}`}
          onKeyDown={onMenuKey}
          style={{ zIndex: Z.popover }}
          // Below lg the avatar sits left of the menu button, so the menu is
          // pinned to the screen edge (under the 80px bar) to stay on screen.
          className="dy-rise fixed right-4 top-[88px] w-[min(300px,calc(100vw-32px))] lg:absolute lg:right-0 lg:top-[calc(100%+10px)] rounded-2xl border border-dy-line bg-white p-2 font-dy shadow-[0_18px_48px_rgba(15,54,11,0.18)]"
        >
          {/* Who's signed in. Not an item: nothing to do here. */}
          <div role="presentation" className="flex items-center gap-3 border-b border-dy-line px-3 pb-3 pt-2">
            <UserAvatar avatar={user.avatar} name={user.name} size={48} decorative initialsBg="#E2EFE0" initialsColor="#2C6126" />
            <div className="min-w-0">
              <p className="truncate text-[17px] font-semibold text-dy-forest">{user.name || name}</p>
              <p className="text-[14px] text-dy-muted">My account</p>
            </div>
          </div>
          <div role="none" className="flex flex-col gap-0.5 pt-2">
            {items.map(({ label, icon: Icon, href, onSelect, detail }) => {
              const inner = detail ? (
                <>
                  <Icon size={18} strokeWidth={1.8} className="shrink-0 text-dy-red" aria-hidden />
                  <span className="flex min-w-0 flex-col">
                    <span>{label}</span>
                    <span className="text-[13px] font-normal text-dy-muted">{detail}</span>
                  </span>
                </>
              ) : (<><Icon size={18} strokeWidth={1.8} className="shrink-0 text-dy-muted" aria-hidden />{label}</>);
              return href ? (
                <Link key={label} href={href} role="menuitem" tabIndex={-1} className={itemClass} onClick={() => close(false)}>
                  {inner}
                </Link>
              ) : (
                <button key={label} type="button" role="menuitem" tabIndex={-1} className={itemClass} onClick={() => { close(false); onSelect?.(); }}>
                  {inner}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
