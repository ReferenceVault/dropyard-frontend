# DropYard Bug Log

**One row per discovered defect.** Add new rows at the top so the most recent stays visible. Close bugs in-place — don't delete them; the history is useful when a regression returns.

## Severity definitions

| Severity | Definition | Examples |
|---|---|---|
| **P0** | Blocks deploy or causes data loss / security breach | Login broken, payment data leaks, items deleted on edit |
| **P1** | Blocks a primary user flow; no workaround | Can't post item, can't claim, claim status doesn't update |
| **P2** | User-visible defect with a workaround | Wrong count on Overview, mobile layout broken at 360px |
| **P3** | Polish / minor visual / non-blocking | Tooltip wording odd, spacing off by 2px, console warning |

## Status definitions

- **Open** — observed and reproducible, not yet picked up
- **In Progress** — fix being written
- **Fixed (verify)** — fix committed, awaiting re-test
- **Closed** — re-tested and verified gone
- **Won't Fix** — accepted as known limitation, document why

---

## Open bugs (P0/P1 first)

### BUG-091  ·  P1  ·  In-chat offer accept creates `CONFIRMED` claims the rest of the app can't see  ·  Status: Open
**Title:** `POST /api/conversations/messages/:id/accept` writes `status: 'CONFIRMED'`, but every other surface reads `ACCEPTED`.
**Found by:** Investigation of BUG-090 · **Found date:** 2026-08-14
**Issue:** The unified claim lifecycle (BUG-055) uses `PROPOSED → ACCEPTED → PICKED_UP`. The in-chat offer-accept path ([routes/conversations.ts](dropyard_backend/src/routes/conversations.ts) ~line 537) instead creates the claim with `status: 'CONFIRMED'` and sets the item to `CLAIMED` rather than `RESERVED`.

Consequences:
  1. `GET /api/claims/incoming?status=ACCEPTED` — used by **PickupsView**, the Overview "scheduled pickups" stat, and the Orders tab — will **not** return these claims. A sale agreed through the in-chat Accept button never appears in Scheduled pickups.
  2. `CONFIRMED` isn't even in `/incoming`'s `allowed` list (claims.ts:159), so it can't be queried explicitly — requesting it returns 400.
  3. That path also skips the first-come-first-serve guard used by `POST /api/items/:id/claim` (no check for an existing PROPOSED/ACCEPTED claim, no check that the item is still LIVE), so it can stack a second live claim onto an item that already has one. This is the most likely way to end up with two live claims on one item.

**Not reproduced against a live flow yet** — the dev DB currently holds only one claim (PICKED_UP), so no orphaned `CONFIRMED` rows exist to point at. Confirmed by reading the route and the `/incoming` allow-list.
**Suggested fix:** use `ACCEPTED` + `RESERVED` in the accept path so it matches the lifecycle, add the same existing-claim guard as the items route, and decide whether `CONFIRMED` is a legacy value needing a data migration.



## P2 — Fixed this session

### BUG-103  ·  P2  ·  Seller → Inventory → Orders tab badge  ·  Status: Fixed (verify)
**Title:** The Orders tab badge reads "4 ·" with zero pending claims and zero pickups.
**Found by:** Narveer · **Found date:** 2026-10-17 · **Test case:** exploratory
**Repro steps:** Sign in as a seller with no claims → Inventory → Orders.
**Expected:** The badge matches what the page shows — nothing, when there is nothing.
**Actual:** "4" with the urgent dot, sitting directly above "No claims to review".
**Environment:** Chrome, 1280px, local dev
**Fix commit:** _(local, oct17DropF)_
**Re-tested:** Parse + lint clean (82 pre-existing problems before and after — no new ones). Browser pass pending.
**Notes:** `OrdersView` held `const scheduledCount = 4; const todayCount = 1;` — Phase B placeholders that were never replaced when claims went live, passed straight into the badge.

The deeper problem was that `ordersCount` was a **prop**, and each of the four parents meant something different by it: `MyItemsView` sent scheduled pickups, `ClaimsView` sent pending claims, `PickupsView` sent its own list length, `OrdersView` sent the constant. The same tab row showed a different number depending on which view you were standing in.

Fix: `InventoryTabs` now owns the count, exactly as it already did for the Questions badge ("fetched here so the count is identical on every inventory tab"). It requests `?status=PROPOSED` and `?status=ACCEPTED` — the two sections `OrdersView` actually renders — and badges `pending + pickups`, with urgent = pending claims + pickups due today. `claim:new` / `claim:updated` sockets refresh it. The `ordersCount` / `ordersUrgent` props are gone from all four call sites, so the counts cannot drift apart again, and `MyItemsView`'s now-duplicate pickups fetch was removed with them.

A failed request leaves the last known count in place rather than falling back to 0 — a badge that silently drops to zero on a network blip hides work the seller has to do.

### BUG-102  ·  P3  ·  Seller Inventory → page header + Drop strip  ·  Status: Fixed (verify)
**Title:** Decorative sparkle / dot-cluster ornaments make the product look AI-generated.
**Found by:** Narveer · **Found date:** 2026-10-17 · **Test case:** exploratory
**Repro steps:** Sign in as a seller → Inventory → My items.
**Expected:** No ornamental glyphs that read as an AI watermark.
**Actual:** A ✨ Sparkles tile anchors the "Drop is live now" strip, and a three-dot amber/green/claret cluster floats in the top-right of the page header.
**Environment:** Chrome, 1280px, local dev
**Fix commit:** _(local, oct17DropF)_
**Re-tested:** Parse + lint clean (149 pre-existing problems before and after — no new ones). Browser pass pending.
**Notes:** Both are pure decoration; nothing reads state from either.
  - **Sparkles tile** — removed for *both* Drop phases, not just the live one. The tile also held a Calendar glyph between Drops, which is harmless on its own, but keeping it would make the band grow and lose an icon as the cycle turns over. The pulsing green dot next to the headline already signals the live state. `Sparkles` and `Calendar` are still imported and used elsewhere (25 and 13 other call sites) — genuine AI surfaces keep theirs.
  - **Three-dot cluster** — the same motif appears in six page headers, so removing only the reported one would have left it on five other pages. Removed from all: seller Inventory, Messages, History, Settings, and buyer item-detail + Settings.

### BUG-101  ·  P2  ·  Seller → List New Item → "List Another Item"  ·  Status: Fixed (verify)
**Title:** "List Another Item" reopens the form still filled with the listing that was just published.
**Found by:** Narveer · **Found date:** 2026-10-17 · **Test case:** exploratory
**Repro steps:**
1. Sign in as a seller, List New Item, fill it in and publish
2. On the "Published to Drop!" screen, click "List Another Item"
**Expected:** A blank form.
**Actual:** Every field — title, description, category, condition, price, photos, pickup dates, payment, bundle lines — is still populated from the previous item and has to be cleared by hand.
**Environment:** Chrome, 1280px, local dev
**Fix commit:** _(local, oct17DropF)_
**Re-tested:** Parse clean. Browser pass pending.
**Notes:** The success screen is an early return inside `ManualItemForm`, not a separate component, so publishing never unmounts the form. The button was `onClick={() => setSaved(null)}` — it dismissed the confirmation and revealed the form with all ~19 state values still sitting there.

Fix: `resetForm()` restores every field to its initial value and then clears `saved`. Kept as an explicit list rather than a state object so it stays next to the `useState` initialisers it has to mirror.

**Second entry point, same root, fixed with it:** the sidebar / mobile-nav "+ List New Item" CTA calls `safeNav("add-manual")`. Pressing it while already on the form — which is exactly where the seller is after publishing — is `setView` to the value it already has: no state change, no remount, so the stale success screen just stays put and the button reads as dead. The dashboard now keeps a `listFormNonce` that every listing entry point bumps, used as `key` on `ManualItemForm`, so any route into "List New Item" mounts a fresh one.

**Numbering note:** this session's entries were first filed as BUG-097/098, but `DropYard_SellerDashboard.jsx` already cites BUG-097 for the "Enhance with AI" removal, which was never logged here. Renumbered to BUG-099/100/101; the next free number is BUG-102.

### BUG-100  ·  P2  ·  /buyer Discover → Live Drop welcome band  ·  Status: Fixed (verify)
**Title:** "89 items" in the Live Drop banner is hardcoded — it never matches what's actually on sale.
**Found by:** Narveer · **Found date:** 2026-10-17 · **Test case:** exploratory
**Repro steps:** Sign in as a buyer during a LIVE Drop → look at the hero band on Discover.
**Expected:** The count reflects the number of claimable items.
**Actual:** Always reads "89 items" (and "+89" on the avatar stack), whatever the feed holds.
**Environment:** Chrome, 1280px, local dev
**Fix commit:** _(local, oct17DropF)_
**Re-tested:** Parse clean. Browser pass pending.
**Notes:** `WelcomeBand` took no props at all — the number, and the "+89" avatar-overflow pill, were literals in the JSX. Its Between-Drops twin `AnticipationBand` already accepted `queuedCount` / `sellerNames`, so the band is now wired the same way:
  - `DiscoverPage` derives `liveItemsCount` + `liveSellerNames` from the **unfiltered** `itemsSource`. Counting the filtered grid would have made the banner follow the search box and category chips, which describe the buyer's view, not the Drop.
  - Only `status === "live"` counts. `claimed` items are already gone, and `preview` items are Sneak Peek drafts that can't be claimed yet — including either would overstate what's available.
  - The "+N" pill now counts **neighbours** past the five avatars (`sellerNames.length - 5`). The old "+89" was the item count repeated in a slot that means something else; it renders only when there is an overflow.
  - Avatars come from the real seller names; a real-but-empty array beats the demo names, so an empty Drop no longer shows five invented neighbours.
  - Zero state gets its own copy ("Nothing is claimable in this Drop right now…") instead of "0 items", and when no count is passed the sentence simply drops the number.

**Still hardcoded in the same band, not in scope here:** the neighbourhood name ("Barrhaven") and the "Sunday at 6 PM" cutoff in the body copy — the countdown panel beside it already computes the real close time via `dropCloseMoment`.

### BUG-099  ·  P2  ·  /buyer seller profile → "Back"  ·  Status: Fixed (verify)
**Title:** Back on a seller's profile drops the buyer onto the Discover dashboard instead of the item they came from.
**Found by:** Narveer · **Found date:** 2026-10-17 · **Test case:** exploratory
**Repro steps:**
1. Sign in as a buyer, open any item on /buyer
2. Click "View profile" on the seller card
3. Click "Back" on the seller profile
**Expected:** Returns to the item detail that was open.
**Actual:** Returns to the buyer dashboard (Discover), losing the item.
**Environment:** Chrome, 1280px, local dev
**Fix commit:** _(local, July3DropF)_
**Re-tested:** Browser pass pending.
**Notes:** Fallout from the [[BUG-080]] precedence fix. `viewingItem` outranks `viewingSellerName`, so `onViewSeller` has to clear `viewingItem` for the profile to render at all — and that discarded the only record of where the buyer came from. `onBack` was a bare `setViewingSellerName(null)`, which could then only fall through to the page underneath.

Fix: a new `sellerBackItem` state captures `viewingItem` at the moment "View profile" is pressed; profile Back restores it and clears the capture. Cleared on every deliberate navigation away (`onGoToClaims`, `onGoToMessages`, `resetNav` — i.e. the top bar and the mobile bottom nav), so a tab switch never resurrects a stale item on a later Back.

Nav stack now unwinds in both directions: Discover → item → profile → Back → item → Back → Discover, and the BUG-080 direction (Discover → profile → item → Back → profile → Back → Discover) is unchanged, since a profile reached from Discover has no captured item.

