// node --test tests/overviewState.test.mjs (npm test) — the seller
// Overview's state rules and attention order (components/seller-overview/
// overviewState.ts), at every boundary. Times are real Toronto instants for
// the Drop of Sat 28 Nov 2026 (EST, UTC-5): preview Thu 26 Nov 00:00, live
// Sat 28 Nov 08:00, close Sun 29 Nov 19:00, after until Tue 1 Dec 00:00,
// capped at Thu 3 Dec 00:00. The previous Drop closed Sun 22 Nov 19:00.

import { test } from "node:test";
import assert from "node:assert/strict";
import { overviewState, buildAttention, CLOSING_WINDOW_MS } from "../components/seller-overview/overviewState.ts";

const ms = (iso) => Date.parse(iso);
const current = (extra = {}) => ({
  id: "drop-28", previewStart: "2026-11-26T05:00:00.000Z", liveStart: "2026-11-28T13:00:00.000Z", closedStart: "2026-11-30T00:00:00.000Z",
  afterUntil: "2026-12-01T05:00:00.000Z", afterCap: "2026-12-03T05:00:00.000Z", hadActivity: true, openPickups: 0, ...extra,
});
const closed = (extra = {}) => ({
  id: "drop-21", previewStart: "2026-11-19T05:00:00.000Z", liveStart: "2026-11-21T13:00:00.000Z", closedStart: "2026-11-23T00:00:00.000Z",
  afterUntil: "2026-11-24T05:00:00.000Z", afterCap: "2026-11-26T05:00:00.000Z", hadActivity: true, openPickups: 0, ...extra,
});
const at = (iso, deltaMs = 0) => ms(iso) + deltaMs;
const state = (now, cur = current(), cl = closed()) => overviewState(now, { current: cur, closed: cl });

test("BEFORE → preview days → DURING at the exact boundaries", () => {
  assert.deepEqual(
    [state(at("2026-11-26T05:00:00.000Z", -1)), state(at("2026-11-26T05:00:00.000Z"))].map((s) => [s.state, s.preview]),
    [["before", false], ["before", true]], "preview starts Thursday 00:00");
  const justBefore = state(at("2026-11-28T13:00:00.000Z", -1));
  assert.deepEqual([justBefore.state, justBefore.preview, justBefore.changesAt], ["before", true, ms("2026-11-28T13:00:00.000Z")]);
  const opens = state(at("2026-11-28T13:00:00.000Z"));
  assert.deepEqual([opens.state, opens.closing], ["during", false]);
});

test("DURING: closing in the last 3 hours, up to the close", () => {
  const close = ms("2026-11-30T00:00:00.000Z");
  assert.equal(state(close - CLOSING_WINDOW_MS - 1).closing, false);
  assert.equal(state(close - CLOSING_WINDOW_MS - 1).changesAt, close - CLOSING_WINDOW_MS);
  assert.equal(state(close - CLOSING_WINDOW_MS).closing, true);
  const last = state(close - 1);
  assert.deepEqual([last.state, last.closing, last.changesAt], ["during", true, close]);
});

test("AFTER from the close through Monday, for a seller who took part", () => {
  const close = ms("2026-11-30T00:00:00.000Z"), until = ms("2026-12-01T05:00:00.000Z");
  const s = state(close);
  assert.deepEqual([s.state, s.afterDrop, s.changesAt], ["after", "current", until], "uses this week's Drop before any refetch");
  assert.equal(state(until - 1).state, "after");
  assert.equal(state(until).state, "before", "Tuesday 00:00, no open pickups");
});

test("AFTER extends while pickups from that Drop are open, capped at Thursday 00:00", () => {
  const until = ms("2026-12-01T05:00:00.000Z"), cap = ms("2026-12-03T05:00:00.000Z");
  const cur = current({ openPickups: 2 });
  assert.deepEqual([state(until, cur).state, state(until, cur).changesAt], ["after", cap]);
  assert.equal(state(cap - 1, cur).state, "after");
  assert.equal(state(cap, cur).state, "before");
});

