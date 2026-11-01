"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { dropOpenDay, dropOpenHourLong, dropCloseDay, dropCloseHourLong } from "@/lib/dropCycle";

const LAST_UPDATED = "May 27, 2026";

const Icon = {
  Rocket: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M5 19l-2-2 4-4M9 15l-2-2 4-4M13.5 12.5L19 7l-2-2L9 13l1.5 1.5L13.5 12.5zM15 9l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="14" cy="10" r="1.5" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Cart: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 3h2l3 13h11l2-9H6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/><circle cx="9" cy="20" r="1.5" stroke="currentColor" strokeWidth="2"/><circle cx="17" cy="20" r="1.5" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Tag: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 12V4h8l10 10-8 8L3 12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="8" cy="9" r="1.5" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Dollar: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M16 7c0-2-2-3-4-3s-4 1-4 3 2 3 4 3 4 1 4 3-2 3-4 3-4-1-4-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Truck: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="6" cy="19" r="2" stroke="currentColor" strokeWidth="2"/><circle cx="18" cy="19" r="2" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  Shield: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  User: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Sparkle: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5zM19 14l1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1L19 14z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
  ),
  Search: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Plus: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
  ),
  Mail: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  Refresh: (p: any) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}><path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
};

type Category = {
  id: string;
  title: string;
  Icon: any;
  accent: "green" | "amber" | "violet" | "rose" | "sky";
  intro?: React.ReactNode;
  qs: { q: string; a: React.ReactNode }[];
};

const accentClasses: Record<string, { bg: string; text: string; ring: string; dot: string; border: string }> = {
  green:  { bg: "bg-emerald-50",  text: "text-emerald-700",  ring: "ring-emerald-200",  dot: "bg-emerald-500", border: "border-emerald-200" },
  amber:  { bg: "bg-amber-50",    text: "text-amber-700",    ring: "ring-amber-200",    dot: "bg-amber-500",   border: "border-amber-200" },
  violet: { bg: "bg-violet-50",   text: "text-violet-700",   ring: "ring-violet-200",   dot: "bg-violet-500",  border: "border-violet-200" },
  rose:   { bg: "bg-rose-50",     text: "text-rose-700",     ring: "ring-rose-200",     dot: "bg-rose-500",    border: "border-rose-200" },
  sky:    { bg: "bg-sky-50",      text: "text-sky-700",      ring: "ring-sky-200",      dot: "bg-sky-500",     border: "border-sky-200" },
};

const InfoMailLink = () => (
  <a
    href="mailto:info@dropyard.app"
    className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
  >
    info@dropyard.app
  </a>
);

