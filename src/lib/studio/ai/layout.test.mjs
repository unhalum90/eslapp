import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
const { slidePlanSchema } = require('./plan.ts');
const { buildDocument, THEMES } = require('./layout.ts');
const { EXAMPLE_PLANS } = require('./prompts.ts');
const { studioDocumentSchema } = require('../schema.ts');
const fixture = () => structuredClone({ ...EXAMPLE_PLANS[0], pages: [
 EXAMPLE_PLANS[0].pages[0],
 { layout: 'menu', heading: 'Explore', items: [{ label: 'Town', targetPageIndex: 2 }, { label: 'Words', targetPageIndex: 4 }] },
 EXAMPLE_PLANS[0].pages[1],
 EXAMPLE_PLANS[1].pages[1],
 { layout: 'vocabulary', heading: 'Words', items: ['Park', 'School', 'Shop', 'Library'].map(word => ({ word, translation: word, iconName: 'Book' })) },
 EXAMPLE_PLANS[0].pages[2], EXAMPLE_PLANS[0].pages[3],
] });
test('schema rejects invalid icons, text caps, HTML, question answers and menu targets', () => {
 for (const mutate of [p => p.pages[0].iconName = 'InventedIcon', p => p.pages[2].body = 'x'.repeat(421), p => p.pages[2].body = '<b>Hello</b>', p => p.pages[5].correctIndex = 9, p => p.pages[1].items[0].targetPageIndex = 99, p => p.pages[1].items[0].targetPageIndex = 0]) {
   const p = fixture(); mutate(p); assert.equal(slidePlanSchema.safeParse(p).success, false);
 }
});
test('all layouts at every level are deterministic, lint clean and in bounds', () => {
 for (const level of ['6e','5e','4e','3e']) {
   const p = { ...fixture(), level }; const a = buildDocument(p, {seed:'test'}); const b = buildDocument(p, {seed:'test'});
   assert.deepEqual(a,b); assert.equal(a.report.filter(i => i.severity === 'error').length, 0);
   assert.equal(studioDocumentSchema.safeParse(a.document).success,true);
   for (const page of a.document.pages) for (const e of page.elements) {
     assert.ok(e.frame.x >= 0 && e.frame.y >= 0 && e.frame.x + e.frame.width <= 1280 && e.frame.y + e.frame.height <= 720);
     if (e.content.type === 'text') assert.ok(e.content.style.fontSize >= 24);
     if (e.content.type === 'hotspot') { assert.ok(e.accessibility.label); assert.deepEqual(e.interactions,[]); }
   }
 }
});
test('menus and return buttons resolve, hotspots are teacher tasks', () => {
 const {document:d,todo} = buildDocument(fixture(),{seed:'nav'});
 const menu = d.pages[1].elements.filter(e => e.content.type === 'button');
 assert.equal(menu[0].interactions[0].actions[0].target,d.pages[2].id);
 assert.equal(menu[1].interactions[0].actions[0].target,d.pages[4].id);
 for (const p of d.pages.slice(2)) assert.equal(p.elements.find(e => e.content.type === 'button').interactions[0].actions[0].target,d.pages[1].id);
 assert.equal(d.settings.navigationMode,'linear'); assert.equal(todo.length,1);
 assert.ok(d.pages[2].elements.find(e => e.id === todo[0].elementId).name.startsWith('À compléter'));
});
const luminance = color => {
 const rgb = color.slice(1).match(/../g).map(c => parseInt(c,16)/255).map(c => c <= .04045 ? c/12.92 : ((c+.055)/1.055)**2.4);
 return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
};
const contrast = (a,b) => (Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
test('every theme meets WCAG text contrast', () => {
 for (const t of Object.values(THEMES)) { assert.ok(contrast(t.ink,t.background)>=4.5); assert.ok(contrast('#ffffff',t.accent)>=4.5); }
});
test('few shot examples pass schema and layout', () => { for (const p of EXAMPLE_PLANS) assert.equal(buildDocument(slidePlanSchema.parse(p)).report.filter(i=>i.severity==='error').length,0); });

const { applyPagePlan } = require('./edit.ts');
test('page replacement preserves identity and inbound navigation, adding retains existing pages', () => {
 const {document:d} = buildDocument(fixture(),{seed:'edit'});
 const target = d.pages[2].id; const old = structuredClone(d); const menu = structuredClone(d.pages[1]);
 applyPagePlan(d,EXAMPLE_PLANS[1].pages[1],target);
 assert.equal(d.pages[2].id,target); assert.deepEqual(d.pages[1],menu);
 assert.equal(d.pages[2].elements.at(-1).interactions[0].actions[0].target,d.pages[1].id);
 assert.equal(d.pages.length,old.pages.length);
 applyPagePlan(d,EXAMPLE_PLANS[0].pages[1]); assert.equal(d.pages.length,old.pages.length+1);
 assert.throws(()=>applyPagePlan(d,fixture().pages[1]),/menu/);
});
