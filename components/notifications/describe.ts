// What a bell entry says, and where it leads. Shared by the bell panel and the
// toasts, so the two always word an event the same way.
import type { AppNotification, NavTarget, Role } from "@/context/NotificationsContext";

export type Tone = "good" | "bad" | "info";

export interface Described {
  /** One plain sentence: the entry's text, the toast's text, and its accessible name. */
  text: string;
  target: NavTarget;
  tone: Tone;
}

export function roleOf(n: Pick<AppNotification, "role">): Role {
  return n.role === "SELLER" ? "seller" : "buyer";
}

const money = (amount: number | null | undefined) => (typeof amount === "number" ? `$${amount}` : "");

export function describeNotification(n: AppNotification): Described {
  const role = roleOf(n);
  const who = n.actor?.name || (role === "seller" ? "A buyer" : "The seller");
  const what = n.item?.title || "an item";
  const amt = money(n.amount);
  const thread: NavTarget = n.conversationId
    ? { role, conversationId: n.conversationId }
    : { role, tab: "claims" };

  switch (n.type) {
    case "CLAIM_REQUESTED":
      return { text: `${who} claimed ${what}${amt ? ` at ${amt}` : ""}`, target: thread, tone: "good" };
    case "OFFER_RECEIVED":
      return { text: `${who} offered ${amt || "a price"} for ${what}`, target: thread, tone: "info" };
    case "COUNTER_OFFER":
      return { text: `${who} countered${amt ? ` at ${amt}` : ""} on ${what}`, target: thread, tone: "info" };
    case "CLAIM_ACCEPTED":
      // The buyer's wording is the toast the buyer dashboard used to show on
      // its own; it now comes from here, once.
      return role === "buyer"
        ? { text: `Offer accepted! Your purchase of ${what} is confirmed${amt ? ` at ${amt}` : ""}.`, target: thread, tone: "good" }
        : { text: `${who} accepted ${amt ? amt + " " : ""}for ${what}`, target: thread, tone: "good" };
    case "CLAIM_DECLINED":
      return role === "buyer"
        ? { text: `${who} declined your offer on ${what}`, target: thread, tone: "bad" }
        : { text: `${who} declined your counter-offer on ${what}`, target: thread, tone: "bad" };
    case "CLAIM_CANCELLED":
      return { text: `${who} cancelled the claim on ${what}`, target: thread, tone: "bad" };
    case "OFFER_WITHDRAWN":
      return { text: `${who} withdrew their offer on ${what}`, target: thread, tone: "bad" };
    case "CLAIM_EXPIRED":
      return role === "buyer"
        ? { text: `Your offer on ${what} expired`, target: thread, tone: "bad" }
        : { text: `An offer on ${what} expired`, target: thread, tone: "bad" };
    case "PICKUP_EXTENDED":
      return { text: `${who} gave you 2 more days to pick up ${what}`, target: thread, tone: "info" };
    case "PICKED_UP":
      return { text: `${who} marked ${what} as picked up`, target: thread, tone: "good" };
    case "RECEIPT_CONFIRMED":
      return { text: `${who} confirmed they received ${what}`, target: thread, tone: "good" };
    case "QUESTION_ASKED":
      return { text: `${who} asked a question about ${what}`, target: { role: "seller", tab: "questions" }, tone: "info" };
    case "QUESTION_ANSWERED":
      return {
        text: `Seller replied to your question about ${what}`,
        target: n.item?.id ? { role: "buyer", itemId: n.item.id } : { role: "buyer", tab: "discover" },
        tone: "info",
      };
    default:
      return { text: `Update on ${what}`, target: thread, tone: "info" };
  }
}

/** Claim and pickup events pop up as toasts; questions only go in the bell. */
export function isToastWorthy(n: Pick<AppNotification, "type">): boolean {
  return !n.type.startsWith("QUESTION_");
}

/** "Buying" / "Selling", for accounts that do both. */
export const ROLE_LABEL: Record<Role, string> = { buyer: "Buying", seller: "Selling" };