const categories: Category[] = [
  {
    id: "getting-started",
    title: "Getting started",
    Icon: Icon.Rocket,
    accent: "green",
    qs: [
      {
        q: "What is DropYard?",
        a: (
          <>
            <p>
              DropYard is your neighbourhood yard sale, online. Neighbours list
              things they no longer need, other neighbours claim them, and the two
              of you arrange a quick in-person pickup — usually at the seller&apos;s
              porch or driveway.
            </p>
            <p className="mt-3">
              Money changes hands directly between you and your neighbour, in
              person.
            </p>
          </>
        ),
      },
      {
        q: "Where does DropYard work right now?",
        a: (
          <p>
            We&apos;re starting in <strong>Barrhaven, Ottawa</strong>. As we expand
            to new neighbourhoods, we&apos;ll let existing users know and update
            our website.
          </p>
        ),
      },
      {
        q: "Why do I need to enable location?",
        a: (
          <>
            <p>
              So we can confirm you&apos;re in Barrhaven. DropYard is a hyperlocal
              community, and the whole experience falls apart if listings come from
              far away — pickup wouldn&apos;t be a quick walk or drive anymore.
            </p>
            <p className="mt-3">
              We use your location to verify you&apos;re in the service area, not
              to track your movements. Other users only see your neighbourhood
              name, never your precise location.
            </p>
          </>
        ),
      },
      {
        q: "I live just outside Barrhaven. Can I still use it?",
        a: (
          <p>
            Not yet. DropYard is currently restricted to people physically located
            in Barrhaven. If you&apos;d like us to come to your neighbourhood next,
            email <InfoMailLink /> and tell us where you are — it genuinely helps
            us plan.
          </p>
        ),
      },
      {
        q: "Is DropYard free to use?",
        a: <p>Yes. Browsing, listing, claiming, and pickup are all free.</p>,
      },
      {
        q: "How old do I need to be?",
        a: (
          <p>
            <strong>18 or older.</strong> Pickups involve meeting strangers in
            person and exchanging money, which isn&apos;t appropriate for minors.
          </p>
        ),
      },
      {
        q: "How do I sign up?",
        a: (
          <p>
            You&apos;ll need an email address, a password, and to allow location
            access. Sign-up takes about a minute.
          </p>
        ),
      },
    ],
  },
  {
    id: "browsing-and-buying",
    title: "Browsing and buying",
    Icon: Icon.Cart,
    accent: "amber",
    qs: [
      {
        q: "What's the difference between the Drop and the Shelf?",
        a: (
          <>
            <p>
              <strong>The Drop</strong> is a weekly event — a flood of new listings
              that goes live at the same time, like everyone in the neighbourhood
              putting out their yard sale at once.{" "}
              <strong>The Shelf</strong> is always-on: listings that are available
              to browse and claim any time.
            </p>
            <p className="mt-3">
              If you&apos;re a buyer, the Drop is where the best variety appears at
              once; the Shelf is where you go when you want to look around
              mid-week.
            </p>
          </>
        ),
      },
      {
        q: "When does the Drop happen?",
        a: (
          <>
            <p>
              Every <strong>{dropOpenDay()} {dropOpenHourLong()} through {dropCloseDay()} {dropCloseHourLong()}</strong> —
              that&apos;s a 36-hour window where the week&apos;s new listings are
              live alongside everything already on the Shelf.
            </p>
            <p className="mt-3">
              Items that don&apos;t sell during the Drop don&apos;t disappear —
              they move to the Shelf and automatically rejoin every Drop after
              that, until they sell. <strong>Sellers never have to manually
              re-list.</strong>
            </p>
          </>
        ),
      },
      {
        q: "How do I claim an item?",
        a: (
          <p>
            Tap <strong>Claim</strong> on the listing. If the seller has set the
            item to auto-accept full-price claims, you&apos;re confirmed right
            away. Otherwise, the seller reviews and either accepts, declines, or
            sends you a counter-offer. You&apos;ll be notified by email, push, or
            WhatsApp (if you opted in).
          </p>
        ),
      },
      {
        q: "Can I negotiate the price?",
        a: (
          <p>
            Sometimes. Some listings are firm; others invite offers. If you&apos;d
            like to offer less, send the seller a counter — politely. They can
            accept, decline, or send their own counter back.
          </p>
        ),
      },
      {
        q: "I claimed an item by mistake — can I cancel?",
        a: (
          <p>
            Yes, as soon as possible. The faster you cancel, the easier it is for
            the seller to find another buyer. Repeated cancellations may affect
            your standing on DropYard.
          </p>
        ),
      },
      {
        q: "What happens after I claim something?",
        a: (
          <p>
            You and the seller exchange the details you need for pickup — pickup
            address, agreed time, and payment method. Confirm before you head
            over, bring the payment you agreed on, and inspect the item before you
            pay.
          </p>
        ),
      },
    ],
  },
  {
    id: "listing-and-selling",
    title: "Listing and selling",
    Icon: Icon.Tag,
    accent: "violet",
    qs: [
      {
        q: "How do I list an item?",
        a: (
          <p>
            In your seller dashboard, tap <strong>Add item</strong>. Add a few
            clear photos (taken by you, of the actual item), a real description,
            dimensions if relevant, a price, the payment methods you accept, and
            your pickup windows. You&apos;ll choose whether to queue the listing
            for the next Drop or list it now on the Shelf.
          </p>
        ),
      },
      {
        q: "Should I put my item in the Drop or on the Shelf?",
        a: (
          <>
            <p>It mostly comes down to when you want your item to first appear.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                  Choose the Drop
                </p>
                <p className="mt-2 text-[13px] text-slate-700">
                  If you want your item to debut Saturday morning alongside the
                  rest of the week&apos;s new listings — the equivalent of saving
                  it up for the big yard sale day. Won&apos;t be visible until
                  {" "}{dropOpenHourLong()} {dropOpenDay()}.
                </p>
              </div>
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50/60 p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-amber-700">
                  Choose the Shelf
                </p>
                <p className="mt-2 text-[13px] text-slate-700">
                  If you want your item visible right away. Shelf items are
                  claimable any time, and they automatically join every Drop until
                  they sell, so you don&apos;t give up visibility by listing now.
                </p>
              </div>
            </div>
            <p className="mt-4">
              Either way, unsold items keep cycling through future Drops with no
              action from you. <strong>You can list confidently and forget about
              it.</strong>
            </p>
          </>
        ),
      },
      {
        q: "How long does my listing stay up?",
        a: (
          <p>
            Until it sells or you take it down. Items remain on the Shelf
            indefinitely, automatically rejoining every Drop. If interest has
            cooled, refreshing the photo or lowering the price usually gets a new
            round of attention.
          </p>
        ),
      },
      {
        q: "Can I edit my listing after I post it?",
        a: (
          <p>
            Yes — title, description, photos, and price are all editable. Edits to
            the price during an active claim aren&apos;t allowed, since that&apos;s
            the buyer&apos;s agreed price.
          </p>
        ),
      },
      {
        q: "How do I set a good price?",
        a: (
          <p>
            Look at what similar items have sold for recently on DropYard, or what
            they cost new minus reasonable depreciation. Sellers who price
            honestly and slightly below comparable listings tend to sell faster.
            You can always lower your price; raising it after listing tends to
            lose buyers&apos; trust.
          </p>
        ),
      },
      {
        q: "What if no one claims my item?",
        a: (
          <>
            <p>It happens. Try one of these:</p>
            <ul className="mt-3 space-y-2 pl-1">
              {[
                "Lower the price — even a small drop often gets a new round of interest",
                "Improve the photos — daytime light and a clean background help",
                "Rewrite the description — what would you want to know if you were buying it?",
                "Move it to the next Drop — Saturday traffic is much higher than mid-week",
              ].map((i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-500" />
                  {i}
                </li>
              ))}
            </ul>
          </>
        ),
      },
      {
        q: "The buyer who claimed my item never showed up. What now?",
        a: (
          <p>
            You can re-list it right away. If you&apos;d rather not deal with it
            manually, DropYard will <strong>automatically re-list abandoned
            claims after 2 hours</strong>, so your item gets back in front of
            buyers quickly. You can also report the buyer who no-showed, which
            helps us keep the community accountable.
          </p>
        ),
      },
    ],
  },
  {
    id: "payments",
    title: "Payments",
    Icon: Icon.Dollar,
    accent: "green",
    qs: [
      {
        q: "How do payments work?",
        a: (
          <>
            <p>
              <strong>Buyer pays seller directly at pickup.</strong> DropYard
              doesn&apos;t process, hold, or touch the money.
            </p>
            <p className="mt-3">
              The two payment methods DropYard supports are <strong>cash</strong>{" "}
              and <strong>Interac e-Transfer</strong> — buyers and sellers agree
              on which to use when arranging pickup.
            </p>
          </>
        ),
      },
      {
        q: "Why doesn't DropYard handle the money?",
        a: (
          <p>
            Because keeping DropYard simple is the whole point. We&apos;re a yard
            sale, not a payment processor — and not holding money means no
            platform fees, no chargebacks, no waiting periods, and no card details
            flowing through our systems. The trade-off is that you and your
            neighbour resolve any payment issues directly.
          </p>
        ),
      },
      {
        q: "Which payment methods can I accept?",
        a: (
          <>
            <p>DropYard supports two:</p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2 text-[13px] text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                <span><strong>Cash</strong> — most common for in-person pickup</span>
              </li>
              <li className="flex items-start gap-2 text-[13px] text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                <span><strong>Interac e-Transfer</strong> — free in Canada, settles in minutes</span>
              </li>
            </ul>
            <p className="mt-3">
              You can accept either, or both. Buyers see which methods you accept
              on each listing.
            </p>
          </>
        ),
      },
      {
        q: "Is it safe to accept Interac e-Transfer?",
        a: (
          <p>
            Yes, with one habit: <strong>wait for the deposit confirmation
            before handing over the item.</strong> Confirm the sender&apos;s email
            or phone matches the buyer&apos;s name, and use a security question
            only the two of you would know. If anything feels off, ask for cash
            instead.
          </p>
        ),
      },
      {
        q: "Do I have to pay tax on what I sell?",
        a: (
          <p>
            We don&apos;t give tax advice, but generally: occasional sales of your
            own used personal belongings aren&apos;t taxable income in Canada. If
            you&apos;re selling regularly enough that it looks like a business —
            many items each month, brand-new stock, etc. — the Canada Revenue
            Agency may treat it differently. When in doubt, ask an accountant.
          </p>
        ),
      },
    ],
  },
  {
    id: "pickup",
    title: "Pickup",
    Icon: Icon.Truck,
    accent: "sky",
    qs: [
      {
        q: "Where does pickup happen?",
        a: (
          <p>
            At the seller&apos;s address, which you exchange after the claim is
            confirmed. Most pickups happen at the <strong>porch or driveway</strong>{" "}
            — no one is expected to invite anyone inside their home.
          </p>
        ),
      },
      {
        q: "Do I have to invite the buyer into my home?",
        a: (
          <p>
            <strong>No.</strong> Porch or driveway pickup is the default. If the
            item needs help carrying out, agree on that in advance. If a buyer
            pressures you to let them inside, you don&apos;t have to.
          </p>
        ),
      },
      {
        q: "Can I send a friend or family member to pick up for me?",
        a: (
          <p>
            Yes, with a quick heads-up to the seller. Just let them know
            who&apos;s coming and when. The person picking up still represents you
            on DropYard, so brief them on the basics: payment ready, inspect
            before paying, be polite.
          </p>
        ),
      },
      {
        q: "What if the item isn't what I expected?",
        a: (
          <p>
            Inspect it before you pay — that&apos;s when issues are easiest to
            resolve. If something&apos;s off, talk to the seller right there: a
            smaller price, a refund offer, or walking away are all options. Once
            cash has changed hands or an e-Transfer has been accepted, refunds
            depend entirely on the seller&apos;s goodwill, since DropYard
            doesn&apos;t hold the money.
          </p>
        ),
      },
    ],
  },
  {
    id: "safety",
    title: "Safety and reporting",
    Icon: Icon.Shield,
    accent: "rose",
    qs: [
      {
        q: "Is DropYard safe?",
        a: (
          <p>
            It&apos;s as safe as any in-person exchange between neighbours — which
            is to say, very safe if you follow a few sensible habits: daytime
            pickups, porch or driveway by default, inspect before you pay, bring a
            friend if you&apos;d like, and trust your instincts.{" "}
            <strong>If anything feels wrong, walk away.</strong>
          </p>
        ),
      },
      {
        q: "How do I report a problem?",
        a: (
          <>
            <p>Three options:</p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2 text-[13px] text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-500" />
                <span><strong>In-app Report button</strong> on the listing, profile, or message thread</span>
              </li>
              <li className="flex items-start gap-2 text-[13px] text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-500" />
                <span>Email <InfoMailLink /> with as much detail as you can</span>
              </li>
              <li className="flex items-start gap-2 text-[13px] text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-500" />
                <span><strong>9-1-1</strong> for safety emergencies. Always first, before anything else.</span>
              </li>
            </ul>
            <p className="mt-3 text-[13px] text-slate-600">You can report anonymously.</p>
          </>
        ),
      },
      {
        q: "What can DropYard actually do if something goes wrong?",
        a: (
          <p>
            We can review the listing, the conversation, and both accounts, and we
            can take action on the offending account — warnings, temporary
            suspension, or a permanent ban. What we <strong>can&apos;t</strong> do
            is issue refunds or compel payment, because no money flows through
            DropYard. For anything criminal — theft, fraud, threats — please go to
            the Ottawa Police Service first, and let us know so we can support any
            investigation.
          </p>
        ),
      },
      {
        q: "Someone is trying to deal with me off-platform. What should I do?",
        a: (
          <p>
            Politely decline and stay on DropYard for the listing and the pickup
            arrangement. Deals that move off-platform lose the protections of
            these Guidelines, and we can&apos;t help if something goes wrong.
            (Coordinating the pickup itself via DropYard&apos;s opt-in WhatsApp is
            fine — that&apos;s what it&apos;s there for.)
          </p>
        ),
      },
    ],
  },
  {
    id: "account-data-privacy",
    title: "Account, data, and privacy",
    Icon: Icon.User,
    accent: "violet",
    qs: [
      {
        q: "How does DropYard use my data?",
        a: (
          <p>
            We collect the minimum we need to run the marketplace — your account
            info, your listings, your messages, and your location (used only to
            confirm you&apos;re in the service area).{" "}
            <strong>We don&apos;t sell your data, and we don&apos;t share it with
            advertisers.</strong> Full details are in our{" "}
            <Link
              href="/privacy-policy"
              className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
            >
              Privacy Policy
            </Link>
            .
          </p>
        ),
      },
      {
        q: "How do I delete my account?",
        a: (
          <p>
            Email <InfoMailLink /> and ask us to close it. We&apos;ll delete your
            personal information within <strong>30 days</strong>, except for the
            small set of records we&apos;re required by law to keep.
          </p>
        ),
      },
      {
        q: "Can I have more than one account?",
        a: (
          <p>
            <strong>One account per person.</strong> Households can share an
            account. Creating extra accounts to evade a suspension or limit
            isn&apos;t allowed and is grounds for a permanent ban.
          </p>
        ),
      },
      {
        q: "Can I change my neighbourhood later?",
        a: (
          <p>
            If you move within Barrhaven, update your address in{" "}
            <strong>Settings → Pickup</strong>. If you move outside Barrhaven, you
            won&apos;t be able to use DropYard until we expand to your new
            neighbourhood — tell us where you&apos;ve gone at <InfoMailLink />.
          </p>
        ),
      },
    ],
  },
  {
    id: "whats-coming",
    title: "What's coming",
    Icon: Icon.Sparkle,
    accent: "amber",
    qs: [
      {
        q: "When will DropYard expand to my neighbourhood?",
        a: (
          <p>
            Barrhaven first, then outward across Ottawa, then beyond. The more
            people who tell us where they&apos;d like DropYard next, the better we
            can plan. Email <InfoMailLink /> with your neighbourhood.
          </p>
        ),
      },
      {
        q: "Will there be tools to help me list items faster?",
        a: (
          <p>
            Yes — we&apos;re working on an <strong>AI Seller Agent</strong> that
            can help you write descriptions from photos, answer common buyer
            questions on your behalf, and negotiate within rules you set.
            We&apos;ll announce it when it&apos;s ready.
          </p>
        ),
      },
    ],
  },
];