### BUG-096  ·  P2  ·  Seller Overview → "Needs your attention" / hero counts  ·  Status: Fixed (verify)
**Title:** A listing queued for the Drop is reported as "1 draft unfinished", and doesn't count toward the queued total.
**Found by:** Narveer · **Found date:** 2026-08-15 · **Test case:** exploratory (round 2, item #3)
**Repro steps:** Queue an item for the next Drop → open seller Overview.
**Expected:** Counted as queued for the Drop; no draft warning.
**Actual:** "1 draft unfinished" under Needs your attention; queued count stays 0.
**Environment:** Chrome, 1280px, local dev
**Fix commit:** _(local, July3DropF)_
**Re-tested:** Lint/parse clean, app serves. Browser pass pending — see caveat.
**Notes:** Same root as [[BUG-093]], different surface. `Overview` derives its own counts from `sellerItems` and predates `queuedAt`:
  - `draftsCount` counted **every** `status === "DRAFT"`, and a queued item *is* DRAFT until the Drop opens — so it was reported as an unfinished draft.
  - `queuedCount` required `status === "LIVE"`, which a queued item only becomes when the Drop opens — so it counted 0 for exactly the items it was meant to count.
Both now key off `queuedAt`: `isQueuedForDrop = status === "DRAFT" && !!queuedAt`; queued counts LIVE-or-queued in the DROP pool, drafts count DRAFT **without** `queuedAt`. The Inventory tab counts and row pills already route through `lifecycleOf`, fixed under BUG-093.

**Caveat — could not reproduce against data.** The item in the report ("Kid's Bike") does not exist in this dev database; only two June items do. So the screenshots come from a different environment. Two things must be true there for the fix to show: the **backend must be restarted** (otherwise `publish` is ignored and `queuedAt` is never set), and **both `queuedAt` migrations must have run** (`add_item_queued_at`, `backfill_item_queued_at`). An item created before those will have `queuedAt = NULL` and legitimately still reads as a draft unless the backfill stamped it.

**Self-inflicted defect caught and fixed in the same pass:** the BUG-095 error-message insertion nested a JSX expression inside another (`{cond && ( {expr} )}`) in all three pickup forms, which is a hard parse error — the seller dashboard would not have compiled. Repaired, and restructured while fixing: the error now renders independently of the date list instead of only when the list is empty, so it stays visible once a seller has already added a date.

### BUG-095  ·  P2  ·  Listing + Edit forms → Pickup availability → Specific dates  ·  Status: Fixed (verify)
**Title:** Pick-up dates in the past are accepted with no warning.
**Found by:** Narveer · **Found date:** 2026-08-15 · **Test case:** exploratory (round 2, item #2)
**Repro steps:** List or edit an item → Pickup availability → Specific dates → enter a date months in the past → Add → Save.
**Expected:** Blocked with a clear message.
**Actual:** Accepted and stored silently.
**Environment:** Chrome, 1280px, local dev
**Fix commit:** _(local, July3DropB + July3DropF)_
**Re-tested:** Automated e2e over create + edit paths — 8/8.
**Notes:** Nothing validated the date on either side. Fixed in three layers, because the field appears in **three** separate forms (`AISetup`, `ManualItemForm`, `EditItemView`), each with its own copy of the state and handler:
  1. `min={todayLocalISO()}` on every date input — blocks the calendar picker.
  2. A guard in each `addPickupDate()` with an inline red message, since a typed or pasted value bypasses `min`.
  3. Server-side validation, because the client is bypassable and the API is the real contract.

Two details worth keeping:
  - **Local date, not `toISOString()`.** `toISOString()` converts to UTC first, so for Ottawa (UTC-4/-5) it reports the *next* day for part of every evening — which would have let sellers pick yesterday. Both the helper and the server build `YYYY-MM-DD` from local calendar parts and compare **as strings**; lexicographic comparison of zero-padded ISO dates is exact and dodges `new Date('2026-06-15')` parsing as UTC midnight.
  - **Today is allowed** — listing something for pickup later the same day is legitimate.

**Create vs edit differ deliberately.** Create rejects any past date outright. Edit rejects only dates that are past **and not already stored**: the edit form round-trips the whole array on every save, so a blanket rule would have locked sellers out of editing *any* older listing whose dates had since passed — an invisible dead-end, since the error would surface on Save with no obvious link to the date chips. The PATCH route diffs against `existing.pickupCustomDates` and names the offending dates in the error.

Verified: past rejected on create; today accepted; future accepted; a mixed batch rejected if any entry is past; re-saving an existing past date succeeds and the edit applies; adding a new past date is rejected and names it; cleaning up to future-only succeeds.

### BUG-094  ·  P3  ·  Listing form → Payment method notice  ·  Status: Fixed (verify)
**Title:** "You haven't set a default payment method" shows even for sellers who have set one.
**Found by:** Narveer · **Found date:** 2026-08-15 · **Test case:** exploratory (round 2, item #1)
**Repro steps:** Set a default in Settings → Payments, then start a new listing and look at the Payment method section.
**Expected:** Either no notice, or wording that's true either way.
**Actual:** Asserts you haven't set one.
**Environment:** Chrome, 1280px, local dev
**Fix commit:** _(local, July3DropF)_
**Re-tested:** Lint clean; browser pass pending.
**Notes:** The notice was gated on `!aiSettings.paymentMethod`. `aiSettings` is `useState({})` at the seller-dashboard root and is written **only** by the AI Setup wizard (`onSave={setAiSettings}`) — never hydrated from the user profile. So the gate was true for everyone who hadn't run that wizard, regardless of their real settings, and would have wrongly *hidden* the notice for anyone who had.

The seller's actual default lives on `user.acceptedPaymentMethods`, persisted via `PATCH /api/auth/me/preferences`. Pointing the gate at that doesn't help either: the column carries a schema default of `["CASH","ETRANSFER"]`, so every account has one from signup and "never set it" is indistinguishable from "deliberately chose both". There is no dependable signal to gate on without a new field.

Fix (as requested): drop the meaningless gate, show the notice always, and phrase it conditionally so it's accurate for both groups — *"If you haven't set a default payment method, set your default so it applies to every listing."* Link text lowercased to read correctly mid-sentence.

**Also reported in the same item:** "Set your default" redirecting to Inventory — already fixed under **BUG-083** earlier this session (`onGoToSettings("payments")`, verified wired at both `ManualItemForm` mounts). The screenshot predates that fix; it still shows the hardcoded "90+ other sellers" replaced by BUG-084.

### BUG-093  ·  P1  ·  Listing flow → "Queue for the next Drop"  ·  Status: Fixed (verify)
**Title:** Choosing "Queue for the next Drop" produced an item labelled **Draft** that had to be published a second time.
**Found by:** Narveer · **Found date:** 2026-08-14 · **Test case:** exploratory (feedback item #22)
**Repro steps:**
1. Seller → List New Item, fill it in
2. Under "When should this go live?" pick **Queue for the next Drop**
3. Click the publish button, then open Inventory → My items
**Expected:** Status reads "Queued for Saturday's Drop"; nothing further to do.
**Actual:** Status reads **Draft**, with a **Publish** button that reopens a "Where should it go live?" chooser asking the same question again.
**Environment:** Chrome, 1280px, local dev
**Fix commit:** _(local, July3DropB + July3DropF)_
**Re-tested:** Automated e2e across all create paths, sneak-peek exposure, and Drop promotion — 9/9.
**Notes:** Root cause was a **missing data distinction**, not a display bug. `handleSubmit` sent byte-identical payloads for all three buttons — its own docstring said so: *"Backend currently treats all the same (status: DRAFT). The action only affects the success-screen copy."* So "Save as draft" and "Queue for Saturday's Drop" produced identical rows (`status: DRAFT, placement: DROP`), and `lifecycleOf` — which checked `status === "draft"` first — had nothing to tell them apart and labelled both "Draft".

Fixing the label alone was impossible without the data, and chasing it surfaced two further defects from the same root:
  1. **Private drafts were auto-published.** `promoteItemsToLive` promoted *every* DRAFT attached to the Drop, so anything "saved as a draft" went LIVE on Saturday by itself.
  2. **"Save as draft" with Shelf selected published immediately.** The backend derived status from placement alone (`SHELF → LIVE`), ignoring which button was pressed.

Fix — new nullable `Item.queuedAt`, set when a seller *commits* an item to a Drop and null for a private draft (migration `add_item_queued_at`, plus `backfill_item_queued_at` which stamps existing DRAFT-with-dropId rows so deploying this doesn't strand items that were about to go live). `POST /api/items` takes a `publish` flag (defaults **true** for back-compat with callers that don't send it):

| button | publish | result |
|---|---|---|
| Save as draft | false | DRAFT, `queuedAt` null — private, never auto-promoted, whatever the placement radio said |
| Queue for the next Drop | true | DRAFT + `queuedAt` — hidden until Saturday, then auto-promoted; shows as **Queued** |
| List now on the Shelf | true | LIVE immediately |

Also updated: `promoteItemsToLive` only promotes `queuedAt != null`; `GET /api/items/sneak-peek` filters on it too (otherwise buyers would see other people's private drafts); `PATCH /api/items/:id` stamps `queuedAt` when an item moves into the DROP pool and clears it on a move to SHELF. Frontend sends `publish`, threads `queuedAt` through `adaptItem` as `isQueued`, and `lifecycleOf` checks queued **before** the plain-draft branch.

Verified: each create path lands the right status/queuedAt; omitting `publish` preserves old behaviour; the queued item appears in Sneak Peek while the private draft does not; and a simulated Drop opening promotes the queued item while leaving the draft alone.

### BUG-092  ·  P2  ·  Seller → Edit item → Delete item  ·  Status: Fixed (verify)
**Title:** "Items can only be deleted during the Submission phase" — deletion blocked 4 days out of 7, including for unpublished drafts.
**Found by:** Narveer · **Found date:** 2026-08-14 · **Test case:** exploratory (feedback item #21)
**Repro steps:** Seller → My items → Edit an item → Delete item, on any day that isn't Mon–Wed.
**Expected:** The item is deleted.
**Actual:** 403 "Items can only be deleted during the Submission phase."
**Environment:** Chrome, 1280px, local dev (phase was PREVIEW)
**Fix commit:** _(local, July3DropB)_
**Re-tested:** Automated e2e covering every branch — 9/9, run during PREVIEW (i.e. the old gate would have blocked all of it).
**Notes:** Root cause — `DELETE /api/items/:id` gated on the Drop calendar: `if (phase !== 'SUBMISSION') return 403`. Since SUBMISSION is Mon–Wed, deletion was impossible Thu–Sun, regardless of the item. A seller couldn't remove a DRAFT they had never published.

The gate was crude but it was guarding something real, so it wasn't simply removed. `Item` cascades to **claims, conversations *and every message in them*, watchlist rows and questions** — deleting the wrong item silently destroys a buyer's active claim and both parties' chat history. The correct axis is item **state**, not the day of the week:
  - **Active claim (PROPOSED/ACCEPTED) → 409.** A buyer is mid-transaction; release or cancel is the right action, not a silent delete of their claim and thread.
  - **Completed sale (PICKED_UP) → 409.** It's a financial record both sides see in History.
  - **Everything else → allowed, in any phase.** Drafts, queued items, live-but-unclaimed items, and items whose only claims are dead (cancelled/declined/expired).

Ownership check (`403 Not your item`) unchanged.

Verified in PREVIEW phase: draft deletable; live-unclaimed deletable; active claim blocked with a message telling the seller what to do first; deletable again once released; sold item protected; non-owner still rejected.

**Note:** deletion remains genuinely destructive for allowed cases — an item with buyer conversations but no claim will take those threads with it. That's standard marketplace behaviour (the thread's subject is gone), but the seller-side confirm dialog does not currently say so. Worth a copy pass.

### BUG-090  ·  P1  ·  Seller → Inventory → Orders → Pending claims  ·  Status: Fixed (verify)
**Title:** Released / cancelled / declined / completed claims all keep showing under "Pending claims".
**Found by:** Narveer · **Found date:** 2026-08-14 · **Test case:** exploratory (feedback item #20)
**Repro steps:**
1. List an item; a buyer claims it
2. As the seller, release it back to be sold
3. Open Inventory → Orders → Pending claims
**Expected:** No pending claims — the released one is closed.
**Actual:** The released claim still listed, plus earlier claims on the item; the "Pending Claims" counter includes them all.
**Environment:** Chrome, 1280px, local dev
**Fix commit:** _(local, July3DropF)_
**Re-tested:** Automated e2e reproducing the exact release scenario — 9/9.
**Notes:** Root cause — `ClaimsView` fetched `GET /api/claims/incoming` with **no status filter**. With no `status` query param the backend builds `where = { sellerId }` and returns **every claim the seller has ever had**, in every terminal state: CANCELLED, DECLINED, EXPIRED, PICKED_UP, CONFIRMED. All rendered as "pending".

The comment directly above the fetch asserted *"Backend GET /api/claims/incoming returns only PROPOSED claims"* — an assumption the backend never honoured. Each side behaved per its own contract, so nothing ever threw. Comment corrected in place so it can't mislead again.

Fix: both fetches in `ClaimsView` (initial load + socket reload) now pass `?status=PROPOSED`. That is exactly "live negotiation" — `PATCH /:id/amount` (counter) keeps the status at PROPOSED and only flips `lastAmountBy`, so it still covers both "your turn" (Accept/Counter/Decline) and "waiting for buyer".

Verified end to end: claim → shows as pending; seller releases → CANCELLED; the **unfiltered** call still returns it (the old broken behaviour, asserted explicitly in the test) while the **filtered** call returns 0; re-claiming the relisted item yields exactly one pending claim at the new amount, not two.

Related discovery logged separately as **BUG-091** (Open) — the in-chat Accept path writes `CONFIRMED` instead of `ACCEPTED`, hiding those claims from Scheduled pickups and skipping the duplicate-claim guard. That is the likeliest route to two simultaneous live claims on one item.

### BUG-089  ·  P3  ·  Seller → My items → row actions  ·  Status: Fixed (verify)
**Title:** Share icon shown on claimed items.
**Found by:** Narveer · **Found date:** 2026-08-14 · **Test case:** exploratory (feedback item #19)
**Repro steps:** List an item → have a buyer claim it → Inventory → My items → look at the row's Actions column.
**Expected:** No Share affordance — the sale is already in flight.
**Actual:** Share icon present; sharing sends people to a listing nobody else can claim.
**Environment:** Chrome, 1280px, local dev
**Fix commit:** _(local, July3DropF)_
**Re-tested:** Pending browser pass.
**Notes:** The guard was `lc !== "draft"` (BUG-051), written before the `claimed` lifecycle existed (BUG-053). When `claimed` was added it silently inherited a Share button. Rewritten as an allow-list — `["queued","live","shelf"].includes(lc)` — so any future lifecycle must opt in rather than inherit. Checked the other `Share2` usages in the seller dashboard: both are drop-level ("Share what I'm bringing" in `LiveHero`, and the ShareSheet header), not per-item, so claimed status doesn't apply.
**Still open:** the buyer `ItemCard` computes `isClaimed` ([DropYard_BuyerDashboard.jsx:1544](dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx#L1544)) but does not gate its own share button on it — same defect, buyer side, left untouched pending a decision.

### BUG-088  ·  P2  ·  Seller → Messages → Conversations filter chips  ·  Status: Fixed (verify)
**Title:** All / Claims / Offers / Q&A filter row does nothing.
**Found by:** Narveer · **Found date:** 2026-08-14 · **Test case:** exploratory (feedback item #18)
**Repro steps:** Seller → Messages → click Claims, then Offers, then Q&A.
**Expected:** Threads filtered by type.
**Actual:** Claims and Offers always empty; Q&A always identical to All. A claim thread was counted under Q&A.
**Environment:** Chrome, 1280px, local dev
**Fix commit:** _(local, July3DropF)_
**Re-tested:** Pending browser pass.
**Notes:** The filter *logic* was fine (`conversations.filter(c => filter === "all" || c.type === filter)`). The data was not: `adaptSellerConversation` hardcodes `type: "question"` on every conversation, so Claims/Offers were structurally always 0 and Q&A always equalled All. Removed the chip row plus the now-dead `filters` / `counts` arrays and the orphaned `filter` state; empty-state copy simplified to "No threads yet."

**Note on previews:** the demo conversations used by the unauthed `/preview/seller-dashboard` *do* carry real types (claim/offer/question), so the row genuinely worked there. Removing it is right for real users but does cost the preview that affordance.
**To restore properly:** derive a real conversation type in the adapter — claim when the thread has a claim, offer when it has OFFER/COUNTER messages, else question. A breadcrumb comment saying exactly this was left at the removal site. The buyer dashboard has the identical dead row ([line 4521](dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx#L4521), same hardcoded type at line 66) — deliberately left alone pending a decision.

### BUG-087  ·  P2  ·  /buyer — both dashboards  ·  Status: Fixed (verify)
**Title:** Refreshing any tab throws you back to the default one (seller → Overview, buyer → Discover).
**Found by:** Narveer · **Found date:** 2026-08-14 · **Test case:** exploratory (feedback item #17)
**Repro steps:**
1. Go to Messages (either dashboard)
2. Refresh the page
**Expected:** Still on Messages.
**Actual:** Seller lands on Overview; buyer lands on Discover.
**Environment:** Chrome, 1280px, local dev
**Fix commit:** _(local, July3DropF)_
**Re-tested:** Routes serve 200 with and without `?tab=`; tsc + lint clean. Browser pass pending.
**Notes:** Root cause — the active tab lived only in React state (`useState("discover")` / `useState("overview")`) with no URL sync, so a reload reset it. Same class of issue as a bookmark or a shared dashboard link losing its place.

Fix: both dashboards now persist the active tab in `?tab=` and seed their initial state from it on mount. Safe to read `window` in the state initializer because `app/buyer/page.tsx` gates both dashboards behind a `mounted` flag (the hydration guard), so it never runs during SSR.

Deliberate choices:
  - **One shared `tab` param, validated per dashboard.** Each falls back to its own default if the value isn't in its allow-list. Self-healing across a role switch (`?tab=items` → buyer mode → invalid → Discover → param cleared), and because "messages"/"history" are in *both* lists, switching roles keeps you on the same tab.
  - **Transient views are never written to the URL** — seller `edit-item`, `item-detail`, `add-manual`/`add-chooser`/`add-ai`, `ai-setup`, `ai-photos`, `ai-plan`. They read in-memory state (`editingItem`, wizard step) that doesn't survive a reload, so restoring one would render an editor with nothing behind it. Refreshing mid-edit lands on the last real tab instead.
  - **`replaceState`, not `pushState`** — tab clicks shouldn't stack history entries the Back button has to chew through one at a time.
  - The default tab clears the param rather than writing `?tab=discover` / `?tab=overview`, keeping the URL clean.

Follow-on fix: BUG-085's `?item=` cleanup used `replaceState(null, "", "/buyer")`, which would have wiped the new `tab` param. It now deletes only its own keys (`item`, `ref`).

### BUG-086  ·  P0  ·  Backend socket auth — ALL real-time features  ·  Status: Fixed (verify)
**Title:** Every WebSocket handshake from a browser was rejected. No real-time updates anywhere; messages only appear after a manual refresh.
**Found by:** Narveer · **Found date:** 2026-08-14 · **Test case:** exploratory (feedback item #16)
**Repro steps:**
1. Sign in as buyer in one browser, seller in another
2. Send a message from either side
3. Watch the other window — and your own
**Expected:** Message appears live on both sides.
**Actual:** Neither side updates until the page is refreshed.
**Environment:** Chrome, local dev (and production — this shipped)
**Fix commit:** _(local, July3DropB)_
**Re-tested:** Cookie-handshake + both-party delivery verified by automated e2e (4/4 after fix; the same test failed the handshake before it). Browser pass pending.
**Notes:** Root cause is **not** in the messaging code. `src/lib/socket.ts` had `import cookie from 'cookie'`. `cookie@1.1.1` sets `__esModule: true` but ships **no default export**, so under `esModuleInterop` that compiles to `__importDefault(require('cookie'))`, which returns the module unchanged and leaves `.default` undefined. `cookie.parse(...)` therefore threw `TypeError: Cannot read properties of undefined (reading 'parse')` on **every** handshake.

That TypeError was swallowed by a `catch` written for malformed Cookie headers, so `token` stayed undefined, the handshake fell through to `handshake.auth.token` — which the browser client never sends (it relies on cookies by design) — and every connection was rejected with "Missing auth token". Silent, no logs, no client-visible error beyond the socket health dot.

Diagnosis path worth recording: the backend emit logic is correct and was proven so first — `emitToUser` fires to **both** parties (conversations.ts:386-387), and a socket client authenticating with `auth.token` received all events (6/6). Only when the test was switched to cookie-only auth — the actual browser path — did the handshake fail. Reproduced the compiled `__importDefault` behaviour directly to confirm.

Fix: named import — `import { parse as parseCookie } from 'cookie'`. The catch now also logs, since it had been hiding a hard failure with no trace.

**Scope — this is much wider than messaging.** Every socket-driven feature has been dead since commit `78346b7` ("feat: cookie auth, strict CSP, socket health dot"), which introduced this import along with the cookie migration:
  - live message delivery (both directions, including your own sent message — the composer deliberately has no optimistic append and relies on the server echo)
  - notification badges on both dashboards
  - Discover-feed refresh on `claim:new` / `claim:updated`
  - conversation-list refresh and unread clearing
  - seller claims / pickups / questions auto-refresh
**This is very likely the "serious cache issue" flagged on 2026-06-09** — stale data everywhere needing a manual refresh was the symptom; the per-list socket ticks added then were correct but could never fire.

**Not changed:** `handleSend` still doesn't optimistically append; it relies on the server echo, matching the documented "REST writes, sockets push" architecture. With the handshake fixed the echo arrives in milliseconds. Adding an optimistic append would need id reconciliation (the dedupe key is the server-assigned `message.id`), so it was left alone deliberately.

### BUG-085  ·  P1  ·  Share button (buyer + seller) → shared link  ·  Status: Fixed (verify)
**Title:** Shared item links open the marketing homepage instead of the item.
**Found by:** Narveer · **Found date:** 2026-08-14 · **Test case:** exploratory (feedback item #15)
**Repro steps:**
1. Seller → My items → click the share icon on a listing (or buyer → item card share icon)
2. Share to WhatsApp
3. Open the link from WhatsApp
**Expected:** The item's page.
**Actual:** dropyard.app homepage. The recipient has no way to find the item.
**Environment:** Chrome + WhatsApp, local dev
**Fix commit:** _(local, July3DropF)_
**Re-tested:** Route + OG tags + 404 path verified by curl. Real WhatsApp unfurl pending (needs a public URL).
**Notes:** Not a regression — a known gap carried since the share buttons shipped. The old URL was `"/?ref=share&item=<id>"`, and BUG-042's note already recorded "no public per-item page exists yet — the recipient lands on the marketing root for now". Nothing ever consumed `?item=`.

Fix — built the missing public route.
  - **`app/item/[id]/page.tsx`** — the project's first dynamic route. Deliberately a **server** component: `generateMetadata` emits Open Graph + Twitter tags, which is what WhatsApp/iMessage/Slack scrape to build a link preview. A client component could render the page, but the shared link would still unfurl as a bare URL — half the point of sharing. Works signed-out (`GET /api/items/:id` is `optionalAuth`). `cache: "no-store"` because price/availability change constantly and shared links are usually opened well after the fact. S3 photo URLs are already absolute, which is what OG scrapers require.
  - **`app/item/[id]/not-found.tsx`** — shared links outlive the items they point at, so a missing item is a normal destination, not an error. Offers Browse/Home instead of a dead end. Also covers the backend being unreachable (`fetchItem` returns null rather than throwing).
  - **Share URLs** in both dashboards now build `/item/<id>?ref=share`, keeping `ref=share` for attribution.
  - **Deep link consumed.** The page's CTA goes to `/buyer?item=<id>` — and `/buyer` now actually honours it, otherwise the CTA would be exactly the kind of dead-end this bug is about. `DropYardBuyerDashboard` gained `initialItemId` / `onInitialItemConsumed`; it fetches that single item and opens its detail view. Fetched individually rather than looked up in the feed, because the feed is paginated and filters out the viewer's own items, so a shared item is frequently absent from it. The param is stripped from the URL once consumed so refresh/Back don't reopen it. A removed or invalid id silently leaves the buyer on Discover.
  - `NEXT_PUBLIC_SITE_URL` added to `.env.example` (absolute `og:url` / canonical). Defaults to `https://dropyard.app`.

Verified: page renders 200 with correct `og:title` / `og:description` / `og:image` / `og:url`; bogus id renders the not-found page; `/buyer?item=<id>` serves 200; `tsc --noEmit` clean; lint clean on new files.

**Known gap:** `notFound()` on this route returns **HTTP 200** in dev, while a genuinely unmatched route (`/zzz-nope`) correctly returns 404. Content is right either way; the status matters for scrapers/SEO. Most likely a dev-mode streaming artifact — the response commits before `notFound()` runs, since `generateMetadata` resolved first. **Not confirmed against a production build:** running `next build` right now would write production artifacts into the same `.next` the dev server is using, which is precisely the mixed-artifact state that caused this session's opening Turbopack panic. Re-check after the next real build.

### BUG-084  ·  P2  ·  Seller → List item → "When should this go live?"  ·  Status: Fixed (verify)
**Title:** "alongside 90+ other sellers" is hardcoded — no relation to actual Drop participation.
**Found by:** Narveer · **Found date:** 2026-08-14 · **Test case:** exploratory (feedback item #14)
**Repro steps:**
1. Seller → List New Item → scroll to "When should this go live?"
2. Read the "Queue for the next Drop" description
**Expected:** A real count of sellers in the upcoming Drop.
**Actual:** Always "90+ other sellers", on a platform with far fewer.
**Environment:** Chrome, 1280px, local dev
**Fix commit:** _(local, July3DropB + July3DropF)_
**Re-tested:** Counting logic verified by automated e2e (8/8). Browser pass pending.
**Notes:** Root cause — literal string in the copy. No count existed anywhere in the API to replace it with.

Fix — backend `GET /api/drop/current` now returns real participation:
  - `sellerCount` — distinct sellers with items attached to the current Drop
  - `otherSellerCount` — the same minus the caller (route moved to `optionalAuth`), so a seller who already has items queued isn't counted among their own "other sellers". Derived from the `groupBy` rows already fetched — no extra query.
  - `itemCount` — total items in the Drop
  Counted statuses are DRAFT (queued, promoted on open) and LIVE. RESERVED/CLAIMED/SOLD are excluded — they aren't inventory a new seller is listing alongside — and ARCHIVED is gone entirely.

Frontend: `ManualItemForm` fetches the count and composes the clause. **The clause is omitted entirely when the count is 0 or hasn't loaded** — "alongside 0 other sellers" reads worse than saying nothing, and an unloaded count must never fall back to a guess. Singular/plural handled ("1 other seller").

Verified: adding a seller increments; a second item from the *same* seller does not; a second distinct seller does; SOLD items don't count; each authed viewer is excluded from their own `otherSellerCount`; anonymous callers see the full count.

**Still hardcoded** in `DropYard_SellerDashboard_final.jsx:2650` and `_v2.jsx:2651` — preview-only files that don't render at /buyer. Fix before the FINAL dashboard integration.

### BUG-083  ·  P2  ·  Seller → List item → Payment method → "Set your default"  ·  Status: Fixed (verify)
**Title:** "Set your default" link lands on the Inventory page instead of Settings → Payments.
**Found by:** Narveer · **Found date:** 2026-08-14 · **Test case:** exploratory (feedback item #13)
**Repro steps:**
1. Seller → List New Item
2. Scroll to "Payment method" — the amber "You haven't set a default payment method" notice appears
3. Click "Set your default"
**Expected:** Settings → Payments.
**Actual:** Inventory ("My items").
**Environment:** Chrome, 1280px, local dev
**Fix commit:** _(local, July3DropF)_
**Re-tested:** Pending browser pass.
**Notes:** Root cause — the link called `onGoToItems("ai-setup")`. That prop is wired at both `ManualItemForm` mounts as `onGoToItems={() => setView("items")}`, an arrow that **takes no parameter**, so the `"ai-setup"` argument was silently discarded and every click fell through to Inventory. The argument was wrong anyway: `"ai-setup"` is the AI-configuration view, not payment settings.

Fix:
  - `SettingsView` gained `initialSection` (default `null` = normal entry: Account on desktop, section list on mobile). A deep link now also drills straight in on mobile instead of dumping the user on the section list.
  - New root `goToSettings(sectionId)` helper + `settingsSection` state; `onOpenSettings` routes through it so the normal entry point resets the pane.
  - `ManualItemForm` gained a dedicated `onGoToSettings` prop; the link now calls `onGoToSettings("payments")`. `onGoToItems` is left alone — its other use (line 3469, "go to my items" after saving) is legitimate.

Two follow-on issues found and fixed while wiring:
  - The Sidebar/mobile nav reach Settings through `safeNav("settings")`, bypassing the helper — so after using the deep link once, every later visit to Settings would have reopened on Payments. `safeNav` now clears `settingsSection` on a generic Settings nav.
  - `initialSection` only seeds `useState` on mount, so arriving from the deep link while Settings was already mounted would have been ignored. `SettingsView` is now keyed on the requested pane to force a remount.

### BUG-082  ·  P1  ·  /buyer item detail → Claim modal → "Pickup window"  ·  Status: Fixed (verify)
**Title:** Claim modal offers four invented pickup times instead of the seller's actual availability.
**Found by:** Narveer · **Found date:** 2026-08-14 · **Test case:** exploratory (feedback item #12)
**Repro steps:**
1. As a seller, list an item and set Pickup availability → Specific dates (e.g. 2026-07-11, 2026-07-12) + time windows
2. As a buyer, open that item and click "Claim at $X"
3. Look at the PICKUP WINDOW section
**Expected:** The dates/windows the seller selected.
**Actual:** Always "Saturday 10:00 AM / Saturday 2:00 PM / Sunday 11:00 AM / Sunday 4:00 PM", identical on every item.
**Environment:** Chrome, 1280px, local dev
**Fix commit:** _(local, July3DropF)_
**Re-tested:** Slot-builder logic unit-verified across 9 input shapes. Browser pass pending.
**Notes:** Root cause — `ClaimModal` had `const slots = ["Saturday 10:00 AM", ...]` hardcoded and never looked at the item. **P1 rather than cosmetic:** that string is submitted as the claim's `pickupSlot`, so sellers were receiving pickup commitments for windows they never offered.

Data was fine end to end — confirmed `pickupMode` / `pickupDays` / `pickupCustomDates` / `pickupWindows` are stored, returned by `/api/items`, and carried through `toDetailItem`. The item-detail "Pickup availability" panel already rendered them correctly via `formatPickupSummary`; only the claim modal ignored them.

Fix: new `buildPickupSlots(item)` composes `day × time-window` from the listing config —
  - `custom` → each selected date, formatted "Sat, Jul 11"
  - `flexible` → each selected weekday, formatted "Saturday", in Mon→Sun order
  - `anytime`, or no days/dates selected → returns `[]`, and the modal shows "This seller didn't set fixed pickup times — you'll agree on one in chat after claiming" rather than fabricating options
  - no windows selected → treated as all three (seller is open to any)
Window labels ("9 am - 12 pm" / "12 - 4 pm" / "4 - 7 pm") mirror the seller listing form exactly (DropYard_SellerDashboard 3075-3077) — keep them in sync.

Rendering is capped at 9 buttons (a seller may list up to 60 dates → 180 combos). The remainder is surfaced as "+N more times available — ask the seller in chat" rather than being silently dropped.

Verified outputs: 2 dates × 3 windows → 6 slots; `flexible` Sat+Sun × 2 windows → 4 slots; `anytime` → by-request notice; malformed date strings filtered out; `undefined` item → by-request notice.

### BUG-081  ·  P2  ·  / (homepage) DynamicDropCard → "Enter the Live Drop"  ·  Status: Fixed (verify)
**Title:** "Enter the Live Drop" CTA feels unresponsive — click produces no visible change for seconds.
**Found by:** Narveer · **Found date:** 2026-08-14 · **Test case:** exploratory (feedback item #11)
**Repro steps:**
1. Be in a LIVE Drop phase (or set `DROP_OPEN_DAY = 5` in lib/dropCycle.ts to force it)
2. Load the homepage, find the hero Drop card (desktop only — `hidden lg:block`)
3. Click "Enter the Live Drop"
**Expected:** Immediate navigation to /buyer.
**Actual:** Nothing appears to happen.
**Environment:** Chrome, desktop, local dev
**Fix commit:** _(local, July3DropF)_
**Re-tested:** Pending browser pass — see caveat below.
**Notes:** The handler was **not** broken. Verified: `isLive` is true (the stats row renders the live-only "Items Live"/"Claimed" labels), `href` is correctly `/buyer`, the `onClick` early-returned so the browser would follow it, the `#early-access` fallback target exists, there is no overlay / `pointer-events` trap, nothing wraps the anchor, and `/buyer` serves 200 in ~80 ms (so it is not an on-demand-compile stall).

Root cause — it was a plain `<a href="/buyer">`. In the App Router that is a **full document reload**: the entire React tree is torn down and /buyer's bundle is re-fetched and re-executed before anything repaints. /buyer static-imports *both* 1.4 MB dashboards (BUG-077C), so that payload is large. During the whole round-trip the browser keeps painting the **old** page, then /buyer renders "Checking access…" while AuthContext resolves. Net effect from the user's side: click → nothing → eventual change. Reads as a dead button.

Fix: route client-side via `useRouter().push("/buyer")` instead of letting the browser follow the href, and `router.prefetch("/buyer")` once `isLive` so the route is already warm. The `href` is retained for middle-click / open-in-new-tab / right-click, and modified clicks (meta/ctrl/shift/alt, non-primary button) are explicitly not hijacked.

Also note: the prefetch effect must sit **after** `const isLive` — putting it above puts `isLive` in the temporal dead zone via the dependency array, which throws `Cannot access 'isLive' before initialization` and blanks the card. (Hit and corrected during the fix.)

**Caveat:** the exact "unresponsive" symptom could not be reproduced headlessly — no browser automation in this repo. The full-reload cost is a real, verified defect and is the strongest candidate, but if the button is still dead after this change, open DevTools → Network, click it, and check whether a document request to /buyer is issued at all. If none is, the click isn't reaching the anchor and the cause is elsewhere.

### BUG-080  ·  P1  ·  /buyer seller profile → item card  ·  Status: Fixed (verify)
**Title:** Item cards on a seller's profile don't open the item detail — the click is silently swallowed.
**Found by:** Narveer · **Found date:** 2026-08-14 · **Test case:** exploratory (feedback item #10)
**Repro steps:**
1. Sign in as a buyer, open any item on /buyer
2. Click "View profile" on the seller card
3. On the seller profile, click any item card under "Current listings"
**Expected:** The item detail page opens.
**Actual:** Nothing happens. The card has hover/cursor affordances, so it reads as broken.
**Environment:** Chrome, 1280px, local dev
**Fix commit:** _(local, July3DropF)_
**Re-tested:** Pending browser pass.
**Notes:** Root cause — render precedence, not a missing handler. `ItemCard` wires `onClick={onOpen}` and the profile passes `onOpen={() => onSelect(toDetailItem(i))}`, so `setViewingItem` **did** fire and state **did** update. But the two panels were gated as:
```jsx
{viewingSellerName && (<RegularSellerProfile .../>)}
{viewingItem && !viewingSellerName && (<ItemDetail .../>)}
```
`viewingSellerName` is still set while you're on the profile, so `ItemDetail`'s guard never passed and the profile kept rendering. A pure state update with no visual change — which is why it looks like a dead click.

Fix: `viewingItem` now outranks `viewingSellerName` (`{viewingSellerName && !viewingItem}` / `{viewingItem}`). `viewingSellerName` is deliberately left set underneath so **Back from the item returns to the seller profile**, not all the way out to Discover.

Simply flipping the precedence would have broken the opposite direction — "View profile" from an item detail, where `viewingItem` is set and would then outrank the profile being opened. So `onViewSeller` now clears `viewingItem` explicitly. `onGoToClaims` / `onGoToMessages` also clear `viewingSellerName`, otherwise leaving the item would drop the user onto the seller profile instead of the tab they asked for (latent once precedence changed).

Resulting nav stack: Discover → seller profile → item → Back → seller profile → Back → Discover.

### BUG-079  ·  P1  ·  /buyer item detail → Questions & Answers  ·  Status: Fixed (verify)
**Title:** Previous questions and answers never appear in the Q&A panel — the feature had no backend at all.
**Found by:** Narveer · **Found date:** 2026-08-14 · **Test case:** exploratory (feedback item #9)
**Repro steps:**
1. Sign in as a buyer, open any item on /buyer
2. Scroll to "Questions & Answers"
3. Click "Ask a question", submit one, reload the item
**Expected:** The question (and the seller's answer once given) appears in the Q&A panel.
**Actual:** Panel always reads "0 questions · No questions yet — be the first to ask", on every item, forever.
**Environment:** Chrome, 1280px, local dev
**Fix commit:** _(local, July3DropB + July3DropF)_
**Re-tested:** Backend verified by automated e2e (25/25 route + guard assertions). Browser pass pending.
**Notes:** Root cause — the Q&A panel was a design-only surface. There was **no `Question` model in `schema.prisma`, no route, and no API field**; `item.questions` came from an adapter line that defaulted to `[]` and nothing ever populated it. Worse, "Ask a question" did not create a question at all — it POSTed to `/api/conversations`, opening a **private** 1-to-1 message thread and navigating to Messages, so nothing could ever reach the public panel. The `qa.aiAnswered` / "AI Agent · AUTO" render branch was dead code for the same reason.

Fix — built the feature end to end:
  - **Schema:** new `Question` model (`itemId`, `askerId`, `body`, `answer?`, `answeredAt?`, `answeredById?`) + relations on `Item` and `User`. Migration `20260814144422_add_item_questions`. Indexed `[itemId, createdAt]`, `[askerId]`, `[answeredById]` from the start (BUG-077A lesson — don't ship an unindexed hot table).
  - **Routes** (`src/routes/questions.ts`, mounted `/api/questions`): `GET /item/:itemId` (optionalAuth, public read, returns `isMine` for the viewer), `POST /item/:itemId` (auth + new `questionCreationLimiter`, 30/hr per user), `PATCH /:id/answer` (seller only), `DELETE /:id` (seller always; asker only while unanswered → 409 otherwise), `GET /pending` (seller's unanswered queue).
  - **Guards:** seller cannot ask on their own item (403 — would let them seed fake social proof on a public surface); asker identity exposes only `{id, name}`, never email/postal code.
  - **Buyer UI:** `ItemDetail` fetches `/api/questions/item/:id` per item (not joined onto the Discover feed — avoids an N+1 across the grid), renders real Q&A with a "YOU" chip on your own question and an explicit **"Awaiting the seller's answer"** state so an unanswered question no longer renders a blank reply block.
  - **AskModal:** repointed to `POST /api/questions/item/:id`. Also fixed a latent bug — it set `sent = true` synchronously and fired `onSend` into the void, so a failed request still showed the "Question sent!" success screen. Now awaits the POST, shows inline errors, keeps the composer open on failure.
  - **Seller UI:** new **Questions** tab in `InventoryTabs` with a live unanswered badge, and a `QuestionsView` queue showing the listing, the asker, and an inline public-answer composer.

**Related:** the "All Q&As are visible to other buyers" line in the Ask modal was *false* before this change (questions went to a private thread). It is now accurate.

### BUG-078  ·  P1  ·  Email blast send rotates tokens with no transaction → orphan sends + dead old-blast unsubscribe links  ·  Status: Open
**Title:** Pre-push review of BUG-071 surfaced two related issues in `POST /api/admin/email-blasts/send` ([routes/admin.ts](dropyard_backend/src/routes/admin.ts) around line 825).
**Found by:** F3 pre-push review · **Found date:** 2026-06-23
**Issues:**
  1. The send loop calls `rotateSubscriberToken` (DB write) for each subscriber BEFORE sending, then writes the `EmailBlast` history row AFTER the loop completes. If the HTTP request times out, errors, or the admin double-clicks, recipients whose tokens were rotated but didn't get the email are stranded — their previous email's unsubscribe link is now dead, and no history row was written.
  2. By design (current implementation), every blast rotates every subscriber's token. That means **only the most recent email's unsubscribe link works** — older archived emails 404 silently. CASL expects unsubscribe to keep working ≥60 days from receipt.
**Mitigations for v1 (immediate):**
  - Don't blast >100 subscribers at once; the serial loop becomes unsafe under HTTP timeouts as the list grows.
  - Send during low-load windows; if the request errors mid-loop, expect to manually reconcile.
  - Current subscriber count is ~0, so the "old links die" issue is theoretical until the list grows.
**Proper fix (follow-up):** Either (a) email the raw token at subscribe time, store the hash, never rotate — losing the "fresh link per blast" property but gaining stability; or (b) store raw tokens encrypted, skip rotation. Also: wrap the send loop in a transactional outer step that creates the `EmailBlast` row FIRST and appends `EmailBlastRecipient` rows incrementally, so a partial failure is recoverable. Also: add an idempotency key on the send endpoint so admin double-click is a no-op.

### BUG-077  ·  P1/P2  ·  F3 Performance Audit findings (12 verified)  ·  Status: Open
**Title:** Cross-cutting performance audit (Wave-F item F3) covering frontend (Lighthouse-adjacent static checks), backend (Prisma indexes + N+1) and real-world (Slow 3G + repeat-visit caching) concerns. All findings below were verified against the actual codebase — not agent speculation. Listed in fix-priority order.
**Found by:** F3 audit pass · **Found date:** 2026-06-23
**Findings:**

  **A — Backend P1: missing indexes on hot columns** ([prisma/schema.prisma](dropyard_backend/prisma/schema.prisma))
  The `items` and `claims` tables have ZERO indexes today. Every buyer feed fetch, seller "my items" fetch, and claims lookup is a full table scan. Adding the indexes below is one migration and a measurable win immediately.
  Add to `model Item`:
  - `@@index([sellerId])`              — `routes/items.ts:237` "my items"
  - `@@index([status, dropId])`        — `routes/items.ts:432` buyer feed where-clause
  - `@@index([placement, status])`     — shelf items query
  Add to `model Claim`:
  - `@@index([buyerId, status])`       — `routes/claims.ts` buyer's claims
  - `@@index([sellerId, status])`      — `routes/claims.ts` seller's claims
  - `@@index([status, expiresAt])`     — claim expiry sweep (BUG-055 lifecycle)
  Note: `watchlist.userId` is already covered by the composite `@@unique([userId, itemId])` — Postgres uses the leftmost prefix, so a userId-only query hits the unique index. No new index needed there. `users.email` is `@unique` — fine for exact match. Admin-search uses `contains` which can't use a B-tree anyway; would need pg_trgm extension.

  **B — Backend P1: no gzip compression** ([src/app.ts](dropyard_backend/src/app.ts))
  Express has cookie-parser, morgan, helmet, CSRF wired in — but no `compression()` middleware. `/api/items` with 20 rows + photo arrays ships ~150KB uncompressed; gzipped that's ~30KB. 5× bandwidth waste on every list fetch.
  Fix: `npm i compression @types/compression` → `app.use(compression())` right after `express.json()` at line 118.

  **C — Frontend P1: Both 1.4 MB dashboards static-imported on `/buyer`** ([app/buyer/page.tsx:5-6](dropyard_frontend/app/buyer/page.tsx#L5))
  `app/buyer/page.tsx` does a top-level `import DropYardSellerDashboard ...` AND `import DropYardBuyerDashboard ...`. The seller dashboard is 682KB and the buyer dashboard is 749KB raw JSX — both ship in the initial JS bundle on every `/buyer` visit, but only ONE renders (the other branch is dead until the user role-switches).
  Fix: convert both to `next/dynamic({ ssr: false })` so the inactive role is only fetched if/when the user actually switches.
  ```tsx
  const DropYardBuyerDashboard  = dynamic(() => import("@/components/previews/DropYard_BuyerDashboard"),  { ssr: false });
  const DropYardSellerDashboard = dynamic(() => import("@/components/previews/DropYard_SellerDashboard"), { ssr: false });
  ```

  **D — Frontend P1: no `optimizePackageImports` in next.config** ([next.config.ts](dropyard_frontend/next.config.ts))
  Homepage imports 16 named icons from `lucide-react` and `{ motion }` from `framer-motion`. Without Next's `optimizePackageImports`, both pull more than the names imply (especially framer-motion variants). Add:
  ```ts
  const nextConfig: NextConfig = {
    poweredByHeader: false,
    experimental: { optimizePackageImports: ["lucide-react", "framer-motion"] },
    async headers() { ... },
  };
  ```
  Free win — single config line.

  **E — Backend P2: N+1 in conversations inbox** ([routes/conversations.ts:160](dropyard_backend/src/routes/conversations.ts#L160))
  `GET /api/conversations` lists threads then does `await Promise.all(convs.map(c => unreadCountFor(c) + previousPurchasesBetween(c)))` — that's 2N extra round-trips. Code comment says "N+1 here is fine for v1". Acceptable today; flag for fix when a power user has 20+ active threads. Replace with `prisma.message.groupBy({ by: ['conversationId'], _count })` + `prisma.claim.groupBy(...)` in 2 queries.

  **F — Backend P2: watchlist endpoint unpaginated** ([routes/watchlist.ts:10](dropyard_backend/src/routes/watchlist.ts#L10))
  `GET /api/watchlist` has no `take`/`skip`. A user with 500 saved items ships a 500-item payload every buyer dashboard mount. Add `?limit` (clamp 50) + `?page` and a `total` field, same pattern as `/api/items`.

  **G — Backend P2: no Cache-Control on public read endpoints**
  - [routes/items.ts:458](dropyard_backend/src/routes/items.ts#L458) `GET /api/items`
  - [routes/items.ts:356](dropyard_backend/src/routes/items.ts#L356) `GET /api/items/sneak-peek`
  - [routes/emailSubscriptions.ts](dropyard_backend/src/routes/emailSubscriptions.ts) `GET /api/email-subscriptions/count` (homepage every load)
  Send `Cache-Control: public, max-age=30, stale-while-revalidate=120` on these. Repeat homepage/feed visits on Slow 3G skip the round-trip entirely.

  **H — Frontend P2: raw `<img>` everywhere, no `next/image`**
  Greppable across `app/page.tsx`, `for-buyers/page.tsx`, `for-sellers/page.tsx`. No automatic WebP/AVIF, no responsive srcset, no built-in lazy. Hero image especially is the LCP candidate and is unoptimized.
  Fix: at minimum, convert the homepage hero, the Featured strip images, and testimonial avatars to `<Image>` with explicit width/height. Add `images.remotePatterns` for `i.pravatar.cc` and the S3 photo host in `next.config.ts`.

  **I — Frontend P2: CLS from unsized images**
  Testimonial avatars (`app/page.tsx` ~line 1140) and hero image have no `width`/`height` attributes — image load reflows the layout, hurting CLS. Add explicit dimensions or `aspect-ratio` containers.

  **J — Frontend P2: three clock intervals on the buyer dashboard** ([components/previews/DropYard_BuyerDashboard.jsx](dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx) lines 24, 762, 918)
  Three separate `setInterval` loops update `now` (one 60s, two 1s) on the same page, each triggering re-renders of deep subtrees. On a mid-tier phone this is wasted CPU since countdown text only changes at minute boundaries.
  Fix: consolidate to ONE module-level clock provider that emits at 1Hz only when something visible needs sub-minute precision.

  **K — Frontend P3: socket.io polling fallback** ([context/SocketContext.tsx:63](dropyard_frontend/context/SocketContext.tsx#L63))
  `transports: ["websocket", "polling"]`. On flaky networks the polling fallback hammers the server with short-interval HTTP. Switch to `transports: ["websocket"]` and lean on socket.io's reconnect logic. Only revert if behind a corporate proxy that blocks WS.

  **L — Frontend P3: dead preview dashboards in repo** ([components/previews/](dropyard_frontend/components/previews/))
  `DropYard_BuyerDashboard_final.jsx` (660KB), `DropYard_BuyerDashboard_v2.jsx` (658KB), `DropYard_SellerDashboard_final.jsx` (415KB) are referenced ONLY by `/app/preview/*` routes (developer-only). They don't bloat `/buyer`, but a `/preview/...` URL shipped to prod would be ~1MB of dev-only code. Either delete them or gate the `/preview/*` routes behind `process.env.NODE_ENV !== "production"`.

**Real-world test (Slow 3G + 4× CPU): NOT YET RUN**
Static audit only — Lighthouse and DevTools throttling pass deferred until A-D are fixed, since metrics after A+B+C+D will be materially different.

**Recommended order of fixes (impact ÷ effort):**
1. **A + B** (schema migration + one Express middleware) — single PR, immediate prod win across every API call
2. **C + D** (two-line code change + one config line) — homepage + /buyer JS payload drops materially
3. **G** (cache headers on 3 endpoints) — repeat-visit win
4. **H + I** (image work) — biggest visual perf + LCP gain, but most code churn
5. **E, F, J, K, L** — polish

### BUG-076  ·  P2  ·  Homepage Featured "like" heart was non-functional / misleading  ·  Status: Fixed (verify)
**Title:** The heart/save button on the homepage Featured strip ([app/page.tsx](dropyard_frontend/app/page.tsx) `ItemCard`) toggled only local `useState` and the displayed save count (`item.saves`) was hardcoded. No `/api/watchlist` call, no auth gate, no persistence — heart turned red on click and silently reset on refresh.
**Found by:** Real user (Narveer QA pass) · **Found date:** 2026-06-23
**Repro steps (before fix):**
  1. Visit `/` signed out.
  2. Click the heart on any Featured item.
  3. Heart turns red. Refresh the page.
  4. Heart is back to outline; nothing was ever saved.
  5. Repeat signed-in — same behavior; `/api/watchlist/:id` is never called.
**Expected:** Anon visitors get bounced to `/join?mode=signin` (consistent with all other public CTAs per recent feedback). Authed visitors fire the real `POST /api/watchlist/:id` (or `DELETE` on un-save). Save count updates immediately so the user sees their action.
**Fix:**
  1. Imported `useAuth` in [app/page.tsx](dropyard_frontend/app/page.tsx); read `user` in `DropYardWebsiteInner`, derived `isAuthed` and a `goSignin` helper that pushes to `/join?mode=signin`.
  2. Threaded `isAuthed` + `goSignin` through `HomePage` props to each `<ItemCard>`.
  3. Rewrote `ItemCard` heart handler:
     - If `!isAuthed` → call `goSignin()` and return (no API call).
     - If authed → optimistic flip of `saved` + `saves` count, then `apiRequest('/api/watchlist/:id', { method: saved ? 'POST' : 'DELETE' })`; revert on failure.
     - Added `pending` guard so rapid clicks don't double-fire.
     - Added `disabled` + `aria-pressed` + `cursor-not-allowed` for accessibility.
  4. The Featured strip's adapter (line ~849) already converts API responses with real CUID `id` strings. Synthetic placeholders (`idx+1` integer fallback) are detected via `typeof item.id === "string"` and skipped to avoid hitting the watchlist API with garbage ids.
**Notes:**
  1. Did NOT pre-fetch the user's existing saves to seed `saved=true`. Trade-off: the homepage shows all hearts as outline on load even if the visitor already saved an item on `/buyer`. Reasoning: marketing surface, very low chance the same 4 items overlap with their prior saves, and the alternative requires fetching `/api/watchlist` per page load. The watchlist endpoints are idempotent server-side (POST is upsert, DELETE is `deleteMany`), so re-saving an already-saved item is a no-op rather than an error.
  2. No backend changes — `/api/watchlist/:id` (POST/DELETE) already existed and is auth-required (BUG-032 added FK pre-check returning 404 cleanly).
  3. Anon-click bounce uses `/join?mode=signin` (not `?mode=signup`) per the recent "all public CTAs default to signin" feedback.

### BUG-051  ·  P3  ·  No per-item "Share" feature on item cards (buyer + seller) or the LiveHero  ·  Status: Fixed (verify)
**Title:** User asked to add a Share affordance on (1) each buyer-side item card in Discover/Saved/Sneak Peek, (2) the seller's inventory row actions, and (3) the LiveHero hero on the seller Overview. The seller dashboard already had a multi-item `ShareSheet` opened from `BetweenHero` for between-drop sharing, but nothing for per-item or LiveHero share.
**Found by:** Real user (Narveer screenshot) · **Found date:** 2026-06-09
**Fix:**
  1. **Buyer ItemCard** — added a Share2 icon button next to the heart in the top-right cluster. Clicking it stops propagation (so the card doesn't also open), then calls a new module-level `shareListing(item)` helper.
  2. **Seller inventory row actions** — added a Share2 icon button as the first action in the row, hidden on `draft` (drafts aren't publicly viewable). Hits a parallel `shareSellerListing(item)` helper in the seller file.
  3. **LiveHero** — new optional `onShare` prop. When provided, renders a "Share" button in the CTA cluster alongside "Open messages" / "See what's live". Dashboard root threads `onShare={handleShare}` so it opens the existing `<ShareSheet>` modal (same one BetweenHero uses) prefilled with the seller's currently-live items.
**Notes:**
  1. Share helpers use the **Web Share API** when available (mobile gets native OS sheet → WhatsApp / SMS / Messenger), and fall back to **clipboard copy** with a transient success message on desktop. Final fallback for ancient browsers is showing the URL in a returned string so the caller can render it.
  2. Share text format: `Check out "{title}" · ${price} on DropYard.` plus a URL. The URL is `window.location.origin + "/?ref=share&item=" + itemId` — `ref=share` so analytics can attribute incoming traffic, `item=<id>` for a future `/item/<id>` public deep-link route (no public per-item page exists yet — the recipient lands on the marketing root for now).
  3. Web Share API quirks handled: `AbortError` (user dismissed the share sheet) is treated as success not failure. Clipboard writes are wrapped in try/catch since some browsers block in non-secure contexts.
  4. Free-pile items: seller share helper uses `· FREE` in place of the dollar amount when `item.isFree` is true.
  5. **Out of scope (follow-up):** building the actual `/item/<id>` public page so recipients see the listing directly. Right now the deep link drops them on the marketing site root. Worth doing once we want shared links to convert.

### BUG-050  ·  P2  ·  Sellers see their own items in the buyer feed → "Cannot message yourself" toast on interaction  ·  Status: Fixed (verify)
**Title:** The buyer-mode Discover feed + Sneak Peek surfaced the seller's own items. Clicking "Ask" or "Claim" landed on the backend self-guard (`if (item.sellerId === myId) → 400 "You cannot message yourself about your own item"`). User saw the toast in the screenshot — friendly enough, but the interaction shouldn't have been offered in the first place.
**Found by:** Real user (Narveer screenshot) · **Found date:** 2026-06-09
**Repro steps (before fix):** Sign in as a seller, switch to Buyer view. Their own listed items appeared in Discover with normal Claim/Ask buttons. Clicking either triggered the "Couldn't send: You cannot message yourself about your own item" toast.
**Expected:** Own items hidden from buyer feed by default. If reached via deep link or stale watchlist row, the detail page should swap buyer affordances for a "switch to Seller view" CTA.
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx)_
**Notes:**
  1. **Feed filter** — both `/api/items` and `/api/items/sneak-peek` fetches now run `list.filter(i => i?.seller?.id !== user.id)` before the adapter. Self-listed items no longer surface in Discover or Sneak Peek.
  2. **Detail-page safety net** — `ItemDetail` accepts new props `currentUserId` and `onSwitchRole`. Computes `isMyOwnItem = item?.seller?.id === currentUserId`. When true, the Claim CTA + Save/Ask buttons + "Ask a question" CTA in the Q&A section are replaced with an amber notice ("This is your listing — you can't claim or message yourself") plus an "Open in Seller view" CTA that triggers the existing role switch.
  3. Watchlist save path untouched — backend already returns 400 on `POST /api/watchlist/<own-item>` (BUG-032 added the FK pre-check). The detail page now hides the Save button on own items so the request never fires.
  4. **Out of scope (separate work)**: backend hardening to add `/api/items?excludeOwn=true` query param so other callers (admin, e.g.) don't have to dedupe client-side. For the buyer dashboard, client-side filter is fine.
  5. **Image rendering bug** in the same screenshot ("1.amazonaws.cor / d204-434b-84a5") — that's BUG-035, already fixed in this branch, awaiting deploy.

### BUG-049  ·  P2  ·  LiveHero on mobile squeezes headline + body text into 4-line stacks  ·  Status: Fixed (verify)
**Title:** On mobile the "Drop is Live" hero rendered "Closes in 3h 2m" as a vertical stack ("Closes" / "in 3h" / "2m") and the body wrapped each phrase onto its own line ("0 of your / items are / in the live / Drop right / now"). Root cause: the hero's outer flex row had the right-side CTA column locked to `minWidth: 220, flexShrink: 0`, so the left text column got squeezed into ~96px of remaining space on a 360px-wide phone.
**Found by:** Real user (Narveer mobile screenshot) · **Found date:** 2026-06-09
**Fix:**
  1. Outer flex container — added `flexDirection: isMobile ? "column" : "row"` so the text column takes full width and the CTAs stack underneath.
  2. CTA column — removed the `minWidth: 220` lock on mobile; switched to `flexDirection: "row"` so the two buttons sit side-by-side filling the row.
  3. CTA buttons — `flex: 1` on mobile so they share the width evenly; added `whiteSpace: nowrap` so the labels don't break mid-word; tightened the padding from 13/22px to 11/14px so two buttons fit comfortably on a 360px phone.
  4. Headline — bumped from 24 → 26px (room to grow now that the column is full-width) with line-height nudged from 1.02 → 1.05.
**Side benefit:** The same fix improves the iPhone-SE viewport (375px) which had the same compression but less severely.

### BUG-048  ·  P2  ·  Mobile ContextualStats row still showed hardcoded "VIEWS TODAY 142 · CLAIMS 2 · PICKUPS 0"  ·  Status: Fixed (verify)
**Title:** BUG-044 wired real values into `<LiveHero>` for the desktop banner but the mobile `<ContextualStats>` row (the 3-tile grid below the hero — "VIEWS TODAY / CLAIMS / PICKUPS") was reading from the same prop bag. Three issues: (1) the `views` prop already pointed at the new `liveSaves`, but the label "VIEWS TODAY" no longer matched the semantic (it's actually a sum of watcher counts, not view events). (2) `pickupsUp` was hardcoded to `0`. (3) Anyone seeing the prod build still saw "142" until BUG-044 deployed.
**Found by:** Real user (Narveer mobile screenshot) · **Found date:** 2026-06-09
**Fix:**
  1. Tile label: "VIEWS TODAY" → "WATCHING", icon: `Eye` → `Heart` (matches LiveHero copy + accurate semantic).
  2. `pickupsUp` data prop: was `0`, now `actionBuckets.pickupsToday + actionBuckets.pickupsWeek` (already computed by the existing CONFIRMED-claims fetch).
  3. View-event tracking remains out of scope — same call-out as BUG-044.

### BUG-047  ·  P0  ·  Seller Overview crashes with "liveViewsToday is not defined" after BUG-044 rename  ·  Status: Fixed (verify)
**Title:** BUG-044 renamed `liveViewsToday` → `liveSaves` and `liveClaims` → `livePendingClaims` but missed two references inside the `<BetweenHero>` data prop (lines 2375-2376). Result: the Overview component threw `ReferenceError: liveViewsToday is not defined` and the whole seller dashboard failed to render.
**Found by:** Real user (Narveer runtime stack trace) · **Found date:** 2026-06-09
**Repro steps (before fix):** Sign in as a seller, land on `/buyer` (Seller mode). Page crashes with the ReferenceError; AuthedBuyerContent → DropYardSellerDashboard → Overview throws before paint.
**Fix:** Replaced both stale identifiers with the new ones: `views: liveSaves`, `claims: livePendingClaims`.
**Note:** BUG-044's incomplete grep at edit time — should have used `replace_all` for the rename and verified zero remaining references. Lesson logged.

### BUG-046  ·  P3  ·  "Sell with AI" teaser belongs in Settings, not the Overview hero stack  ·  Status: Fixed (verify)
**Title:** The "Sell with AI" rotating-ticker teaser (Coming Soon / Negotiate offers automatically / "Notify me when it's ready") was rendered in the Overview page between the activity strip and the Needs-Attention metric tiles. User asked to move it under Settings since the AI agent is a long-running waitlist feature, not a per-drop action.
**Found by:** Real user (Narveer screenshot) · **Found date:** 2026-06-09
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_SellerDashboard.jsx)_
**Notes:**
  1. Removed `<SellWithAITeaser/>` from `Overview`. Comment left as a breadcrumb pointing to its new home.
  2. Added a new Settings section `{ id: "sellWithAi", label: "Sell with AI", icon: Sparkles, desc: "AI agent that negotiates offers — coming soon" }`. Inserted between "Pickup" and "Subscription" so the upgrade path reads "configure → upsell".
  3. `SettingsView` now owns `aiNotified` + `handleAINotify` state (lifted from Overview). Source attribution changed from `"seller-overview-teaser"` to `"seller-settings-sell-with-ai"` so the analytics tag matches the new placement.
  4. Removed the now-unused state from `Overview`.
  5. The mobile drill-down + desktop split-pane navigation in `SettingsView` already handles the extra row generically — no layout work needed.

### BUG-045  ·  P2  ·  Item price validation rejects $0 — blocks sellers from listing free giveaways  ·  Status: Fixed (verify)
**Title:** Sellers wanting to list an item for $0 (the "Free pile" use-case the schema already has an `isFree` boolean for) couldn't get past the form. Frontend showed "Enter a price greater than 0." and backend's Zod `z.number().positive()` would have rejected 0 anyway.
**Found by:** Real user (Narveer screenshot) · **Found date:** 2026-06-09
**Repro steps (before fix):** ManualItemForm (or EditItemView) → enter `0` in price → click Queue for Saturday's Drop → "Enter a price greater than 0." inline error.
**Expected:** $0 accepted as a valid free giveaway price. Negative values + absurd values still rejected.
**Fix commit:** _(local, dropyard_backend/src/routes/items.ts + dropyard_frontend/components/previews/DropYard_SellerDashboard.jsx)_
**Re-tested via curl:**
  - `POST /api/items` with `price: 0` → **201** Created
  - `POST /api/items` with `price: -1` → **400** "Number must be greater than or equal to 0"
  - `POST /api/items` with `price: 200000` → **400** "Number must be less than or equal to 100000"
**Notes:**
  1. Backend: `createItemSchema.price` changed `z.number().positive()` → `z.number().nonnegative().max(100000)`. `updateItemSchema.price` mirrored. The `.max(100000)` is a typo guard (no one's listing a $500k item on DropYard).
  2. Backend: `originalPrice` kept as `.positive()` because a $0 "original price" makes no sense as a strikethrough anchor. The discount-percent badge would also divide by zero.
  3. Frontend: ManualItemForm + EditItemView both ran `if (!numericPrice || numericPrice <= 0)` — the `!numericPrice` clause rejected 0 because `0` is falsy in JS. Replaced with `if (!Number.isFinite(numericPrice) || numericPrice < 0)` plus an upper bound for parity with the backend.
  4. Error copy reworded to hint that 0 is valid: "Enter a price (0 for a free giveaway)."
  5. **Out of scope (separate UX item):** rendering "$0" as the badge text everywhere works but reads a bit awkwardly. The schema already has an `isFree` boolean — a future polish could auto-toggle `isFree=true` when `price=0` on the backend, and the buyer-side ItemCard already has a "Free pile" claret pill when `isFree` is set. Worth wiring next time we touch this.

### BUG-044  ·  P2  ·  Seller Overview "Drop is Live" hero shows hardcoded "142 views today · 2 claims pending"  ·  Status: Fixed (verify)
**Title:** The seller Overview's `LiveHero` (the green "Drop is live" banner that displays during the LIVE phase) read `liveViewsToday = 142` and `liveClaims = 2` straight from local constants — the comment at the top of those lines even said "still demo until we wire real-time stats". User flagged on prod.
**Found by:** Real user (Narveer screenshot) · **Found date:** 2026-06-09
**Repro steps (before fix):** Sign in as a seller during the LIVE phase. Overview's green hero shows the same "142 views today · 2 claims pending" regardless of actual activity.
**Expected:** Real per-seller metrics derived from data the dashboard already fetches.
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_SellerDashboard.jsx)_
**Re-tested:** ⏳ Awaiting prod verification next live drop.
**Notes:**
  1. **Saves metric** (replaces "views today"): summed `saves` field across the seller's currently-LIVE items. `saves` comes from the existing `_count.watchlist` resolver in the item adapter (line 4050ish). No new API call. Label changed from "X views today" to "X buyer(s) watching" since there's no per-item view-event tracking yet (`viewCount` column doesn't exist on `Item`) — staying honest beats fabricating a metric.
  2. **Claims pending** now reads from the existing `/api/claims/incoming?status=PENDING` fetch that already powers the Needs Attention strip + activity feed. Added a `livePendingClaims` state populated by `setLivePendingClaims(pending.length)` in the same `.then` handler. Demo path (no `accessToken`) seeds 2 so /preview/seller-dashboard still looks populated.
  3. `LiveHero` prop renamed `views` → `saves` and the inline render swapped `<Eye>` icon for `<Heart>` to match the new semantic.
  4. Real-time: the `useSocketEvent("claim:new" / "claim:updated")` hooks already bump `refreshTick`, which re-runs the useEffect that populates `livePendingClaims`. So the count updates live without a refresh when a buyer claims.
  5. **Out of scope (separate item)**: actual view-event tracking. Adding an `ItemView` table or `Item.viewCount` counter + incrementing it on `GET /api/items/:id` (debounced, distinct buyer per day) would let us reinstate a real "X views today" metric. Worth scoping when we want to surface buyer-engagement data more broadly.

### BUG-043  ·  P0  ·  "Claim at listed price" path doesn't persist if buyer clicks Done instead of View in Claims  ·  Status: Fixed (verify)
**Title:** Same root pattern as the offer bug (BUG-042). When a buyer clicked "Claim at $X" in ClaimModal, `handlePrimary` just did `setStep("done")` — showed the "Item claimed!" success screen WITHOUT calling the backend. The actual `POST /api/claims` was only attached to the "View in Claims" button (via `onConfirm` → `handleClaimComplete`). If the user clicked **"Done"** instead, the claim was silently lost — the seller never saw it.
**Found by:** Real user (Narveer) · **Found date:** 2026-06-09
**Repro steps (before fix):**
1. Open `/buyer` → Discover → click "Claim Now" on any item.
2. Pick a slot, leave "Claim at listed price" selected, click "Claim at $X".
3. "Item claimed!" success screen appears with WhatsApp + AI confirmation copy.
4. Click "Done" instead of "View in Claims" → modal closes → no claim exists on the backend.
**Expected:** POST to `/api/claims` happens when the user clicks "Claim at $X" (before the success screen), independent of which exit button they pick.
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx)_
**Re-tested via curl:** `POST /api/claims` with valid `{itemId, pickupSlot}` → **201** with `{ claim: {...} }`. ClaimModal now captures the claim id and passes it to the parent's `onConfirm` so the optimistic insert in `handleClaimComplete` uses the real backend id (was a `bc-${Date.now()}` temp id that blocked subsequent cancel via `/api/claims/:id/cancel`).
**Notes:**
  1. `ClaimModal.handlePrimary` now branches by mode and ACTUALLY hits the backend for both paths (claim + offer). Demo items skip the API and keep the existing standalone preview UX.
  2. New `realClaim` state caches the response so both success-screen buttons ("View in Claims" + "Done") pass the same real claim object up to `onConfirm`.
  3. `handleClaimComplete` (dashboard root) gains an optional `realClaim` arg. When provided, it uses the real id for the optimistic insert and SKIPS the duplicate POST. When absent (legacy path or demo), the old behaviour stays — optimistic insert with `bc-` temp id, then POST (only if authed + real item).
  4. `handleClaimConfirm` in `ItemDetail` threads the new arg through.
  5. Inline error state + sending-spinner from BUG-042 are reused so failed POSTs surface in red instead of "succeeding silently".
  6. The Done button used to just call `onClose` — now it also calls `onConfirm` (with the same `realClaim`) so the optimistic insert into the Claims tab fires regardless of which exit the buyer picks. They land on Discover (since Done doesn't navigate) and can find the claim in the Claims tab on the next visit.

### BUG-042  ·  P1  ·  ClaimModal "Send offer" button does nothing — flips local UI state but never persists  ·  Status: Fixed (verify)
**Title:** When a buyer picked "Make a different offer" and clicked "Send offer of $X" in the ClaimModal, the modal jumped to the "Offer sent!" success screen — but no message, no conversation, no record reached the backend. The seller never saw the offer. Confirmed in code: `handlePrimary` just did `setStep("offer-sent")`. Item #8 (BUG-038) landed the `MessageType.OFFER` + `amount` plumbing on the backend, but no UI flow wired into it until now.
**Found by:** Real user (Narveer screenshot showing "Send offer of $2" button) · **Found date:** 2026-06-09
**Repro steps (before fix):** Open any item on /buyer → Claim Now → Make a different offer → enter amount → Send offer. Fake "Offer sent!" screen appears. Check seller's Messages tab — nothing.
**Expected:** Offer creates (or reuses) a conversation thread with the seller, posts an OFFER message with the amount, surfaces it on the seller's Messages tab + a `message:new` socket push. Buyer can jump to the thread via a "View in Messages" CTA.
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx)_
**Re-tested via curl (local):**
  - `POST /api/conversations` with `{itemId, body: "I'd like to offer $30...", messageType: "OFFER", amount: 30}` → **201** + conversation created with the OFFER message in one round-trip.
  - `GET /api/conversations/:id/messages` → message present with `messageType: "OFFER"` and `amount: 30`. Buyer-side render adapter (BUG-038 work) maps it to the lowercase "offer" type so the existing OFFER bubble UI (DollarSign icon + "Offer · $30" header) renders correctly.
**Notes:**
  1. `ClaimModal` accepts new props `accessToken` and `onGoToMessages`. `handlePrimary` is now `async` and posts to `/api/conversations` for real items, skipping the API for demo data so `/preview/buyer-dashboard` still flows.
  2. The conversations API conveniently accepts both `body` and `messageType`/`amount` in the create call — no need for a separate POST to `/:id/messages`. The backend wraps create-or-reuse + first-message in one transaction (see `dropyard_backend/src/routes/conversations.ts`).
  3. UI states added: `sending` (disables both buttons + label flips to "Sending…"), `errorMsg` (claret alert surfaced inline above the action row if the API fails).
  4. Success screen now offers a primary "View in Messages" CTA alongside "Got it" — closes the modal and routes to `/buyer` → Messages tab via `onGoToMessages` (threaded through `ItemDetail` and from the direct-from-card dashboard root).
  5. Backend reuse: if the buyer had already messaged the seller about this item, `POST /api/conversations` returns the existing thread + appends the OFFER message rather than creating a duplicate.
  6. Seller side: socket `message:new` fires → seller's MessagesPage refreshes. Message adapter from BUG-038 renders the OFFER bubble with the dollar amount badge.

### BUG-041  ·  P2  ·  Shelf items on Saved tab + RegularSellerProfile stay amber "On the Shelf" during Live Drop  ·  Status: Fixed (verify)
**Title:** `ItemCard` correctly switches a shelf item's badge from amber "On the Shelf" to green "Live Drop" when its `liveMode` prop is true (line 1402-1404 of `DropYard_BuyerDashboard.jsx`). DiscoverPage threads `liveMode={true}` to the unified live pool. But two other call sites — `SavedPage` (line 3018) and `RegularSellerProfile` (line 2991) — never accepted or passed the drop state, so during the LIVE phase shelf items on those pages still rendered amber, including amber "Claim Now" buttons. User screenshot showed two amber "On the Shelf" cards next to a green "Live Drop" card on the Saved tab during a live drop.
**Found by:** Real user (Narveer screenshot) · **Found date:** 2026-06-09
**Repro steps (before fix):**
1. During the LIVE phase (Sat 8 AM – Sun 8 PM Toronto), open `/buyer` → Saved tab.
2. Save a shelf item.
3. The card shows amber "On the Shelf" badge + amber "Claim Now" — inconsistent with the rest of Discover during the live drop.
**Expected:** During LIVE, every claimable item across Discover/Saved/Seller-profile pages displays "Live Drop" green + green "Claim Now". The shelf vs drop distinction is for between-drops only.
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx)_
**Re-tested:** ⏳ Awaiting prod verification next live drop.
**Notes:**
  1. Added `state = "between"` to `SavedPage` signature; threaded `liveMode={state === "live"}` into its `ItemCard` map. Same change to `RegularSellerProfile`.
  2. Dashboard root call sites now pass `state={dropState}` — the existing `dropState` value already drives `AnticipationBand`/`WelcomeBand`/`DiscoverPage`, so no new state.
  3. ItemCard logic untouched — it already had the correct ternary `if (item.layer === "shelf" && !liveMode)`. Just needed `liveMode` threaded.
  4. The user's screenshot also showed image areas rendering CUID strings as 72px text. That's BUG-035 (already fixed locally) — confirms prod is on the pre-035 build. Deploying this batch will resolve both issues at once.

### BUG-040  ·  P1  ·  Seller item creation surfaces raw "Token expired or invalid" backend error instead of refreshing the session  ·  Status: Fixed (verify)
**Title:** Sellers filling out the "List New Item" form on `/buyer` (Seller mode) saw the backend's literal `"Token expired or invalid"` text under the publish buttons. The frontend's auto-refresh mechanism (`apiRequest` in `lib/api.ts`) handles this correctly for normal JSON endpoints — refreshes via `/api/auth/refresh`, retries, on failure redirects to `/join` with a clean "Session expired" message. But the photo upload helper `uploadItemPhoto` used a **raw `fetch`** with no refresh path. If the seller uploaded a photo after the 15-minute access token expired (e.g. opened the form, sat for >15min, then added a photo and clicked Publish), the upload itself bounced with the raw backend 401 message — which the form caught and rendered in red.
**Found by:** Real user (Narveer screenshot) · **Found date:** 2026-06-09
**Repro steps (before fix):**
1. Sign in as a seller. Open `/buyer` → Switch to Seller → "List New Item".
2. Fill in title/description/category/condition/price but DON'T upload a photo yet.
3. Wait > 15 minutes (access token TTL).
4. Upload a photo OR click "Publish to Shelf now" while the photo dialog hasn't refreshed token state.
5. If the photo upload fires the 401 first: form shows "Token expired or invalid" with no recovery.
**Expected:** Auto-refresh via `/api/auth/refresh`, retry transparently. If refresh fails too: redirect to `/join` with a "Session expired, please sign in again." prompt.
**Fix commit:** _(local, dropyard_frontend/lib/api.ts)_
**Re-tested:** ⏳ Awaiting prod verification (after deploy + login expiry test).
**Notes:**
  1. Extracted `doUpload(file, token)` helper so the auto-refresh path can call it twice without duplicating FormData/header setup.
  2. After a 401 on the first try, `uploadItemPhoto` now mirrors `apiRequest`'s exact flow: pull refresh token from localStorage → POST `/api/auth/refresh` → on 200, persist new tokens + retry the upload → on non-200, clear session + `window.location.href = sessionExpiredRedirect()` + throw "Session expired. Please sign in again."
  3. Network-blip-during-refresh tolerated the same way: caught, falls through, and the trailing `if (res.status === 401)` final guard still bounces if the original response remained 401.
  4. Audit pass: only two raw `fetch` calls remain outside `apiRequest` — `uploadItemPhoto` (now fixed) and `lib/submissions.ts` (public contact form, no auth needed, irrelevant).
  5. Diagnosis for THIS specific user report: the seller likely uploaded a photo after a long form session and hit the gap. The fix prevents this exact path. The publish endpoint itself (`POST /api/items`) was always safe because `ManualItemForm` calls it via `apiRequest`, which has had the refresh path for a while.

### BUG-039  ·  P2  ·  Claims tab + Saved badge briefly show demo numbers for authed users  ·  Status: Fixed (verify)
**Title:** The Claims tab's stat cards (Pickup today / Scheduled / Offer pending) and the topbar Saved badge appeared to show non-zero values on first paint even for users who had no real claims or saved items. Audit on report: the stat counts themselves are correctly derived (`claims.filter(...).length`), but the underlying state (`claims`, `savedIds`, `savedPreview`) was initialized with hardcoded demo data — so authed users saw 3 fake claims (Kids Bicycle / Solid Oak Table / Cuisinart Coffee Maker) and 6 fake saved items until the `/api/claims/mine` and `/api/watchlist` fetches completed (and permanently if the network failed, because the `.catch` deliberately kept the demo set).
**Found by:** Real user (Narveer) · **Found date:** 2026-06-09
**Repro steps (before fix):**
1. Sign in as a brand-new user with no claims and no watchlist.
2. Open `/buyer`. The topbar Saved tab shows "6"; the Claims tab shows 3 cards with stat counts 1 / 1 / 1.
3. After ~500ms the API replaces with real data.
**Expected:** First paint shows 0/0/0 (or accurate counts) for authed users — no fake intermediate state.
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx)_
**Re-tested:** ⏳ Awaiting prod verification.
**Notes:** Same pattern as BUG-037 (sneak peek demo fallback):
  1. `claims` initial state — extracted demo data to `DEMO_CLAIMS` const, initial state now `accessToken ? [] : DEMO_CLAIMS`.
  2. `claims` fetch `.catch` — was "keep demo on network blips"; now resets to `[]` so blip + retry stays honest.
  3. `savedIds` initial state — `accessToken ? new Set() : new Set([1,6,13,9,4,20])`.
  4. `savedIds` fetch `.catch` — same empty-set reset.
  5. `savedPreview` initial state — `accessToken ? new Set() : new Set([101,104])`.
  6. No prod data invariant changes — every authed user transition still hydrates from the same `/api/claims/mine` and `/api/watchlist` calls. The only difference is the empty-state interim is now honest rather than a placeholder of fake data.
**Audit note:** Hardcoded number constants WITHIN `ClaimsPage` itself (not its data source) are all correctly computed: `todayCount`, `scheduledCount`, `pendingCount`, and the subtitle "X active claims" all derive from `claims.filter(...).length`. No magic numbers in the UI.

### BUG-038  ·  P2  ·  AnticipationBand hardcoded "47 neighbours have items lined up"  ·  Status: Fixed (verify)
**Title:** The buyer Discover "OPENS SATURDAY" anticipation banner displayed `47 neighbours have items lined up.` regardless of how many sellers had actually queued items for the upcoming Drop. The five avatar bubbles + `+42` overflow pill were also fixed strings. Live user noticed the count never changed.
**Found by:** Real user (Narveer) · **Found date:** 2026-06-05
**Repro steps (before fix):**
1. Sign in as a buyer on `/buyer` during BETWEEN phase.
2. The amber band shows "47 neighbours have items lined up" no matter what's actually queued.
**Expected:** Real unique-seller count + first 5 actual sellers' initials + overflow pill computed from `total - 5`.
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx)_
**Re-tested:** ⏳ Awaiting prod re-test.
**Notes:**
  1. `AnticipationBand` gains `queuedCount` and `sellerNames` props (both default null for backward compat with `/preview/buyer-dashboard`).
  2. `DiscoverPage` computes both from `sneakPeekSource` (the API data from BUG-036's `/api/items/sneak-peek` route): `new Set(sneakPeekSource.map(i => i.seller)).size` for the count, `Array.from(new Set(...))` for the names.
  3. Body copy adapts: `displayCount > 0` keeps the "X neighbours have items lined up" framing (with singular/plural agreement); `displayCount === 0` swaps to "Items aren't queued yet — we'll notify you the moment the Drop opens. Tap Remind me..." so empty state reads honest, not broken.
  4. Avatar stack: now uses real seller initials when provided; hides entirely if `displayCount === 0`; "+N" overflow pill computed as `displayCount - neighbours.length` instead of the hardcoded `+42`.
  5. Demo fallback (no props) preserves the existing hardcoded "47 neighbours" + 5 demo avatars so /preview/buyer-dashboard looks unchanged.

### BUG-037  ·  P2  ·  PreviewItemDetail price renders as "Around \$35" (literal backslash) + Sneak Peek falls back to demo data for authed users  ·  Status: Fixed (verify)
**Title:** Two related issues on `PreviewItemDetail` ("Sneak Peek" item detail page):
  1. Three JSX text nodes used `\${item.estPrice}` — the `\` is interpreted as a literal character in JSX text, rendering as `\$35` instead of `$35`. Sites affected: facts grid Approximate price (~line 1549), right-rail price headline (~line 1578), Sneak Peek grid card price (~line 1736).
  2. Authed users with no real queued sneak peek items saw the hardcoded `sneakPeekItems` demo array (Cuisinart Coffee Grinder / Sarah L. / Barrhaven East / IKEA Malm Dresser etc.) because BUG-036's fallback used demo data whenever the API returned 0 items. Users couldn't tell which content was real and which was placeholder.
**Found by:** Real user (Narveer, signed in as NY) · **Found date:** 2026-06-05 · **Test case:** _live UX feedback_
**Repro steps (before fix):**
1. Sign in as a real user (with accessToken).
2. Open `/buyer`. Sneak Peek strip shows demo items (Cuisinart Coffee Grinder etc.).
3. Click one. PreviewItemDetail shows price as `Around \$35` and `\$35` in the right-rail.
**Expected:** `$35` rendered cleanly. Authed users see only real queued items (or nothing if none queued — not fake content).
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx)_
**Re-tested:** ⏳ Awaiting prod verification.
**Notes:**
  1. Three `\$` → `$` swaps at the three render sites listed above.
  2. `sneakPeekForUI` now does `accessToken ? (apiData ?? []) : sneakPeekItems` — demo data is reserved for the `/preview/buyer-dashboard*` routes (no token). Real users with 0 queued items now get an empty array.
  3. `PreviewStrip` returns null when source is empty (the entire section hides — no orphaned header).
  4. `SneakPeekListPage` distinguishes "no items at all" (Package icon + "Neighbours haven't queued items for this Saturday's Drop yet") from "no saved items yet" (Heart icon + existing copy).

### BUG-036  ·  P1  ·  Sneak Peek items on buyer Discover are hardcoded demo data — never reflect real queued listings  ·  Status: Fixed (verify)
**Title:** The "Sneak Peek — Dropping this Saturday" strip on the buyer Discover page (and the linked "See all sneak peeks" full list) read from a hardcoded `sneakPeekItems` array (8 entries: IKEA Malm, Cuisinart Coffee Grinder, etc.). They never fetched real items queued for the upcoming Drop, so buyers always saw the same fake preview regardless of what sellers had actually queued. User noticed post-deploy when sellers queued items mid-week and nothing appeared in the Sneak Peek.
**Found by:** Real users (weekend deployment) → reported by Narveer · **Found date:** 2026-06-05 · **Test case:** _live UX feedback_
**Repro steps (before fix):**
1. As a seller, queue an item for the upcoming Drop (placement DROP, status DRAFT).
2. As a buyer in BETWEEN phase, open Discover. The Sneak Peek strip shows IKEA Malm Dresser etc. — never the seller's actual queued item.
**Expected:** Sneak Peek strip + list shows real DROP+DRAFT items for the current Drop.
**Impact:** P1 — Sneak Peek is the buyer's primary "what's coming Saturday" mechanism. Showing fake content erodes trust and breaks the save-for-Saturday flow.
**Fix commit:** _(local, dropyard_backend/src/routes/items.ts + dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx)_
**Re-tested:** ⏳ Awaiting prod re-test.
**Notes:**
  1. **Backend**: new public route `GET /api/items/sneak-peek` returns DROP-pool DRAFT items for the current drop with seller + photo URLs resolved. Returns empty during LIVE phase (those items are already in /api/items). Verified locally: `curl /api/items/sneak-peek` → `{items: [], phase: "SUBMISSION", dropId: "..."}`.
  2. **Frontend**: dashboard root fetches once on mount when `accessToken` is present; adapts `{id, t, estPrice, img, cat, seller, hood, dist}` from the API shape; falls back to the hardcoded `sneakPeekItems` array only when no auth (preview routes) or the API returns 0 items (so the marketing surface still has visible content). The adapted shape's `img` prefers `photos[0]` over category emoji, so BUG-035's `<ItemImage>` helper renders real photos. Threaded as `sneakPeekSource` prop down through `DiscoverPage → PreviewStrip` and into `SneakPeekListPage`.
  3. Item save/unsave still funnels through the existing `togglePreview` flow (watchlist). No save-flow changes needed.

### BUG-035  ·  P0  ·  Uploaded item photos render as 72px text strings on buyer dashboard + homepage (live user report)  ·  Status: Fixed (verify)
**Title:** Sellers uploaded photos this weekend that were correctly persisted as S3 keys (and resolved to full URLs by the backend `withResolvedPhotos` helper). On the buyer dashboard and the homepage's "Featured This Week" strip, the photo URL was rendered as a 72-160px-font TEXT string instead of an `<img>` tag — buyers saw the literal `https://…s3…amazonaws.com/…jpg` URL on the card where the picture should be.
**Found by:** Real users (weekend deployment) → reported by Narveer · **Found date:** 2026-06-05 · **Test case:** _live UX feedback_
**Repro steps:**
1. Sign in as a seller, list an item, upload at least one photo (this works correctly).
2. Sign in as a buyer, open Discover. The card for that item shows the URL as text instead of the image.
3. Same on `/` (homepage Featured) once that section started fetching real items.
**Expected:** The uploaded photo renders inside the card image area, with the category emoji as fallback only when no photos exist.
**Actual (before fix):** Every render site in `DropYard_BuyerDashboard.jsx` (7+ of them) and `app/page.tsx` (1) treated `item.img` / `item.image` as text — works for the demo emoji defaults, breaks visibly when a real photo URL lands there.
**Impact:** P0 — first impression for every real user is a broken UI. Sellers' uploads silently appear non-functional. Discovered post-deploy.
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx + app/page.tsx)_
**Re-tested:** ⏳ Awaiting user verification on prod.
**Notes:** Two-layer fix:
  1. **Buyer dashboard**: added an inline `<ItemImage src emojiSize imgStyle spanStyle/>` helper that detects URL vs emoji (`/^(https?:\/\/|data:image\/)/i`) and renders `<img>` or `<span>` accordingly. Applied at every site that previously stuffed `item.img` (or `c.item.img` / `tx.img` / `c.e`) into a sized span: ItemCard, PreviewItemDetail, SneakPeekListPage, PreviewStrip, ClaimModal item summary, AskModal item summary, ItemDetailView hero, ClaimsPage row, HistoryPage row, MessagesPage conversation list, MessagesPage active thread header. Also upgraded `adaptConversation` and `adaptBuyerClaim` so messages and claims rows surface real photos when available (previously always category emoji).
  2. **Homepage** (`app/page.tsx`): same conditional render at the Featured `ItemCard`. Also fixed the API adapter which only ever set `image: CATEGORY_EMOJI_HOME[...]` — now uses `photos[0] || emoji` so the homepage actually surfaces real listings.
  3. `<img>` has an `onError` handler that hides the broken image element silently rather than showing a default browser placeholder if the S3 URL ever fails.
  4. No backend change needed — `withResolvedPhotos` was always returning correct URLs. The bug was purely client-side rendering. No migration required.

### BUG-034  ·  P3  ·  Inconsistent invalid-filter handling across admin list endpoints  ·  Status: Open
**Title:** `/api/admin/moving-sales?status=NOPE` returns 400 (guarded post-BUG-019), but `/api/admin/submissions?status=NOPE`, `/api/admin/submissions?type=NOPE`, and `/api/claims/incoming?status=NOPE` silently fall back to default and return 200. Behavior is inconsistent across similar-shape endpoints.
**Found by:** Narveer · **Found date:** 2026-06-04 · **Test case:** TC-D8.1b/c + TC-C11.9
**Repro steps:** `curl /api/admin/submissions?status=NOPE` → 200 with all submissions. `curl /api/admin/moving-sales?status=NOPE` → 400 "Invalid status".
**Expected:** Consistent behavior across all list endpoints — either all guard with 400 (preferred for early error surfacing) or all fall back (preferred for resilience).
**Actual:** Two endpoints reject, two endpoints fall back.
**Impact:** P3 — no functional bug, no crash, no data leak. Just a developer-experience inconsistency that makes the API harder to reason about. The cross-cutting test plan TC-C11 #1 explicitly says "falls back to default OR 400" — so both branches are technically acceptable.
**Notes:** Worth aligning to one pattern when there's time. Recommendation: surface as 400 with `Invalid status` for all filter params, mirroring how the moving-sales handler does it (early validation against the enum). Defer until there's a cohesive API-cleanup pass — not worth one-off-fixing the three endpoints today.

### BUG-033  ·  P2  ·  PATCH /api/admin/moving-sales/:id/reject silently accepts (and discards) rejection reason  ·  Status: Fixed (verify)
**Title:** The route handler at `dropyard_backend/src/routes/admin.ts:665` took no `reason` field from the request body and wrote no rejection reason to the database. The admin frontend's reject button at `MovingSaleDetailPanel` also sent no body. The seller, when notified, had no idea why their application was rejected.
**Found by:** Narveer · **Found date:** 2026-06-04 · **Test case:** TC-D7.7c (reject without reason, expected 400 per docs)
**Repro steps (before fix):**
1. As admin, `curl -X PATCH /api/admin/moving-sales/:id/reject -d '{}'`
2. **Actual:** 200, status flips to REJECTED, no reason stored.
**Expected:** 400 "rejection reason is required".
**Impact:** P2 — rejected seller had no actionable feedback. Audit log had nothing on rejections either, so the admin team couldn't review past decisions.
**Fix commit:** _(local, dropyard_backend/prisma/schema.prisma + migration 20260604103115_add_moving_sale_rejection_reason + src/routes/admin.ts + dropyard_frontend/app/admin/(authed)/moving-sales/page.tsx)_
**Re-tested:**
  - ✅ POST without `reason` body → 400 "A rejection reason is required."
  - ✅ POST with whitespace-only reason → 400
  - ✅ POST with valid reason → 200, reason persisted to `MovingSale.rejectionReason`
  - ✅ GET /:id surfaces `rejectionReason` in response
  - ✅ Audit log entry `MOVING_SALE_REJECTED` created with `reason` and `payload: { from, to: 'REJECTED' }`
  - ✅ Oversized (2001 char) reason → 400 (max 2000)
  - ✅ Frontend admin UI: clicking Reject now toggles a rose-tinted textarea + "Confirm Reject" / "Cancel" footer; required client-side; on success the side panel footer reads `Rejected — "…"` for the persisted reason.
**Notes:**
  1. Schema: added `rejectionReason String?` on `MovingSale`, applied migration `20260604103115_add_moving_sale_rejection_reason`.
  2. Backend: `/reject` now validates `reason` (non-empty, ≤2000 chars) and writes a `MOVING_SALE_REJECTED` audit log entry inside a `$transaction` alongside the status update. Symmetric `MOVING_SALE_APPROVED` audit entry was added to `/approve` for parity — admin history now captures both sides.
  3. Frontend: `MovingSaleDetailPanel` adds `rejectMode` state that swaps the footer from the approve form to a reason textarea. The persisted `rejectionReason` is surfaced in the read-only footer (`Rejected — "…"`).
  4. TypeScript cast (`as Prisma.MovingSaleUpdateInput`) on the data field — Windows EPERM file lock blocked `prisma generate` while backend ran; the column exists in the DB and the cast unblocks TS until `prisma generate` is re-run on next backend restart.
  5. Notification email — deferred. The reason is now in the DB; a future pass can surface it in the seller-rejected email template.

### BUG-032  ·  P1  ·  POST /api/watchlist/:itemId crashes backend on nonexistent itemId  ·  Status: Fixed (verify)
**Title:** When a buyer hits `POST /api/watchlist/:itemId` with an itemId that doesn't exist, the Prisma `upsert` fires a foreign-key constraint violation against `Watchlist.itemId → Item.id`. The handler has no try/catch, so the unhandled promise rejection takes the Node process down. Same root-cause pattern as BUG-019 (missing validation + missing try/catch on a route that touches a relational FK).
**Found by:** Narveer · **Found date:** 2026-06-04 · **Test case:** TC-C12.7 (POST /api/watchlist/:nonexistent)
**Repro steps:**
1. Sign in as any buyer, capture token T.
2. `curl -X POST http://localhost:4000/api/watchlist/nope_xxxxxxxxxxxxxxxxxxxxxx -H "Authorization: Bearer T"`
3. Backend process exits (or hangs on the next request).
**Expected:** 404 "Item not found" with backend still alive.
**Actual (before fix):** Request hangs → connection drops → next curl gets 000 (couldn't connect).
**Impact:** P1 — anyone with a valid auth token (i.e. any signed-in buyer) can crash the entire backend with one request. While auth is required, this is still a denial-of-service vector. Beyond DoS, it broke Wave C testing mid-sweep (TC-C12.8-12.10 returned 000 not because their unauth was rejected, but because the backend had died from 12.7).
**Fix commit:** _(local, dropyard_backend/src/routes/watchlist.ts)_
**Re-tested:** ✅ TC-C12.7 now returns 404 with `{"error":"Item not found"}`. Backend stays alive. All other 12.x cases pass.
**Notes:** Two-part fix in `routes/watchlist.ts`: (a) pre-check `prisma.item.findUnique({ where: { id: itemId }})` and return 404 if missing — clean primary fix; (b) wrap the upsert in try/catch as defense-in-depth in case a concurrent item delete races between the check and the upsert (still surfaces as 500 instead of crashing). Also added try/catch around the DELETE handler for consistency, though `deleteMany` is naturally idempotent and didn't have the same crash risk.

### BUG-031  ·  P2  ·  Seller TopNav first-paint flicker on mobile — JS isMobile branches caused desktop layout to render briefly  ·  Status: Fixed (verify)
**Title:** Resolves the deferred limitation flagged in BUG-030. The seller TopNav and main content area used JS `isMobile` branches for grid columns, paddings, heights, and show/hide of search/sidebar-toggle. On mobile devices the SSR HTML rendered the desktop layout (because `useViewport` defaults to width=1280 server-side), then hydrated and re-rendered as mobile — producing a visible flicker at first paint, brief horizontal overflow, and a momentarily mis-aligned breadcrumb.
**Found by:** Carry-over from BUG-030 · **Found date:** 2026-06-04 · **Test case:** _mobile review during Phase 2_
**Repro steps (before fix):**
1. Open `/buyer` on a real mobile device. Switch to Seller via the truck pill.
2. Observe: brief frame of TopNav with 240px logo column + desktop search bar + "Seller /" breadcrumb, then re-renders as mobile.
**Expected:** Mobile layout from SSR HTML / first paint, no flicker.
**Actual (before fix):** Desktop layout in SSR → flicker → mobile layout after hydration.
**Impact:** P2 — purely visual, no broken functionality. But noticeable on every seller-mode load and felt unprofessional.
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_SellerDashboard.jsx + app/globals.css)_
**Re-tested:** ⏳ Requires hard refresh.
**Notes:** Refactored the TopNav SHELL to be CSS-driven instead of JS-driven:
  1. Added CSS classes to `globals.css`: `.dy-seller-topnav` (header grid, height, padding, gap), `.dy-seller-topnav__logo-zone` (border, padding), `.dy-seller-topnav__logo` (height), `.dy-seller-topnav__breadcrumb` (font), `.dy-seller-topnav__right` (gap), `.dy-seller-topnav__bell` (size + hover), `.dy-seller-main` (main padding incl. mobile bottom-nav clearance).
  2. Each class has desktop defaults + `@media (max-width: 768px)` overrides.
  3. Removed `useViewport()` from `TopNav` entirely. All layout flips happen via CSS now — meaning the SSR HTML is correct for any viewport.
  4. Used `.dy-desktop-only` to hide the sidebar toggle, "Seller /" breadcrumb prefix, and search bar on mobile; `.dy-mobile-only` already hid Switch-to-Buyer on desktop.
  5. Hardcoded `#EDE8E0` (C.fawn) in the CSS — flagged in a CSS comment that this needs to stay in sync with the JSX color constants.
**Out of scope** (kept JS `isMobile`): inner-view content (Overview, MyItemsView, ManualItemForm, etc) still uses `useViewport()`. Those flicker too, but to a much smaller degree because by the time content matters, hydration is usually complete. A follow-up pass could convert them too, but the shell was the visible problem.

### BUG-030  ·  P1  ·  Seller dashboard mobile view completely broken — sidebar visible, no bottom nav, horizontal scroll  ·  Status: Fixed (verify)
**Title:** Mirror of BUG-029 but for the seller dashboard. After switching to seller mode, mobile users see the desktop sidebar bleeding into the viewport, no mobile bottom nav, and horizontal scroll.
**Found by:** Narveer · **Found date:** 2026-06-04 · **Test case:** _mobile review during Phase 2_
**Repro steps:** Open `/buyer`, switch to Seller via the truck pill, view on mobile width.
**Expected:** Mobile-friendly layout — sidebar hidden, bottom nav visible, content fits viewport.
**Actual (before fix):** Sidebar rendered at top, content shifted off-screen, no bottom nav.
**Impact:** P1 — same severity as BUG-029. Primary product surface unusable on mobile.
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_SellerDashboard.jsx + app/globals.css)_
**Re-tested:** ⏳ Requires hard refresh.
**Notes:** Mirrored the BUG-029 fix pattern to seller dashboard:
  1. `Sidebar` now renders unconditionally (removed `{!isMobile && ...}` gate). Added `className="dy-desktop-sidebar"` to the `<aside>`. CSS rule in globals.css hides on `max-width: 768px`.
  2. `MobileBottomNav` now renders unconditionally (removed `{isMobile && ...}` gate). Added `className="dy-mobile-bottom-nav"`. Same CSS rule from BUG-029 already hides on `min-width: 769px`. Bumped z-index 50 → 60 for parity with buyer.
  3. The same mobile-scoped `body { overflow-x: hidden }` from globals.css catches any remaining transient overflow during the SSR-to-mobile re-render (TopNav's `gridTemplateColumns: isMobile ? "auto 1fr auto" : "240px auto 1fr auto"` still renders the 240px desktop logo column on SSR; will be visible briefly before mobile layout kicks in).
**Known follow-up**: TopNav and various `isMobile`-dependent inline styles in seller dashboard still cause a brief desktop-flash on first paint. Same root cause as BUG-029 — `useViewport` defaults to width=1280 on SSR. The CSS clip masks it but doesn't eliminate the flicker. Proper fix is to convert layout primitives (grid columns, sidebar width, main padding) to CSS classes with media queries instead of JS `isMobile` branches. Deferred — too large for this turn.

### BUG-029  ·  P1  ·  Mobile bottom nav (Discover/Saved/Claims/Messages/You) only appears after scrolling on /buyer  ·  Status: Fixed (verify)
**Title:** On real mobile devices, the bottom nav strip doesn't show on initial page load. It pops in only after the user scrolls or some other re-render is triggered. Major UX regression because the bottom nav is the only mobile-primary navigation.
**Found by:** Narveer · **Found date:** 2026-06-04 · **Test case:** _mobile review during Phase 2_
**Repro steps:**
1. Open `/buyer` on a real mobile device.
2. On first paint, no `MobileBottomNav` visible.
3. Scroll the page. Bottom nav appears.
**Expected:** Bottom nav present from the first paint.
**Actual:** SSR HTML doesn't contain the bottom nav. Hydration eventually adds it.
**Impact:** P1 — primary mobile navigation invisible until user discovers it via scrolling. Combined with the horizontal-scroll regression (BUG-028), the mobile experience was broken.
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx + app/globals.css)_
**Re-tested:** ⏳ Requires hard refresh on a mobile-width browser.
**Notes:** Root cause: `useViewport` initializes width to `typeof window !== "undefined" ? window.innerWidth : 1280`. On SSR, `window` is undefined → 1280 → `isMobile=false` → `{isMobile && <MobileBottomNav/>}` gates the nav OUT of SSR HTML. On the client, hydration eventually runs the resize/effects → `isMobile=true` → React inserts the nav → user sees it appear. The "scrolling reveals it" perception is just the hydration timing. **Fix**: render `MobileBottomNav` UNCONDITIONALLY (no `{isMobile && ...}` gate) and hide it on desktop via a CSS media query (`@media (min-width: 769px) { .dy-mobile-bottom-nav { display: none } }`). Now the nav is in SSR HTML on every page; CSS decides visibility per viewport. No more hydration-timing pop-in. Also applies to the same pattern in the seller dashboard (deferred — not changed this turn). Same root cause likely explains part of BUG-028 (horizontal scroll): the desktop layout briefly renders during the SSR-to-mobile transition. Added a mobile-only `body { overflow-x: hidden }` rule scoped to `@media (max-width: 768px)` to clip the transient overflow without affecting desktop.

### BUG-028  ·  P2  ·  Buyer dashboard scrolls horizontally on mobile — page wider than viewport  ·  Status: Defensive fix applied (verify)
**Title:** After Phase 2 + the FilterRail hooks fix, `/buyer` on mobile widths scrolls horizontally. Some descendant of the dashboard's outer container is wider than the viewport.
**Found by:** Narveer · **Found date:** 2026-06-04 · **Test case:** _mobile review during Phase 2_
**Repro steps:** Open `/buyer` at a mobile width (≤768px). Drag horizontally — page scrolls left/right when it shouldn't.
**Expected:** Page fits the viewport width. No horizontal scroll.
**Actual (before fix):** Horizontal scroll appeared. Did NOT exist before Phase 2.
**Impact:** P2 — page is usable but feels broken. Visual content slides off-screen.
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx)_
**Re-tested:** ⏳ Requires hard refresh.
**Notes:** Defensive fix — added `overflowX: "hidden"` to the dashboard's outer wrapper div (line ~4895). This clips any descendant overflow without needing to identify the exact offending element. Did NOT find the root cause — checked grids (all `auto-fill minmax(220-260px, 1fr)` which collapse to 1 col at 328px content width, safe), checked MobileFilterBar (uses `flex: 1` for search + `flexShrink: 0` for 44px button, fits), checked TopBar (logo + SwitchToSellerButton compact + UserMenu, ~180px total + gaps, fits at 360px). Suspect a transient SSR-vs-client mismatch where the desktop `FilterRail` capsule renders during SSR (because `useViewport`'s initial width defaults to 1280) and briefly overflows mobile before the client re-renders as `MobileFilterBar`. The `overflowX: hidden` masks that transient state. Should investigate properly when there's time — but this unblocks users today.

### BUG-027  ·  P1  ·  "Switch to Seller" still inaccessible on buyer mobile after BUG-023 fix — UserMenu dropdown is not discoverable  ·  Status: Fixed (verify)
**Title:** BUG-023 added "Switch to Seller" to the mobile UserMenu dropdown. User reported it was still inaccessible — they didn't realize they had to tap the avatar to find it.
**Found by:** Narveer · **Found date:** 2026-06-04 · **Test case:** _mobile review during Phase 2 (follow-up to BUG-023)_
**Repro steps:** Open /buyer on mobile width. Look for any Switch to Seller affordance in the visible UI without opening menus.
**Expected:** Affordance is visible (or has a discoverable hint) without requiring user to discover the avatar dropdown.
**Actual (before this fix):** Switch to Seller existed only inside UserMenu dropdown (which itself requires tapping the unlabeled avatar to discover).
**Impact:** P1 — same impact as BUG-023 (no path from buyer to seller dashboard on mobile). The BUG-023 fix nominally restored the feature but UX-tested it was still effectively hidden.
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx)_
**Re-tested:** ⏳ Requires hard refresh.
**Notes:** Replaced the BUG-023 approach. Now `SwitchToSellerButton` renders on mobile too, in a compact icon-only variant: just the Truck-icon tile, no label, no arrow. Added `compact` prop to the component (default false on desktop, true on mobile). Removed the duplicate menu item from UserMenu — single source of truth in the topbar pill. The icon-only mobile version is ~40×40px (touch-friendly), still amber-tinted so it matches the desktop pill's affordance, with `aria-label` and `title` for screen readers / hover tooltip. UserMenu no longer needs the `onSwitchRole` prop; removed it from both component signature and call site.

### BUG-026  ·  P1  ·  FilterRail violates Rules of Hooks — buyer Discover page crashes at SSR/mobile boundary  ·  Status: Fixed (verify)
**Title:** `FilterRail` in `DropYard_BuyerDashboard.jsx` calls `useState` × 3 and `useEffect` AFTER an `if (isMobile) return <MobileFilterBar/>` early return. When `isMobile` flips (which happens during SSR hydration: server `width=1280→isMobile=false`, client reads actual viewport), the hook count changes and React throws.
**Found by:** Narveer · **Found date:** 2026-06-04 · **Test case:** _mobile review during Phase 2_
**Repro steps:**
1. Open `/buyer` on mobile width (≤768px).
2. Browser console / Next.js overlay shows: "React has detected a change in the order of Hooks called by FilterRail" → followed by "Rendered more hooks than during the previous render."
3. Code: `dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx:1056` — `useViewport()`, then `if (isMobile) return...`, then `useState(null)` × 3 + `useEffect`.
**Expected:** All hooks run unconditionally on every render; the mobile/desktop branch determines only what's returned.
**Actual (before fix):** Hooks 2-5 are skipped when `isMobile=true` but run when `isMobile=false`. React explodes on viewport flip.
**Impact:** P1 — buyer Discover page is unrenderable on mobile or whenever the viewport state changes. The error is also misleading: it surfaces secondary errors (hydration mismatches downstream) that distract from the root cause.
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx)_
**Re-tested:** ⏳ Requires hard refresh at mobile width.
**Notes:** Standard Rules of Hooks fix — moved all hook calls (`useState` × 3 + `useEffect`) above the `if (isMobile) return ...` branch. Added a comment explaining why. Verified there's no similar pattern elsewhere: searched both dashboard files for `if (isMobile)` early returns; the only other match (seller `MyItemsView` line 4288) is inside a `.map()` callback, not a component-level early return — safe.

### BUG-025  ·  P1  ·  /buyer hydration mismatch — server renders loading div, client renders mounted placeholder  ·  Status: Fixed (verify)
**Title:** When `/buyer` loads, React reports a hydration mismatch: server-side HTML contains `BuyerDashboardContent`'s "Checking access" loading div (`h-screen flex items-center justify-center bg-[#f7faf8]`), but client first-render produces `AuthedBuyerContent`'s `!mounted` placeholder (`min-h-screen bg-slate-50`). React re-generates the tree client-side, masking the underlying cause and degrading first paint.
**Found by:** Narveer · **Found date:** 2026-06-04 · **Test case:** _mobile review during Phase 2_
**Repro steps:**
1. Visit `/buyer` (any width).
2. Next.js overlay shows hydration mismatch with className diff: `+ min-h-screen bg-slate-50` (client) vs `- h-screen flex items-center justify-center bg-[#f7faf8]` (server).
**Expected:** Server and client first-paint markup match.
**Actual (before fix):** Server takes `BuyerDashboardContent`'s loading branch (since `useAuth` returns `loading=true, user=null` on SSR). Client first render reaches `AuthedBuyerContent`'s `!mounted` early return with different markup. Hydration mismatch.
**Impact:** P1 — every visit to `/buyer` causes a hydration error and a forced client re-render. Real users see a brief flicker; the broken tree also surfaces cascading errors downstream (the FilterRail hooks bug above was masked by this).
**Fix commit:** _(local, dropyard_frontend/app/buyer/page.tsx)_
**Re-tested:** ⏳ Requires hard refresh.
**Notes:** Pragmatic fix — aligned `AuthedBuyerContent`'s `!mounted` placeholder (2 occurrences, one per `mode` branch) with the exact loading markup from `BuyerDashboardContent`. Now whichever branch the SSR HTML reflects, the client's first-render markup matches byte-for-byte. Did NOT investigate WHY the client first render is reaching `AuthedBuyerContent` when the server takes the loading branch — `AuthProvider`'s `useState` initializes with `loading=true, user=null` identically on both, so they should match. Speculation: React 19 + Next 16 Turbopack runs the initial render in some non-blocking way that allows `useEffect` to complete before hydration validation. Mooting the question by making both branches' fallbacks identical is safer than chasing the discrepancy. Both placeholders now render the "Checking access…" pill on the `#f7faf8` background.

### BUG-024  ·  P2  ·  Buyer mobile bottom nav reportedly missing on Claims page  ·  Status: Defensive fix applied (verify)
**Title:** User reported that on /buyer at mobile width, the MobileBottomNav appears on Saved/Messages but not on Claims.
**Found by:** Narveer · **Found date:** 2026-06-04 · **Test case:** _mobile review during Phase 2_
**Repro steps (per user):** Open /buyer on a mobile-width viewport, navigate to Claims tab from bottom nav.
**Expected:** MobileBottomNav remains visible at the bottom on Claims like every other view.
**Actual (per user):** Bottom nav doesn't appear on Claims.
**Code analysis:** `MobileBottomNav` is rendered unconditionally inside `{isMobile && ...}` at the dashboard root (`DropYard_BuyerDashboard.jsx` ~line 4928). It's `position: fixed; bottom: 0`. Parent has `padding-bottom: calc(76px + env(safe-area-inset-bottom, 0))` so content clears the nav. ClaimsPage (~line 2919) renders no fixed/sticky element that would cover the nav. Only fixed-position element in ClaimsPage scope is the cancel-confirmation modal (z-index 200), which only opens on user action. **Could not reproduce from code review.**
**Impact:** P2 — bottom nav is the only mobile-primary navigation. If broken on Claims, users can't switch tabs without scrolling back to top.
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx — bumped MobileBottomNav z-index 50→60)_
**Re-tested:** ⏳ Awaiting user re-test after dev server restart. If still missing, will need to instrument with browser dev tools to identify what's covering the nav.
**Notes:** Defensive fix only — bumped nav z-index from 50 to 60 to defeat any unknown overlay sitting at z-index 50-59. Did not change the render condition. If issue persists, suspect either (a) a hot-reload / state caching issue where ClaimsPage was rendered before Phase 2 modal edits committed, (b) a viewport-specific behavior we missed, or (c) a per-row action button somehow being interpreted as covering the nav.

### BUG-023  ·  P1  ·  "Switch to Seller" inaccessible on buyer mobile — no way to upgrade role  ·  Status: Fixed (verify)
**Title:** On `/buyer` at mobile width, the "Switch to Seller" entry point is hidden with no replacement. Mobile buyers cannot reach the seller dashboard.
**Found by:** Narveer · **Found date:** 2026-06-04 · **Test case:** _mobile review during Phase 2_
**Repro steps:**
1. Open `/buyer` at mobile width (≤768px).
2. Inspect TopBar — `SwitchToSellerButton` is gated `{!isMobile && <SwitchToSellerButton .../>}` (line 580).
3. Open UserMenu — no Switch to Seller entry there either.
**Expected:** Mobile users have a discoverable path to the seller dashboard.
**Actual (before fix):** Dead end. Mobile buyers must rotate their device or open desktop to switch.
**Impact:** P1 because seller acquisition / role-switch is a primary product flow. The buyer dashboard advertises seller features (e.g. `SellWithAICta`) on Discover, so a buyer who clicks through expects to land on the seller side. On mobile they had nowhere to go.
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx)_
**Re-tested:** ⏳ Requires manual verification at mobile width.
**Notes:** Added a Switch to Seller entry to the mobile UserMenu (avatar dropdown), gated on `isMobile && onSwitchRole`. Uses the same `Truck` icon and amber color as the desktop pill so the affordance is recognizable. UserMenu now accepts an `onSwitchRole` prop and TopBar forwards it. Desktop behavior unchanged (Switch to Seller stays in the TopBar pill where it always was). Note: `DiscoverPage` also has a `SellWithAICta` that wires `onSwitchRole` (line ~4340) — that's a discover-page CTA, not nav. It remains visible on mobile too, but it's discoverable only from one page; the avatar menu is the always-available entry point.

### BUG-022  ·  P1  ·  /join page crashes when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is missing — entire signup/signin unreachable  ·  Status: Fixed (verify)
**Title:** When the Google client ID env var is missing, the /join page throws "Google OAuth components must be used within GoogleOAuthProvider" at render and never recovers. No way to sign in via email/password either, even though that flow doesn't need Google.
**Found by:** Narveer · **Found date:** 2026-06-04 · **Test case:** _runtime regression — surfaced during Phase 1 mobile-responsiveness review_
**Repro steps:**
1. Delete or rename `dropyard_frontend/.env.local` (or simply leave `NEXT_PUBLIC_GOOGLE_CLIENT_ID` unset).
2. Restart `npm run dev`.
3. Visit `http://localhost:3000/join`.
**Expected:** Page renders normally. Google button hides or shows the "not configured" notice; email/password works.
**Actual (before fix):** Runtime error overlay: `useGoogleOAuth → useGoogleLogin → JoinPageContent`. Whole page is unreachable.
**Environment:** Local dev, Next.js 16.1.6 (Turbopack), `@react-oauth/google`. Same code path runs in prod — any prod deploy without `NEXT_PUBLIC_GOOGLE_CLIENT_ID` baked at build time would 500 the entire signup page.
**Impact:** P1 because: signup/signin is the primary entry to the app. A missing env var → entire flow dead. The page already has a conditional render for the Google button (when env empty, it shows an "add NEXT_PUBLIC_GOOGLE_CLIENT_ID" notice). That branch was never reachable because the hook above the JSX threw first.
**Fix commit:** _(local, dropyard_frontend/components/GoogleSignInButton.tsx + app/join/page.tsx)_
**Re-tested:** ⏳ Requires restoring or leaving `.env.local` blank. Typecheck clean.
**Notes:** Root cause was structural — `useGoogleLogin` was called unconditionally at the top of `JoinPageContent`, but `GoogleOAuthProviderWrapper` short-circuits to a no-provider render when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is empty. Hook + no provider = throw. Extracted the Google button into `components/GoogleSignInButton.tsx`; the hook now only mounts when the gate at line 361 (`googleClientId ? ...`) is true. The "not configured" notice branch is now reachable. Side observation: `.env.local` was tracked-but-gitignored earlier this session; it went missing between then and now (likely lost during a `git checkout` / `git restore` somewhere). User needs to recreate it with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

### BUG-021  ·  P2  ·  Drop boundaries stored in UTC, not Ottawa-local — backend/frontend disagree by 4h  ·  Status: Fixed (verify)
**Title:** Backend phase math runs in UTC; frontend phase math runs in local browser time. They disagree by 4h (EDT) or 5h (EST) on when the drop actually opens and closes.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** TC-B15.4 (timezone handling)
**Repro steps:**
1. `curl http://localhost:4000/api/drop/current` → observe `liveStart` ends with `08:00:00.000Z` (UTC)
2. Inspect `dropyard_backend/src/lib/dropCycle.ts:46-60` — `computeDropBoundaries` uses `setUTCHours(hours, 0, 0, 0)` with hours=8 for liveStart, 20 for closedStart.
3. Inspect `dropyard_frontend/lib/dropCycle.ts:42` — `getCurrentDropSaturday` uses `d.setHours(DROP_OPEN_HOUR, 0, 0, 0)` — local time.
**Expected:** Both sides interpret "Saturday 8 AM" identically as 8 AM Ottawa-local (America/Toronto).
**Actual:** Backend treats the boundaries as UTC. liveStart 08:00 UTC = 04:00 EDT / 03:00 EST. Real users in Ottawa get items 4-5 hours before the announced time.
**Environment:** Local dev. Same code path runs in prod.
**Impact:** P2 because: (a) the day-of-week math is correct so the phase is correct most of the week; (b) the 4-5h discrepancy only matters around the actual transitions. But on Saturday morning, the gap is highly visible — buyers see the drop "open" at 4 AM EDT while the UI says "opens 8 AM".
**Fix commit:** _(local, dropyard_backend/src/lib/dropCycle.ts + src/lib/dropSeeder.ts)_
**Re-tested:** ✅ liveStart now 12:00 UTC (= 8 AM EDT). closedStart now Mon 00:00 UTC (= Sun 8 PM EDT). weekOf now Sat 04:00 UTC (= Sat 00:00 EDT). Phase reporting unchanged (Wed → SUBMISSION).
**Notes:** Fix refactored backend `lib/dropCycle.ts` to use `Intl.DateTimeFormat({ timeZone: 'America/Toronto' })` for all wall-clock conversions. New `torontoToUtc()` helper tries EST (UTC-5) and EDT (UTC-4) offsets and picks whichever round-trips back to the input wall-clock — DST-aware, no library needed. `getDropWeekMonday` now uses Toronto's calendar week. `computeDropBoundaries` produces UTC instants that correspond to Toronto 00:00 / 08:00 / 20:00. `getWeekOfDate` returns Sat 00:00 Toronto. Data migration: `ensureCurrentDrop` got a transition clause (±48h window) so existing drops are updated in place. A one-shot `prisma/fix-bug-021.ts` was run to merge the duplicate that slipped through a hot-reload race — 17 items preserved on the canonical drop, empty sibling deleted, all 6 surviving drops re-stamped with the new boundaries. Script deleted after run. Frontend impact: none — already used local time via `setHours()`, which now agrees with the backend on "8 AM Saturday".



## P1 — Fixed this session

### BUG-020  ·  P2  ·  POST /api/items accepts isBundle=true with bundleCount=0  ·  Status: Fixed (verify)
**Title:** Server accepts an inconsistent bundle listing (isBundle true, bundleCount 0). Frontend then renders broken "Bundle of 0" pill.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** TC-B12.12
**Repro steps:**
1. POST /api/items as a valid seller with `isBundle:true, bundleCount:0, bundleContents:["a"]` and an otherwise-valid payload
**Expected:** 400 with a bundle-consistency error.
**Actual (before fix):** 201 Created. Item persists with the bad invariant.
**Environment:** Local dev backend (ts-node-dev)
**Fix commit:** _(local, dropyard_backend/src/routes/items.ts createItemSchema)_
**Re-tested:** ✅ Confirmed 400 with "A bundle listing needs at least one item (bundleCount ≥ 1 and bundleContents non-empty)." post-fix.
**Notes:** Root cause — createItemSchema treated isBundle/bundleCount/bundleContents as independent optional fields. No cross-field invariant. Fix: added `.refine()` on the Zod schema requiring (when isBundle is true) bundleCount ≥ 1 AND bundleContents non-empty. Update path (updateItemSchema) deliberately NOT covered — partial PATCH would need merged-state validation against the existing item which is heavier. Flagged for later if Wave B uncovers an update-flow exploit. The stray test item that got created during repro was deleted via API.

**Sibling guard for BUG-019 fixed pre-emptively:** During the BUG-019 sweep, found `admin.ts:582` (`GET /api/admin/moving-sales`) had the same unguarded `?status=` cast. Added the same `Object.values(MovingSaleStatus).includes(status)` runtime guard so a bogus `?status=NOPE` returns 400 instead of crashing the dev server. All other enum-query handlers verified safe (admin user list, admin submissions list, claims status filter — all already use Set.has or Object.values.includes guards).

### BUG-019  ·  P1  ·  /api/items (invalid category query crashes backend)  ·  Status: Fixed (verify)
**Title:** GET /api/items?category=anything-bogus throws an unhandled PrismaClientValidationError that crashes the ts-node-dev process.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** TC-B12.3 (invalid filter)
**Repro steps:**
1. `curl http://localhost:4000/api/items?category=NOPE`
**Expected:** 400 with "Invalid category" body OR 200 with empty results.
**Actual:** Server logs `PrismaClientValidationError: Invalid value for argument 'category'. Expected ItemCategory.` and the dev server terminates. Any subsequent request fails with connection refused until backend is restarted.
**Environment:** Local dev (ts-node-dev). Same crash would happen in prod (Express's default behavior on unhandled promise rejection is to terminate).
**Fix commit:** _(local, dropyard_backend/src/routes/items.ts)_
**Re-tested:** Pending backend restart + re-run TC-B12.3.
**Notes:** Root cause — items.ts:297 used `category as ItemCategory` which is a TypeScript compile-time cast, not a runtime check. The raw query string passed through to Prisma's where clause; Prisma rejected it; the async route had no try/catch, so the rejection propagated as an unhandled promise rejection that killed the Node process. Fix: (1) added `Object.values(ItemCategory).includes(category)` runtime guard — bad input now returns 400 "Invalid category"; (2) parseInt safety guard on page/limit; (3) wrapped the entire handler in try/catch so any future surprise throw returns 500 cleanly instead of crashing the server. Defense in depth — the guard handles the known case, the try/catch covers anything else.

**Same anti-pattern likely exists elsewhere.** Worth a sweep of other route handlers that accept enum strings from query params — claims status filter (`?status=`), admin users filter (`?role=`), admin submissions filter, etc. Each one should be guarded against bogus enum values. Will flag during Wave D testing.





## Recently closed

### BUG-018  ·  P2  ·  Sweep for remaining fake countdowns (homepage dead code, /for-buyers, dashboard item-detail strings)  ·  Status: Fixed (verify)
**Title:** After BUG-017, a sweep found three more fake countdowns across public + dashboard surfaces.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** exploratory (BUG-017 follow-up)
**Repro steps:** Open /for-buyers — observe hero "Drop ends in 23:44:59" ticking down to 0 then looping to 23 again, disconnected from the real drop cycle.
**Expected:** All time-based UI matches the canonical drop cycle.
**Actual (before fix):**
1. `app/page.tsx:285` — `DropCountdown` function defined with fake `{hours: 23, minutes: 45, seconds: 32}` state that wraps at 47h. DEAD CODE — never imported or rendered anywhere.
2. `app/for-buyers/page.tsx:46` — fake countdown `{h: 23, m: 44, s: 59}` ticking down, displayed prominently in the hero with hardcoded "Drop ends in" label. Wraps to 23h instead of pointing at a real moment.
3. Active buyer + v2 + final dashboards' `DiscoverPage`: hardcoded `Saturday's Drop opens in <b>2d 14h</b>` body text in the Sneak Peek-related pill.
4. Active seller dashboard's `ManualItemForm`: `(2d 14h away)` hardcoded body text in the "When should this go live?" Calendar pill.
**Fixes:**
1. Deleted `DropCountdown` dead code (replaced with a one-line comment explaining the removal and pointing at DynamicDropCard as the live countdown source).
2. /for-buyers countdown now reads from `getDropCycleInfo(now)`. Phase-aware: LIVE phase → `dropCloseMoment(now)` with label "Drop ends in"; everything else → `nextDropMoment(now)` with label "Drop opens in". SSR-safe null-then-mount pattern.
3+4. Added a tiny SSR-safe `useDropOpenCountdownString()` hook to each of the 4 dashboard files (active buyer + v2 + final buyer + active seller). Returns the formatted compact countdown to next drop open. Used in `DiscoverPage` (buyer) and `ManualItemForm` (seller). Tick interval set to 60s since the compact format only changes at minute boundaries.
**Environment:** Chrome 131, 1280px
**Fix commit:** _(local, app/page.tsx + app/for-buyers/page.tsx + DropYard_BuyerDashboard*.jsx + DropYard_SellerDashboard.jsx)_
**Re-tested:** Pending.
**Notes:** Pattern across BUG-015, BUG-016, BUG-017, BUG-018 is the same anti-pattern: magic values embedded across surfaces instead of derived from `lib/dropCycle.ts`. Now that the helper API is rich (constants + format helpers + nextDropMoment/dropCloseMoment/formatCompactCountdown), any future countdown should reach for those instead of hand-rolling.

### BUG-017  ·  P1  ·  /buyer (countdown disagrees with seller; was hardcoded demo data)  ·  Status: Fixed (verify)
**Title:** Buyer dashboard "Drop opens in" countdown shows different time than seller's "Saturday 8 a.m. 2d 23h" countdown — they targeted the same moment but differed by ~9 hours.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** exploratory (BUG-016 follow-up)
**Repro steps:**
1. Open /buyer Discover tab in "between drops" state — banner says "Drop opens in 2d 14h 23m 40s"
2. Switch to seller mode → Overview tab — hero says "Next Drop · Saturday 8 a.m. (2d 23h)"
3. Compare the two — should match (same target = next Saturday 8 AM)
**Expected:** Both countdowns within a few seconds of each other.
**Actual:** Buyer ~2d 14h, seller ~2d 23h — 9 hour gap that never converges.
**Environment:** Chrome 131, 1280px
**Fix commit:** _(local, components/previews/DropYard_BuyerDashboard.jsx + _v2 + _final)_
**Re-tested:** Pending.
**Notes:** Root cause — the buyer dashboard's AnticipationBand component (line 627) had a HARDCODED demo countdown: `useState({ d: 2, h: 14, m: 23, s: 47 })` that started at "2d 14h 23m 47s" and just ticked down from there, completely disconnected from the real drop cycle. Same fake pattern in WelcomeBand (h:m:s starting at 19:49:32 for the LIVE-drop "ends in" timer). Originally written as design-demo placeholders ("// Demo starts at 2d 14h 23m 47s") and never wired up. Fix: replaced both with real countdowns derived from `nextDropMoment(now)` / `dropCloseMoment(now)` with the same SSR-safe pattern as DynamicDropCard (null-on-first-render so server + client first render produce identical zeros, then useEffect seeds + ticks per second). Applied identically to v2 + final preview files (4 fake countdowns total across 3 files, all fixed).

### BUG-016  ·  P1  ·  /buyer (drop time inconsistency: 10am vs 8am)  ·  Status: Fixed (verify)
**Title:** Buyer dashboard says "Drop opens Saturday 10 AM" while seller dashboard, FAQ, lib/dropCycle.ts, and DB schema all say Saturday 8 AM. Users see contradictory drop times.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** exploratory
**Repro steps:**
1. Sign in. View /buyer Discover page → "The next Drop lands Saturday at 10 AM"
2. Switch to seller mode → "Next Drop · Saturday 8 a.m."
3. Same user, same product, two different drop times.
**Expected:** All surfaces show Saturday 8 AM (canonical per dropCycle.ts and schema.prisma Drop.liveStart).
**Actual:** Buyer dashboard hardcoded 10 AM in 12+ places + a logic bug at line 312 (`hour >= 10` to determine "live" state should be `>= 8`).
**Environment:** Chrome 131, 1280px
**Fix commit:** _(local, components/previews/DropYard_BuyerDashboard.jsx)_
**Re-tested:** Pending.
**Notes:** Root cause — buyer dashboard was authored before team finalized Saturday 8 AM. Magic numbers ("10 AM" / "10AM" strings + the `hour >= 10` comparison in computeDropState) never got updated. Fix: (1) computeDropState line 312 changed from `hour >= 10` to `hour >= 8` with a comment pointing at the canonical source files so future drift is caught; (2) global string replace "10 AM" → "8 AM" and "10AM" → "8AM" inside DropYard_BuyerDashboard.jsx covering badges, banners, item card pills, notification copy, sneak-peek body text, etc. Legitimate pickup-time conversation samples ("Saturday morning, 10am?" lowercase) deliberately left alone — those are buyer/seller pickup negotiations, not drop times.

**Expanded coverage (2026-06-03 follow-up):** Same hardcoded-10am pattern also fixed in DropYard_BuyerDashboard_v2.jsx, DropYard_BuyerDashboard_final.jsx, and DropYard_SellerDashboard.jsx (which had 3 stray "Saturday 10 am" strings the user hadn't noticed yet because they appear in less-visible UI sections — `Next Drop: Saturday 10 am` Calendar pill, `Goes live Saturday at 10 am` description, `Next Drop is Saturday 10 am.` settings hint). Also fixed a stale comment at DropYard_BuyerDashboard.jsx:305 ("Live from Saturday 10:00 AM..."). All pickup-time references ("Saturday 10:00 AM" in pickup slot arrays, "Saturday 10am works" in conversation demos) deliberately left alone — those are flexible pickup negotiations, not drop times.

### BUG-015  ·  P2  ·  / (homepage DynamicDropCard hydration mismatch)  ·  Status: Fixed (verify)
**Title:** Hydration error on homepage — countdown seconds digit differs between server-rendered HTML and client first render.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** exploratory
**Repro steps:**
1. Open / (homepage) in fresh browser
2. Observe DevTools console
**Expected:** No hydration warnings.
**Actual:** "Hydration failed because the server rendered text didn't match the client." — value 53 on client vs 54 on server in CountdownUnit (seconds).
**Environment:** Chrome 131, 1280px
**Fix commit:** _(local, components/previews/DynamicDropCard.jsx)_
**Re-tested:** Pending.
**Notes:** Root cause — `useState(() => new Date())` initializer ran during SSR (server time) AND during initial client hydration (client time, ~1s later). The seconds digit always loses this race because the gap between SSR and hydration is non-zero. Fix: initialize `now` to null so SSR and first client render produce identical markup (all zeros via formatDuration(0)); set `now = new Date()` inside useEffect to seed the real value immediately after mount, then tick every second from there. Sub-frame flicker of 0d 0h 0m 0s before the real countdown appears — visually imperceptible. Downstream computed values (dropInfo, isLive, remaining, time) all guarded against null `now`. Pattern applies to any time-based component that SSRs.

### BUG-014  ·  P2  ·  /verify-email → /buyer (stale banner)  ·  Status: Fixed (verify)
**Title:** After clicking "Continue to DropYard" from the verify-email success page, the "Please verify your email" banner stays visible on /buyer until manual refresh.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** exploratory
**Repro steps:**
1. Sign up; receive verification email
2. Click the verify link → lands on /verify-email which shows success
3. Click "Continue to DropYard" → arrives at /buyer
4. Observe the banner still rendering
5. Refresh manually → banner disappears
**Expected:** Banner gone the moment the user lands on /buyer post-verification.
**Actual:** Banner renders until manual refresh re-mounts AuthContext.
**Environment:** Chrome 131, 1280px
**Fix commit:** _(local, app/verify-email/page.tsx)_
**Re-tested:** Pending.
**Notes:** Root cause — verify-email page called POST /api/auth/verify-email (server updates user.verifiedAt) but never refreshed the cached AuthContext user. EmailVerifyBanner read stale verifiedAt=null and rendered. Fix: call refreshUser() from AuthContext after the API succeeds, before transitioning to the success state. By the time the user clicks "Continue", AuthContext has the updated user object and the banner self-hides. No-op if user isn't signed in (e.g. clicked link in incognito), so safe either way.

### BUG-013  ·  P2  ·  /api/auth/signin (timing-attack enumeration)  ·  Status: Fixed (verify)
**Title:** Signin response time differed measurably between valid-email-wrong-password (~150-300ms, bcrypt runs) and unknown-email (~10ms, bcrypt skipped). Attacker could enumerate valid emails over many timed requests.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** TC-A6 cross-cutting check 7
**Repro steps:**
1. Send N signin requests with `{ email: known-valid@example.com, password: WrongPass1 }` and measure response time
2. Send N signin requests with `{ email: never-registered@example.com, password: Anything1 }` and measure response time
3. Compare medians
**Expected:** Times are comparable (within ~30ms).
**Actual (before fix):** Code at `dropyard_backend/src/routes/auth.ts:188-203` confirmed `prisma.user.findUnique` returned 401 immediately when no user matched; `bcrypt.compare` only ran when user existed. Difference in execution path → measurable timing difference.
**Environment:** Local dev, prod code identical.
**Fix commit:** _(local, dropyard_backend/src/routes/auth.ts)_
**Re-tested:** Pending empirical retest after backend restart clears rate limiter.
**Notes:** Root cause — auth path took shortcut when user didn't exist. Fix: added module-level `TIMING_EQUALIZATION_HASH = bcrypt.hashSync('not-a-real-password-just-for-timing', 12)` computed once at startup (~150ms one-time cost). signin handler now always runs `bcrypt.compare(password, user?.passwordHash ?? TIMING_EQUALIZATION_HASH)` before branching on the result. All three failure cases (no user, Google-only user, wrong password) now take ~the same wall time. Existing error messages preserved — including the "This account uses Google sign-in" message, which is a separate concern (enumeration via error-text rather than timing). Open for future tightening if needed.

### BUG-012  ·  P3  ·  /buyer secondary tabs (PageTitle vertical spacing)  ·  Status: Fixed (verify)
**Title:** Too much vertical space above the title on Saved/Claims/Messages/History — title sits ~70px below the top header, looks floaty.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** exploratory (follow-up to BUG-011)
**Repro steps:**
1. On /buyer, click any non-Discover tab (Saved/Claims/Messages/History).
2. Observe vertical gap between top header and "Back to Discover" button + title.
**Expected:** Title sits close under the top header.
**Actual:** ~70px of dead space (container padding 36px top + back-button margin 16px + container marginBottom 20px when stacking effects).
**Environment:** Chrome 131, 1280px and 360px
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx)_
**Re-tested:** Pending.
**Notes:** Root cause — `PageTitle` had top padding 36px (desktop) / 16px (mobile), container marginBottom 20px/12px, and the new back button added its own marginBottom 16px/12px. All three stacked. Original generous padding was tuned for tabs without a back button — adding the back button compounded the spacing. Fix: trimmed container padding to 4px/0 top, 16px/8px bottom; marginBottom to 12px/8px; back-button marginBottom to 10px/8px; adjusted decorative dots `top` from 38 to 8 to track the new title position. Net savings: ~58px desktop, ~32px mobile.

### BUG-011  ·  P2  ·  /buyer Saved/Claims/Messages/History tabs (no back button)  ·  Status: Fixed (verify)
**Title:** No back button on the four secondary buyer tabs (Saved, Claims, Messages, History) — once a user navigates into one, the only way back to Discover is via the sidebar (which collapses on mobile) or by clicking the Discover sidebar item again.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** exploratory
**Repro steps:**
1. As Sarah, sign in. Land on Discover.
2. Click Saved (or Claims / Messages / History) in the sidebar.
3. Look for a way back to Discover.
**Expected:** A back button at the top of the page that returns to Discover.
**Actual:** No back button. Only the sidebar (hidden on mobile) or the tab item itself can be clicked.
**Environment:** Chrome 131, 1280px and 360px
**Fix commit:** _(local, dropyard_frontend/components/previews/DropYard_BuyerDashboard.jsx)_
**Re-tested:** Pending.
**Notes:** Root cause — the shared `PageTitle` component used by all four tabs had no back-navigation slot. The detail views (ItemDetail, PreviewItemDetail, SneakPeekListPage, RegularSellerProfile) all had their own inline "Back" pill button, but that pattern wasn't centralized. Tabs were originally treated as top-level destinations reached only via the sidebar — assumption breaks on mobile and conceptually for "done browsing, take me back". Fix: added optional `onBack` prop to `PageTitle` that renders a back-pill button reusing the exact same styling as the existing detail-view pattern (ArrowLeft + "Back to Discover"). Threaded the prop through `SavedPage`, `ClaimsPage`, `MessagesPage`, `HistoryPage` signatures, and wired all four call sites in `DropYardBuyerDashboard` to `() => setPage("discover")`. Button says "Back to Discover" (not just "Back") because tab pages have no contextual "back" — being explicit about the destination is clearer UX. Existing detail-view "Back" buttons unchanged for consistency within their context (they go back to whatever tab the user came from, not a fixed destination).

**Not yet applied to:** Seller dashboard's Saved/Claims/etc tabs likely have the same gap (same PageTitle pattern, separate file `DropYard_SellerDashboard.jsx`). Flag for Wave B testing.

### BUG-010  ·  P2  ·  /api/moving-sale + /api/submissions (case-sensitive email)  ·  Status: Fixed (verify)
**Title:** Email fields on moving-sale registration and contact-form submissions stored with original case; mixed-case admin search would miss them despite Prisma's case-insensitive search mode.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** exploratory (flagged in BUG-006 notes)
**Repro steps:**
1. As a seller, submit a Moving Sale registration with contact email `Seller@Example.com`.
2. In admin Submissions view, search for `seller@example.com`.
3. Match works (Prisma `mode: 'insensitive'` saves it), but the stored email is still mixed-case.
**Expected:** Email stored in canonical lowercase form for consistency with User table.
**Actual:** Email stored as user-typed; only the admin search query had case-insensitive matching as a safety net.
**Environment:** Backend prisma seeded local DB
**Fix commit:** _(local, dropyard_backend/src/lib/validation.ts + src/routes/movingSale.ts + src/routes/submissions.ts + src/routes/auth.ts)_
**Re-tested:** Pending.
**Notes:** Root cause — `emailField` Zod helper was defined inline in auth.ts and not exported, so other route files re-rolled their own `z.string().email()` without the normalization transform. submissions.ts had no Zod schema at all — pulled email straight from raw payload via `pickString`. Fix: extracted `emailField`, `passwordPolicy`, and a new `normalizeEmail()` helper to `src/lib/validation.ts`. auth.ts refactored to import (DRY). movingSale.ts uses `emailField`. submissions.ts wraps the raw extracted email in `normalizeEmail()`. Existing rows with mixed-case emails in moving_sale / submission tables aren't auto-fixed — if admin filtering by exact match becomes important, run `UPDATE "moving_sales" SET email = LOWER(email)` and same for submissions.

**Not in scope:** admin user search (admin.ts:119 + admin.ts:363) was already using Prisma `mode: 'insensitive'` — case-insensitive at query time. No fix needed.

### BUG-009  ·  P3  ·  /admin/login (back-button + non-admin signed-in user)  ·  Status: Fixed (verify)
**Title:** /admin/login's authenticated-user guard only handled ADMIN role; a signed-in BUYER or SELLER pressing back from /buyer to /admin/login saw the admin signin form.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** exploratory (flagged in BUG-008 notes)
**Repro steps:**
1. Sign in as a BUYER (Sarah Demo).
2. Manually navigate to /admin/login while signed in.
3. **Expected:** redirect to /buyer.
4. **Actual:** admin signin form rendered.
**Environment:** Chrome 131, 1280px
**Fix commit:** _(local, dropyard_frontend/app/admin/login/page.tsx)_
**Re-tested:** Pending.
**Notes:** Root cause — guard checked `user.role === "ADMIN"`; when a non-admin user was authenticated, the guard skipped, leaving the form visible. Fix: widened to redirect ANY authenticated user — admins to /admin, everyone else to /buyer. Mirrors the pattern applied to /join in BUG-008. router.replace was already in use, so no history-stacking issue at /admin/login.

### BUG-008  ·  P2  ·  /join (back-button while authenticated)  ·  Status: Fixed (verify)
**Title:** Browser back button from /buyer (or /admin) lands on /join while user is still signed in; auth form renders for an authenticated user.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** exploratory
**Repro steps:**
1. Sign in at /join. Land on /buyer.
2. Press browser back button.
3. Observe destination — /join with the auth form visible.
**Expected:** Either the back button skips past /join entirely OR /join redirects authenticated users away.
**Actual:** /join renders the signin form for an already-signed-in user.
**Environment:** Chrome 131, 1280px
**Fix commit:** _(local, app/join/page.tsx + app/forgot-password/page.tsx)_
**Re-tested:** Pending.
**Notes:** Two root causes — (1) /join had no symmetric authenticated-user guard mirroring BuyerDashboardContent's unauthenticated-user guard; (2) handleSubmit and Google onSuccess used router.push("/buyer") instead of router.replace, so /join stayed in history and the back stack pointed at it. Fix: added useEffect that calls router.replace to /buyer or /admin when (!loading && user) on /join AND /forgot-password; switched both router.push calls in /join to router.replace so the auth page is swapped (not stacked) on successful signin. Both halves contribute — without the guard, deep-linking to /join while signed in is still broken; without the replace, the back stack still has /join even after signin.

**Possible same issue elsewhere — not fixed in this pass:** /admin/login likely has the same router.push + no-guard pattern. Flag for TC-A4 testing; if confirmed, same fix applies.

### BUG-007  ·  P3  ·  /join (Remember Me)  ·  Status: Fixed (verify)
**Title:** "Remember me" checkbox on signin was wired to React state but nothing read the value; refresh token TTL was identical whether checked or not.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** TC-A9 (added during forgot-password work)
**Repro steps:**
1. Sign in with Remember me UNCHECKED. Decode dy_refresh_token at jwt.io.
2. Sign in with Remember me CHECKED. Decode dy_refresh_token.
3. Compare expiry claims.
**Expected:** Checked → meaningfully longer TTL (industry norm 30 days). Unchecked → shorter (1 day).
**Actual:** Both produced identical 7-day TTLs (the default JWT_REFRESH_EXPIRES_IN). The checkbox was UI theatre.
**Environment:** Chrome 131, 1280px
**Fix commit:** _(local, dropyard_backend/src/lib/jwt.ts + src/routes/auth.ts + dropyard_frontend/context/AuthContext.tsx + app/join/page.tsx)_
**Re-tested:** Pending TC-A9.
**Notes:** Root cause — the checkbox had a `useState` binding but no consumer; AuthContext.signin took only (email, password); the backend signin schema didn't accept rememberMe. Pure scaffolding-without-implementation. Fix: signinSchema now accepts optional rememberMe; signin route passes { expiresIn: rememberMe ? '30d' : '1d' } to signRefreshToken; signRefreshToken now accepts the override; AuthContext.signin signature widened to (email, password, rememberMe?); /join page passes rememberMe state through. Defaults preserved — callers without rememberMe behave as if unchecked, i.e. 1d refresh.

### BUG-006  ·  P1  ·  /join signup + signin (case-insensitive email)  ·  Status: Fixed (verify)
**Title:** Same email with different capitalization (`User@x.com` vs `user@x.com`) creates two separate accounts; signin with a different casing than signup fails.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** TC-A1 step 17
**Repro steps:**
1. Sign up at /join with email `User@x.com`
2. Sign out
3. Try to sign in with `user@x.com` (same password)
**Expected:** Same account, signin succeeds. Subsequent signup with `user@x.com` is rejected as duplicate.
**Actual:** Signin returns "Invalid email or password". A second signup with `user@x.com` creates a second User row.
**Environment:** Chrome 131, 1280px, local DB
**Fix commit:** _(local, dropyard_backend/src/routes/auth.ts + dropyard_frontend/app/join/page.tsx)_
**Re-tested:** Pending.
**Notes:** Root cause — Postgres unique constraint on `email String @unique` is case-sensitive by default. Signup and signin paths read email as-is from request body, never normalize. Google auth was already lowercasing (lib/googleAuth.ts:74,111) — created an asymmetry where one user could have separate Google + password accounts for the same logical email. Fix: extracted `emailField = z.string().email().transform(v => v.trim().toLowerCase())` in auth.ts, applied to signupSchema + signinSchema so every path that uses these schemas normalizes consistently. Client `app/join/page.tsx` handleSubmit also normalizes (trim + lowercase) before send so the value sent matches what server stores. Defense-in-depth — neither side relies on the other.

**Data migration required:** any existing User rows in the DB with mixed-case emails won't be auto-fixed by the code change. Run `SELECT id, email FROM "User" WHERE email != LOWER(email);` to find them. If duplicates exist (e.g. both `User@x.com` AND `user@x.com`), pick one to keep and delete the other manually. Then `UPDATE "User" SET email = LOWER(email) WHERE email != LOWER(email);` to normalize the rest. For the test row Narveer created during TC-A1, easiest is to delete it via Prisma Studio.

### BUG-005  ·  P1  ·  /join signup + signin  ·  Status: Fixed (verify)
**Title:** Invalid email format ("not-an-email", "user@", "a@b.c") not blocked client-side; error surfaces only as generic server banner.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** TC-A1 step 12
**Repro steps:**
1. Open /join → Sign up tab
2. Enter "not-an-email" in the email field, fill other fields, click Sign Up
**Expected:** Browser email-input validation OR a clear server error (per TC).
**Actual:** Form submits without client-side block; server returns generic "Invalid email address" banner without field highlighting.
**Environment:** Chrome 131, 1280px
**Fix commit:** _(local, app/join/page.tsx)_
**Re-tested:** Pending.
**Notes:** Root cause — email input had `type="email"` but no `required`, no inline check in handleSubmit. Server zod did reject but UX felt unclear. Fix: added `required` + `autoComplete="email"`, added inline pre-submit check with regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, trimmed email before submit. Browser will now block obvious malformed input before the request leaves the page.

### BUG-004  ·  P1  ·  /join signup + auth backend  ·  Status: Fixed (verify)
**Title:** Weak passwords accepted at signup ("12345678" all digits passed; "12345" rejected only by generic server message).
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** TC-A1 step 11
**Repro steps:**
1. Open /join → Sign up
2. Enter password "12345678" (8 digits, no letter)
3. Submit
**Expected:** Client-side validation blocks with "must include letter and number" or similar.
**Actual:** Account created successfully — server only enforced min 8 chars, no complexity.
**Environment:** Chrome 131, 1280px
**Fix commit:** _(local, app/join/page.tsx + dropyard_backend/src/routes/auth.ts)_
**Re-tested:** Pending.
**Notes:** Two root causes — (1) frontend had zero client-side validation: password input had no `required`, no `minLength`, no inline check; (2) backend zod schema only enforced `min(8)` — no complexity. Fix: client now does inline length + letter + number check with specific error messages; input has `required` + `minLength={8}` for signup + `autoComplete="new-password"`; signin path keeps the looser non-empty check so existing accounts can still sign in. Backend: extracted `passwordPolicy = z.string().min(8).regex(/[a-zA-Z]/).regex(/\d/)` and applied to signupSchema, setPasswordSchema, changePasswordSchema (defense in depth). Signin schema unchanged so existing accounts aren't locked out.

### BUG-003  ·  P1  ·  /buyer & /admin (logout)  ·  Status: Fixed (verify)
**Title:** Logout doesn't reliably redirect to /join; sometimes lands on /join?mode=signin or appears to do nothing.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** TC-A2 step 6 (Sign out)
**Repro steps:**
1. Sign in as Sarah at /join
2. From /buyer, click avatar menu → Sign out
3. Observe destination URL
**Expected:** Browser lands on /join cleanly.
**Actual:** Either no visible navigation (await blocks on /api/auth/signout), or lands on /join?mode=signin (BuyerDashboardContent auth guard races with AuthContext signout's hard nav).
**Environment:** Chrome 131, 1280px, demo accounts
**Fix commit:** _(local, AuthContext.tsx + app/buyer/page.tsx)_
**Re-tested:** Pending.
**Notes:** Two root causes — (1) AuthContext.signout awaits the API call before navigating, so slow/dead backend blocks the hard nav; (2) BuyerDashboardContent.useEffect did router.replace("/join?mode=signin") while signout did window.location.href = '/join'. Race condition. Fix: removed the await (fire-and-forget the backend invalidation); aligned both targets to bare '/join'.

### BUG-002  ·  P1  ·  /join signup  ·  Status: Fixed (verify)
**Title:** Signup completes without checking the Terms of Service checkbox.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** TC-A1 (exploratory addition)
**Repro steps:**
1. Open /join, switch to Sign up
2. Fill name/email/password but leave the "I agree to..." checkbox unchecked
3. Click Sign Up
**Expected:** Form blocks, error appears, no account created.
**Actual:** Account is created; user is signed in and redirected to /buyer.
**Environment:** Chrome 131, 1280px
**Fix commit:** _(local, app/join/page.tsx)_
**Re-tested:** Pending.
**Notes:** Root cause — checkbox had no useState binding, no required attribute, and handleSubmit didn't check it. UI implied a contract that the code didn't enforce. Fix: added agreedToTerms state, wired checkbox, added required attribute, guard in handleSubmit, and disabled the submit button until checked.

### BUG-001  ·  P2  ·  /join signup  ·  Status: Fixed (verify)
**Title:** "Terms of Service" and "Privacy Policy" text in signup checkbox label is not clickable / not linked.
**Found by:** Narveer · **Found date:** 2026-06-03 · **Test case:** TC-A1 step 6 (exploratory addition)
**Repro steps:**
1. Open /join → Sign up tab
2. Click on "Terms of Service" or "Privacy Policy" text in the checkbox label
**Expected:** Opens the respective policy page in a new tab.
**Actual:** Nothing happens (just toggles the checkbox via parent <label>).
**Environment:** Chrome 131, 1280px
**Fix commit:** _(local, app/join/page.tsx)_
**Re-tested:** Pending.
**Notes:** Root cause — `<span>` elements styled to look like links (emerald color, cursor-pointer) but no href / onClick / Link wrapper. Placeholder visual styling from the initial design pass never got wired. Fix: replaced spans with Next.js `<Link>` to /community-guidelines (per product decision for TOS) and /privacy-policy, both opening in a new tab with rel="noopener noreferrer".

---

## Template (copy this row for every new bug)

```
### BUG-NNN  ·  [Severity P0/P1/P2/P3]  ·  Page/Surface  ·  Status: Open
**Title:** One-line summary.
**Found by:** Name · **Found date:** YYYY-MM-DD · **Test case:** TC-XX or "exploratory"
**Repro steps:**
1. ...
2. ...
3. ...
**Expected:** What should happen.
**Actual:** What does happen (with console errors / screenshots if relevant).
**Environment:** Browser + version, viewport size, account email.
**Fix commit:** _(filled when status moves to Fixed)_
**Re-tested:** _(filled when status moves to Closed)_
**Notes:** Root cause once known.
```

## Example (delete after first real bug is logged)

```
### BUG-000  ·  P2  ·  /buyer Overview (seller mode)  ·  Status: Closed
**Title:** Shelf count includes SOLD items after pickup.
**Found by:** Narveer · **Found date:** 2026-06-01 · **Test case:** exploratory
**Repro steps:**
1. Log in as Avery Demo
2. Confirm a buyer claim, then mark pickup complete
3. Return to Overview tab
**Expected:** Shelf count decrements by 1.
**Actual:** Shelf count unchanged; sold item still appears in My Items > On the Shelf.
**Environment:** Chrome 131, 1440px, demo-seller@dropyard.local
**Fix commit:** _(local on May29DropF, see [[uncommitted-snapshot-2026-06-01]])_
**Re-tested:** Pending Wave B execution.
**Notes:** Root cause — adaptItem in DropYard_SellerDashboard.jsx mapped any non-DRAFT item to a "published" lifecycle, including SOLD. Filter rewritten to require status === "LIVE". Same filter bug also broke Overview hero counts and ShareSheet.
```
