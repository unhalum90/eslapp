import test from "node:test";
import assert from "node:assert/strict";
import {
  orderingSchema,
  orderingErrors,
  hydrateOrdering,
  moveInOrder,
  evaluateOrder,
  orderComplete,
  shuffledOrder,
} from "./domain.ts";
const request = {
  source: "Days of the week",
  level: "A1",
  language: "English",
  itemCount: 3,
  speech: false,
  sourceOnly: false,
  orderMode: "sequence",
};
const output = () => ({
  title: "Days in order",
  taskDescription: "Order these three days.",
  help: "Start with Monday.",
  feedback: "Well done!",
  speechLocale: "en-GB",
  orderMode: "sequence",
  orderingRule: "Put the days in weekly order, starting with Monday.",
  items: [
    { text: "Monday", hint: "" },
    { text: "Tuesday", hint: "" },
    { text: "Wednesday", hint: "" },
  ],
});
const fixture = () => hydrateOrdering(output(), request);
test("hydration creates a validated editable draft with a visible ordering rule and distinct IDs", () => {
  const a = fixture();
  assert.equal(a.template, "simple_order");
  assert.equal(a.status, "draft");
  assert.deepEqual(orderingErrors(a), []);
  assert.equal(new Set(a.config.items.map((i) => i.id)).size, 3);
  assert.notEqual(a.id, fixture().id);
});
test("moving earlier and later shifts other cards while retaining every record", () => {
  const a = fixture();
  const ids = a.config.items.map((i) => i.id);
  assert.deepEqual(moveInOrder(ids, ids[0], 2), [ids[1], ids[2], ids[0]]);
  assert.deepEqual(moveInOrder(ids, ids[2], 0), [ids[2], ids[0], ids[1]]);
  for (const [id, index] of [
    ["missing", 0],
    [ids[0], -1],
    [ids[0], 3],
    [ids[0], 1.5],
    [ids[0], 0],
  ])
    assert.equal(moveInOrder(ids, id, index), ids);
  assert.deepEqual(
    ids,
    a.config.items.map((i) => i.id),
  );
});
test("completion requires every correct position and evaluation, with no duplicate or unknown IDs", () => {
  const a = fixture();
  const ids = a.config.items.map((i) => i.id);
  assert.equal(orderComplete(a, ids, {}), false);
  assert.equal(orderComplete(a, ids, evaluateOrder(a, ids)), true);
  for (const bad of [
    [...ids].reverse(),
    [ids[0], ids[0], ids[2]],
    [ids[0], ids[1], "unknown"],
    ids.slice(1),
  ])
    assert.equal(orderComplete(a, bad, evaluateOrder(a, bad)), false);
  const shifted = moveInOrder(ids, ids[0], 2);
  assert.equal(
    Object.values(evaluateOrder(a, shifted)).filter((r) => r === "correct")
      .length,
    0,
  );
});
test("replay never starts solved, retains cards, and does not mutate the definition", () => {
  const a = fixture();
  const original = JSON.stringify(a);
  const ids = a.config.items.map((i) => i.id);
  for (let i = 0; i < 40; i++) {
    const attempt = shuffledOrder(a);
    assert.notDeepEqual(attempt, ids);
    assert.deepEqual(new Set(attempt), new Set(ids));
  }
  assert.equal(JSON.stringify(a), original);
});
test("empty drafts save structurally but missing titles, rules and ambiguous text prevent play", () => {
  const a = fixture();
  a.title = "";
  a.config.orderingRule = "";
  a.config.items = [];
  assert.equal(orderingSchema.safeParse(a).success, true);
  assert.equal(orderingErrors(a).length, 3);
  const b = fixture();
  b.config.items[1].text = b.config.items[0].text.toUpperCase();
  assert.ok(orderingErrors(b).some((e) => e.includes("distinct")));
  b.config.items[1].id = b.config.items[0].id;
  assert.equal(orderingSchema.safeParse(b).success, false);
});
test("AI counts, modes, source-only constraints, and alphabetical answer ordering are enforced", () => {
  assert.throws(
    () => hydrateOrdering(output(), { ...request, itemCount: 4 }),
    /wrong number/,
  );
  assert.throws(
    () => hydrateOrdering(output(), { ...request, orderMode: "alphabetical" }),
    /ordering rule/,
  );
  assert.throws(
    () =>
      hydrateOrdering(output(), {
        ...request,
        sourceOnly: true,
        source: "Monday\nFriday\nSunday",
      }),
    /outside/,
  );
  const alpha = {
    ...output(),
    orderMode: "alphabetical",
    orderingRule: "Put the words in English A–Z order.",
    items: [
      { text: "tea", hint: "" },
      { text: "apple", hint: "" },
      { text: "bread", hint: "" },
    ],
  };
  const a = hydrateOrdering(alpha, {
    ...request,
    orderMode: "auto",
    sourceOnly: true,
    source: "apple — pomme\nbread — pain\ntea — thé",
  });
  assert.deepEqual(
    a.config.items.map((i) => i.text),
    ["apple", "bread", "tea"],
  );
});
