import assert from "node:assert/strict";
import test from "node:test";
import {
  activitySchema,
  attach,
  cards,
  completed,
  configured,
  evaluate,
  exampleActivity,
  isCorrect,
  newActivity,
  newCard,
  shuffle,
  validationErrors,
} from "./domain.ts";

test("empty draft saves structurally but cannot preview or publish", () => {
  const a = newActivity();
  assert.ok(activitySchema.safeParse(a).success);
  assert.equal(validationErrors(a).length, 4);
});
test("complete example validates and card IDs remain unique after reordering", () => {
  const a = exampleActivity();
  assert.deepEqual(validationErrors(a), []);
  const p = a.config.pairs[0];
  a.config.pairs.reverse();
  assert.ok(isCorrect(a, p.first.id, p.second.id));
  assert.ok(isCorrect(a, p.second.id, p.first.id));
  a.config.pairs[1].first.id = p.first.id;
  assert.equal(activitySchema.safeParse(a).success, false);
});
test("manual checking, wrong attachment, correction, and decoy-independent completion", () => {
  const a = exampleActivity();
  const [cat, dog, bird] = a.config.pairs;
  let state = attach(a, [], cat.first.id, dog.second.id);
  assert.equal(state[0].result, "pending");
  state = evaluate(a, state);
  assert.equal(state[0].result, "incorrect");
  assert.equal(completed(a, state), false);
  state = [];
  for (const p of [cat, dog, bird])
    state = attach(a, state, p.second.id, p.first.id);
  assert.equal(completed(a, state), false);
  state = evaluate(a, state);
  assert.ok(completed(a, state));
  assert.equal(state.length, 3);
  assert.equal(cards(a).length, 7);
});
test("automatic mode evaluates immediately; decoys never match", () => {
  const a = exampleActivity();
  a.config.checkMode = "automatic";
  const p = a.config.pairs[0];
  assert.equal(attach(a, [], p.first.id, p.second.id)[0].result, "correct");
  const decoy = a.config.decoys[0];
  assert.equal(attach(a, [], decoy.id, p.first.id)[0].result, "incorrect");
  assert.equal(isCorrect(a, decoy.id, decoy.id), false);
});
test("cards cannot belong to two attachments or match unknown/self IDs", () => {
  const a = exampleActivity();
  const [p, q] = a.config.pairs;
  const state = attach(a, [], p.first.id, p.second.id);
  assert.equal(attach(a, state, p.first.id, q.first.id), state);
  assert.equal(attach(a, state, q.first.id, q.first.id), state);
  assert.equal(attach(a, state, "missing", q.first.id), state);
});
test("duplicate visible text cannot spoof pair identity", () => {
  const a = exampleActivity();
  const [p, q] = a.config.pairs;
  q.first.text = p.first.text;
  assert.equal(isCorrect(a, q.first.id, p.second.id), false);
});
test("empty optional decoy is ignored, partial decoys fail, max three enforced", () => {
  const a = exampleActivity();
  a.config.decoys = [newCard()];
  assert.equal(configured(a.config.decoys[0]), false);
  assert.deepEqual(validationErrors(a), []);
  a.config.decoys[0].hint = "partially configured";
  assert.ok(validationErrors(a).some((e) => e.path === "decoy-0"));
  a.config.decoys = Array.from({ length: 4 }, newCard);
  assert.equal(activitySchema.safeParse(a).success, false);
});
test("media requires HTTPS, labels, and valid time ranges", () => {
  const a = exampleActivity();
  const c = a.config.pairs[0].first;
  c.type = "audio";
  c.media = {
    url: "javascript:alert(1)",
    label: "",
    startSeconds: 10,
    endSeconds: 3,
  };
  assert.equal(
    validationErrors(a).filter((e) => e.path === "pair-0-first").length,
    3,
  );
  c.media = {
    url: "https://example.com/audio.mp3",
    label: "Listen",
    startSeconds: 1,
    endSeconds: 3,
  };
  assert.deepEqual(validationErrors(a), []);
  c.media.startSeconds = -1;
  assert.equal(activitySchema.safeParse(a).success, false);
});
test("shuffle retains all card records and never mutates the definition", () => {
  const a = exampleActivity();
  const original = JSON.stringify(a);
  const entries = cards(a);
  const shuffled = shuffle(entries);
  assert.notEqual(shuffled, entries);
  assert.deepEqual(
    new Set(shuffled.map((e) => e.card.id)),
    new Set(entries.map((e) => e.card.id)),
  );
  assert.equal(JSON.stringify(a), original);
});
