import test from "node:test";
import assert from "node:assert/strict";
import {
  groupingSchema,
  groupingErrors,
  hydrateGrouping,
  evaluateGroups,
  groupsComplete,
  moveToGroup,
} from "./domain.ts";
const request = {
  source: "Food and drink",
  level: "A1",
  language: "English",
  groupCount: 2,
  itemCount: 4,
  speech: false,
  sourceOnly: false,
};
const output = () => ({
  title: "Food and drink",
  taskDescription: "Sort the words.",
  help: "Think about what you eat or drink.",
  feedback: "Well sorted!",
  speechLocale: "en-GB",
  groups: [
    {
      title: "Food",
      items: [
        { text: "Apple", hint: "A fruit" },
        { text: "Bread", hint: "For sandwiches" },
      ],
    },
    {
      title: "Drinks",
      items: [
        { text: "Water", hint: "Clear" },
        { text: "Tea", hint: "Often hot" },
      ],
    },
  ],
});
const fixture = () => hydrateGrouping(output(), request);
test("group hydration creates an editable typed draft with stable category relationships", () => {
  const a = fixture();
  assert.equal(a.template, "group_assignment");
  assert.equal(a.status, "draft");
  assert.deepEqual(groupingErrors(a), []);
  const first = a.config.items[0];
  a.config.groups.reverse();
  assert.equal(
    a.config.groups.find((g) => g.id === first.groupId).title,
    "Food",
  );
  assert.notEqual(a.id, fixture().id);
});
test("manual sorting requires evaluation and every card, not just occupied groups", () => {
  const a = fixture();
  let p = {};
  for (const item of a.config.items)
    p = moveToGroup(a, p, item.id, item.groupId);
  assert.equal(groupsComplete(a, p, {}), false);
  assert.equal(groupsComplete(a, p, evaluateGroups(a, p)), true);
  delete p[a.config.items[0].id];
  assert.equal(groupsComplete(a, p, evaluateGroups(a, p)), false);
});
test("wrong assignments can be corrected, returned to bank, and never change authored answers", () => {
  const a = fixture(),
    original = JSON.stringify(a);
  const card = a.config.items[0];
  const wrong = a.config.groups.find((g) => g.id !== card.groupId).id;
  let p = moveToGroup(a, {}, card.id, wrong);
  assert.equal(evaluateGroups(a, p)[card.id], "incorrect");
  p = moveToGroup(a, p, card.id, card.groupId);
  assert.equal(evaluateGroups(a, p)[card.id], "correct");
  p = moveToGroup(a, p, card.id, "");
  assert.equal(p[card.id], undefined);
  assert.equal(moveToGroup(a, p, "missing", wrong), p);
  assert.equal(moveToGroup(a, p, card.id, "missing"), p);
  assert.equal(JSON.stringify(a), original);
});
test("invalid IDs and orphaned group references are rejected", () => {
  const a = fixture();
  a.config.items[0].groupId = "missing";
  assert.equal(groupingSchema.safeParse(a).success, false);
  const b = fixture();
  b.config.items[0].id = b.config.items[1].id;
  assert.equal(groupingSchema.safeParse(b).success, false);
});
test("incomplete drafts can be stored but not played or published", () => {
  const a = fixture();
  a.title = "";
  a.config.items = [];
  assert.equal(groupingSchema.safeParse(a).success, true);
  assert.ok(groupingErrors(a).length >= 2);
});
test("AI must obey requested counts, distinct terms and source-only vocabulary", () => {
  assert.throws(
    () => hydrateGrouping(output(), { ...request, itemCount: 5 }),
    /wrong number/,
  );
  const duplicate = output();
  duplicate.groups[1].items[0].text = " APPLE ";
  assert.throws(() => hydrateGrouping(duplicate, request), /duplicate/);
  assert.throws(
    () =>
      hydrateGrouping(output(), {
        ...request,
        sourceOnly: true,
        source: "Apple\nBread\nMilk\nTea",
      }),
    /outside/,
  );
  assert.doesNotThrow(() =>
    hydrateGrouping(output(), {
      ...request,
      sourceOnly: true,
      source: "apple — pomme\nbread — pain\nwater — eau\ntea — thé",
    }),
  );
});