test("a seller with nothing in the last Drop goes straight to BEFORE", () => {
  const close = ms("2026-11-30T00:00:00.000Z");
  assert.equal(state(close, current({ hadActivity: false, openPickups: 0 })).state, "before");
  // Last week's Drop, from Monday: the endpoint's "closed" Drop applies.
  assert.equal(state(at("2026-11-23T12:00:00.000Z"), current(), closed({ hadActivity: false })).state, "before");
});

test("last week's Drop: AFTER on Monday (and Tuesday with open pickups), BEFORE from Thursday", () => {
  assert.deepEqual([state(at("2026-11-23T12:00:00.000Z")).state, state(at("2026-11-23T12:00:00.000Z")).afterDrop], ["after", "closed"]);
  assert.equal(state(at("2026-11-24T05:00:00.000Z")).state, "before");
  assert.equal(state(at("2026-11-25T12:00:00.000Z"), current(), closed({ openPickups: 1 })).state, "after");
  assert.equal(state(at("2026-11-26T05:00:00.000Z"), current(), closed({ openPickups: 1 })).state, "before", "Thursday 00:00: the preview days");
});

const data = (extra = {}) => ({
  claims: [{ claimId: "c1", itemId: "i1", title: "Kids' Bike", photo: null, proposedAt: "2026-11-28T14:00:00.000Z", amount: 50, fullPrice: true }],
  pickups: [
    { claimId: "p1", itemId: "i2", title: "Juicer", photo: null, pickupSlot: null, acceptedAt: "2026-11-28T15:00:00.000Z", conversationId: "v1" },
    { claimId: "p2", itemId: "i3", title: "Lamp", photo: null, pickupSlot: "Today 5–7 pm", acceptedAt: "2026-11-28T15:00:00.000Z", conversationId: "v2" },
    { claimId: "p3", itemId: "i4", title: "Desk", photo: null, pickupSlot: "Friday 2 pm", acceptedAt: "2026-11-28T15:00:00.000Z", conversationId: "v3" },
  ],
  missingDetails: [{ itemId: "i5", title: "Chair", photo: null, missing: ["photo"] }, { itemId: "i6", title: "Rug", photo: null, missing: ["description"] }],
  backOnShelf: [{ itemId: "i6", title: "Rug", photo: null }],
  unsoldInCurrentDrop: 4, messagesWaiting: 2, drafts: 1, ...extra,
});
const kind = (slot) => (!slot ? "unscheduled" : /today/i.test(slot) ? "today" : "upcoming");
const kinds = (rows) => rows.map((r) => r.kind + ("itemId" in r ? ":" + r.itemId : ""));

test("attention order: claims, pickups to confirm, pickups to arrange, details, messages, drafts (no upcoming pickup)", () => {
  const rows = buildAttention({ state: "before", closing: false }, data(), "2026-11-30T00:00:00.000Z", kind);
  assert.deepEqual(kinds(rows), ["claim_review:i1", "confirm_pickup:i3", "arrange_pickup:i2", "missing_details:i5", "missing_details:i6", "messages_waiting", "drafts"]);
});

test("closing row first in the last 3 hours of the Drop only; back on Shelf in AFTER only, once per item", () => {
  const during = buildAttention({ state: "during", closing: true }, data(), "2026-11-30T00:00:00.000Z", kind);
  assert.equal(during[0].kind, "closing");
  assert.equal(during[0].count, 4);
  assert.ok(!buildAttention({ state: "during", closing: false }, data(), "x", kind).some((r) => r.kind === "closing"));
  assert.ok(!buildAttention({ state: "during", closing: true }, data({ unsoldInCurrentDrop: 0 }), "x", kind).some((r) => r.kind === "closing"));
  const after = buildAttention({ state: "after", closing: false }, data(), "x", kind);
  assert.deepEqual(kinds(after).filter((k) => /i6/.test(k)), ["back_on_shelf:i6"], "the Rug once, as back on the Shelf");
  assert.ok(!buildAttention({ state: "before", closing: false }, data(), "x", kind).some((r) => r.kind === "back_on_shelf"));
});

test("nothing to do: no rows", () => {
  const empty = data({ claims: [], pickups: [], missingDetails: [], backOnShelf: [], unsoldInCurrentDrop: 0, messagesWaiting: 0, drafts: 0 });
  assert.deepEqual(buildAttention({ state: "after", closing: false }, empty, "x", kind), []);
});
