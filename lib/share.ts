// Sharing: the link formats every share menu uses (the seller's "Share to
// your network" sheet and the item share menu on cards), and an item's public
// link. Nothing here posts anything itself: each builds the URL the person's
// own app or browser opens.

/** An item's public page, with the share reference (traffic attribution). */
export function publicItemUrl(id: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" && window.location ? window.location.origin : "https://dropyard.app");
  return `${base}/item/${encodeURIComponent(id)}?ref=share`;
}

/** "Check out "Oak bookcase" · $40 on DropYard." (same wording as the buyer dashboard's cards). */
export function itemShareText(title: string, price?: number | null): string {
  const priceText = typeof price === "number" && price >= 0 ? ` · ${price === 0 ? "Free" : "$" + price}` : "";
  return `Check out "${title}"${priceText} on DropYard.`;
}

export const shareLinks = {
  whatsapp: (text: string) => "https://wa.me/?text=" + encodeURIComponent(text),
  x:        (text: string) => "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text),
  facebook: (url: string, quote?: string) => "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url) + (quote ? "&quote=" + encodeURIComponent(quote) : ""),
  email:    (subject: string, body: string) => "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body),
  sms:      (body: string) => "sms:?&body=" + encodeURIComponent(body),
};

/** A share site in a small window of its own. */
export function openShareWindow(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer,width=600,height=700");
}

/** Copies text; falls back to a hidden textarea where the clipboard API is refused. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