function plainText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plainText).join(" ");
  if (typeof node === "object" && "props" in (node as any)) {
    return plainText((node as any).props.children);
  }
  return "";
}

export default function FAQPage() {
  const [activeCat, setActiveCat] = useState(categories[0].id);
  const [progress, setProgress] = useState(0);
  const [query, setQuery] = useState("");

  // progress bar
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveCat(e.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    categories.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((c) => ({
        ...c,
        qs: c.qs.filter(
          (it) =>
            it.q.toLowerCase().includes(q) ||
            plainText(it.a).toLowerCase().includes(q)
        ),
      }))
      .filter((c) => c.qs.length > 0);
  }, [query]);

  const totalQs = categories.reduce((sum, c) => sum + c.qs.length, 0);

  return (
    <main className="min-h-screen bg-dy-pale">
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-dy-green-strong via-[#3A8E31] to-dy-orange transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-emerald-100 bg-gradient-to-br from-dy-forest via-dy-mid to-dy-green-strong px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-300/25 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100 backdrop-blur ring-1 ring-white/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            {totalQs} answers
          </div>

          <h1 className="mt-6 text-[35px] font-semibold tracking-tight text-white sm:text-[47px] lg:text-[59px]">
            Frequently asked{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-amber-300 to-amber-200 bg-clip-text text-transparent">
                questions
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-3 rounded bg-amber-400/20 blur-lg" />
            </span>
          </h1>

          <p className="mt-6 text-[17px] leading-relaxed text-emerald-100/95 sm:text-[19px] max-w-2xl mx-auto">
            A quick guide to how DropYard works, what to expect, and what to do
            when something feels off.
          </p>

          {/* Search bar */}
          <div className="relative mt-8 mx-auto max-w-xl">
            <Icon.Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions..."
              className="w-full rounded-full bg-white pl-12 pr-12 py-3.5 text-[13px] text-slate-700 shadow-lg ring-1 ring-white/20 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <p className="mt-4 text-[11px] text-emerald-100/80">
            Last updated: <span className="font-bold text-white">{LAST_UPDATED}</span>
          </p>
        </div>

        <svg
          className="absolute bottom-0 left-0 right-0 w-full text-dy-pale"
          viewBox="0 0 1440 60"
          fill="currentColor"
          preserveAspectRatio="none"
        >
          <path d="M0 30 Q360 60 720 30 T1440 30 V60 H0 Z" />
        </svg>
      </section>

      {/* CATEGORY CHIP BAR */}
      <section className="px-4 mt-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-white p-3 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-slate-100">
          {categories.map((c) => {
            const C = accentClasses[c.accent];
            const isActive = activeCat === c.id;
            return (
              <a
                key={c.id}
                href={`#${c.id}`}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold transition-all ${
                  isActive
                    ? `${C.bg} ${C.text} ring-2 ${C.ring}`
                    : "text-slate-500 hover:bg-slate-50 hover:text-dy-forest"
                }`}
              >
                <c.Icon className="h-3.5 w-3.5" />
                {c.title}
              </a>
            );
          })}
        </div>
      </section>

      {/* BODY */}
      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-12">
          {filtered.length === 0 && (
            <div className="rounded-3xl bg-white p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Icon.Search className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-[17px] font-bold text-dy-forest">
                No matches for &ldquo;{query}&rdquo;
              </h3>
              <p className="mt-2 text-[13px] text-slate-500">
                Try a shorter keyword, or email <InfoMailLink /> and a real person
                will help.
              </p>
            </div>
          )}

          {filtered.map((cat) => {
            const C = accentClasses[cat.accent];
            const CatIcon = cat.Icon;
            return (
              <div key={cat.id} id={cat.id} className="scroll-mt-28">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ring-4 ${C.bg} ${C.text} ${C.ring}`}>
                    <CatIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${C.text}`}>
                      {cat.qs.length} {cat.qs.length === 1 ? "question" : "questions"}
                    </p>
                    <h2 className="text-[23px] font-semibold tracking-tight text-dy-forest sm:text-[29px]">
                      {cat.title}
                    </h2>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {cat.qs.map((qa, i) => (
                    <FAQItem
                      key={i}
                      q={qa.q}
                      a={qa.a}
                      accent={cat.accent}
                      defaultOpen={!!query}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Bottom contact CTA */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-dy-forest via-dy-mid to-dy-green-strong p-10 text-center text-white shadow-xl">
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-amber-300/20 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />
            <div className="relative">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/20">
                <Icon.Mail className="h-6 w-6 text-white" />
              </div>
              <h3 className="mt-5 text-[23px] font-black tracking-tight sm:text-[29px]">
                Still have a question?
              </h3>
              <p className="mt-3 text-emerald-100">
                A real person reads every message. We&apos;ll help.
              </p>
              <a
                href="mailto:info@dropyard.app"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13px] font-semibold text-dy-forest transition hover:bg-amber-100 hover:shadow-lg hover:-translate-y-0.5"
              >
                <Icon.Mail className="h-4 w-4" />
                info@dropyard.app
              </a>
              <p className="mt-6 text-[11px] text-emerald-100/80">
                These FAQs work alongside our{" "}
                <Link
                  href="/privacy-policy"
                  className="underline underline-offset-4 hover:text-white"
                >
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link
                  href="/community-guidelines"
                  className="underline underline-offset-4 hover:text-white"
                >
                  Community Guidelines
                </Link>
                .
              </p>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}

function FAQItem({
  q,
  a,
  accent,
  defaultOpen = false,
}: {
  q: string;
  a: React.ReactNode;
  accent: "green" | "amber" | "violet" | "rose" | "sky";
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const C = accentClasses[accent];

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  return (
    <div
      className={`group rounded-2xl border bg-white transition-all ${
        open
          ? `${C.border} shadow-md`
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
        aria-expanded={open}
      >
        <span className="text-[15px] font-semibold text-dy-forest sm:text-[17px]">
          {q}
        </span>
        <span
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all ${
            open ? `${C.bg} ${C.text} rotate-45` : "bg-slate-100 text-slate-500"
          }`}
        >
          <Icon.Plus className="h-4 w-4" />
        </span>
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${
          open
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-5 py-5 text-slate-700 leading-relaxed">
            {a}
          </div>
        </div>
      </div>
    </div>
  );
}
