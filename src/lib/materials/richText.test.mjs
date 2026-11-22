import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGoogleDocumentHtml,
  sanitizeRichHtml,
  toRichHtml,
} from "./richText.ts";
import {
  GoogleDriveUploadError,
  uploadGoogleDoc,
} from "../google-drive/uploadGoogleDoc.ts";

test("converts an existing Markdown worksheet into rich HTML", () => {
  const html = toRichHtml("# Travel plan\n\n**Name:** ____\n\n- Reef\n- Uluru");
  assert.match(html, /<h1>Travel plan<\/h1>/);
  assert.match(html, /<strong>Name:<\/strong>/);
  assert.match(html, /<ul>/);
  assert.doesNotMatch(html, /^#|\*\*/);
});

test("removes executable markup before preview or export", () => {
  const html = sanitizeRichHtml(
    '<h1 onclick="alert(1)">Safe</h1><script>alert(2)</script><a href="javascript:alert(3)">Link</a>',
  );
  assert.match(html, /<h1>Safe<\/h1>/);
  assert.doesNotMatch(html, /onclick|script|javascript:/i);
});

test("builds a complete HTML document for Google Docs conversion", () => {
  const html = buildGoogleDocumentHtml({
    title: "Australia & sustainability",
    purpose: "Persuasive eco-travel",
    instructions: "Work in pairs.",
    studentHtml: "<h1>Campaign</h1><p>Choose a destination.</p>",
    teacherNotesHtml: "<p>Accept equivalent answers.</p>",
  });
  assert.match(html, /<!doctype html>/);
  assert.match(html, /Australia &amp; sustainability/);
  assert.match(html, /<h1>Campaign<\/h1>/);
  assert.match(html, /Teacher notes \/ answer key/);
});

test("uploads HTML as a native Google Doc with multipart metadata", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, init) => {
    request = { url, init, body: await init.body.text() };
    return new Response(
      JSON.stringify({ id: "doc-123", name: "Travel worksheet", webViewLink: "https://docs.google.com/doc-123" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const result = await uploadGoogleDoc("token", "Travel worksheet", "<h1>Travel</h1>");
    assert.equal(result.id, "doc-123");
    assert.match(request.url, /uploadType=multipart/);
    assert.match(request.init.headers.Authorization, /Bearer token/);
    assert.match(request.body, /application\/vnd\.google-apps\.document/);
    assert.match(request.body, /Content-Type: text\/html/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("surfaces Google Drive API errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: { message: "Drive API is disabled" } }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });

  try {
    await assert.rejects(
      () => uploadGoogleDoc("token", "Worksheet", "<p>Body</p>"),
      (error) =>
        error instanceof GoogleDriveUploadError &&
        error.status === 403 &&
        error.message === "Drive API is disabled",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
