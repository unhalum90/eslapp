import assert from "node:assert/strict";
import test from "node:test";
import { convertGenially, extractGeniallyJson, htmlToPlainText } from "./convert.ts";

const SLIDE_A = "aaaaaaaa-0000-0000-0000-000000000001";
const SLIDE_B = "bbbbbbbb-0000-0000-0000-000000000002";
const POPUP = "cccccccc-0000-0000-0000-000000000003";

function fixture() {
  return {
    version: 24,
    Genially: { Name: "Sample lesson", SettingGenially: { ShowPage: true } },
    DocumentConfig: { colors: { Primary: "#00003a", Secondary: "#667cf9", Tertiary: "#f2f4fc" } },
    Slides: [
      { Id: SLIDE_B, Name: "2 Copy", Order: 2, Popup: false, Hidden: false, Size: { Width: "1200px", Height: "675px" }, Background: "./images/bg.png", BackgroundColor: "#FFFFFF", SizeBackground: { Width: "1200px", Height: "700px" }, PositionBackground: { PositionTop: "-12px", PositionLeft: "0px" } },
      { Id: SLIDE_A, Name: "Menu", Order: 1, Popup: false, Hidden: false, Size: { Width: "1200px", Height: "675px" }, Background: null, BackgroundColor: "#112233" },
      { Id: POPUP, Name: "Popup", Order: 3, Popup: true, Hidden: false, Size: { Width: "1200px", Height: "675px" }, Background: null, BackgroundColor: "#FFFFFF" },
    ],
    Texts: [
      { Id: "text-1", IdSlide: SLIDE_A, Size: { Width: "600px", Height: "60px" }, Position: { PositionTop: "60px", PositionLeft: "120px" }, Rotation: { Rotatione: "rotate(0deg)" }, ZIndex: 1, Opacity: "1", FontSize: "55px", Color: "rgb(0, 0, 0)", TextMessage: '<div style="font-weight: bold; text-align: center;"><span style="color: var(--genially-tertiary);">Kangaroos &amp; co</span></div>', interactivities: { click: "act-goto" } },
      { Id: "text-empty", IdSlide: SLIDE_A, Size: { Width: "100px", Height: "20px" }, Position: {}, TextMessage: "<p></p>", interactivities: {} },
    ],
    Images: [
      { Id: "img-1", IdSlide: SLIDE_B, Size: { Width: "600px", Height: "337.5px" }, Position: { PositionTop: "0px", PositionLeft: "300px" }, ZIndex: 2, Opacity: "1", Source: "./images/photo.png", interactivities: {} },
    ],
    Areas: [
      { Id: "area-1", IdSlide: SLIDE_B, Size: { Width: "84px", Height: "71px" }, Position: { PositionTop: "52px", PositionLeft: "1024px" }, ZIndex: 3, interactivities: { hover: "act-tooltip" } },
      { Id: "area-2", IdSlide: SLIDE_B, Size: { Width: "100px", Height: "100px" }, Position: { PositionTop: "400px", PositionLeft: "1000px" }, ZIndex: 4, interactivities: { click: "act-parallel" } },
      { Id: "area-idle", IdSlide: SLIDE_B, Size: { Width: "10px", Height: "10px" }, Position: {}, interactivities: {} },
      { Id: "area-close", IdSlide: POPUP, Size: { Width: "50px", Height: "50px" }, Position: { PositionTop: "10px", PositionLeft: "10px" }, interactivities: { click: "act-close" } },
    ],
    Videos: [
      { Id: "video-1", IdSlide: SLIDE_B, Size: { Width: "150px", Height: "90px" }, Position: { PositionTop: "580px", PositionLeft: "780px" }, Source: "https://youtu.be/STj4p1oTk5M" },
    ],
    RichContents: [
      { Id: "rich-1", IdSlide: SLIDE_B, Size: { Width: "130px", Height: "80px" }, Position: { PositionTop: "590px", PositionLeft: "1000px" }, Source: '<iframe src="https://drive.google.com/file/d/abc/preview" width="640"></iframe>' },
    ],
    Svgs: [{ Id: "svg-1", IdSlide: SLIDE_A }],
    interactivityActions: {
      "act-goto": { type: "goToSlide", refId: "r1", target: { slideId: SLIDE_B } },
      "act-tooltip": { type: "htmlTooltip", refId: "r2", html: '<html><body><p><img src="./images/tip.png" style="width: 675px;"></p><p>Fun <strong>fact</strong>&nbsp;here</p></body></html>' },
      "act-parallel": { type: "parallel", refId: "r3", interactivityActions: [
        { type: "playAudio", refId: "r4", source: "./audios/sound.mpga", name: "TasmanianDevilSounds.mp3" },
        { type: "zoom", refId: "r5" },
        { type: "slidePopup", refId: "r6", targetSlideId: POPUP },
      ] },
      "act-close": { type: "closeSlidePopup", refId: "r7" },
    },
  };
}

test("extractGeniallyJson decodes the base64 payload", () => {
  const payload = Buffer.from(JSON.stringify(fixture()), "utf8").toString("base64");
  const html = `<html><script>window.dataBase64="${payload}";</script></html>`;
  const data = extractGeniallyJson(html);
  assert.equal(data.Genially.Name, "Sample lesson");
  assert.throws(() => extractGeniallyJson("<html></html>"), /dataBase64/);
});

test("htmlToPlainText strips tags and decodes entities", () => {
  assert.equal(htmlToPlainText("<p>Hello&nbsp;<b>world</b></p><p>Line&amp;2<br>three</p>"), "Hello world\nLine&2\nthree");
});

test("convertGenially maps slides, elements, media and interactions", () => {
  const result = convertGenially(fixture());
  const { document, media, stats, issues } = result;

  assert.equal(document.title, "Sample lesson");
  assert.equal(document.settings.navigationMode, "linear");
  assert.deepEqual(document.pages.map((page) => page.name), ["Menu", "Page 2", "Popup"], "auto-generated slide names become Page n");
  assert.equal(document.pages[2].hiddenFromNavigation, true, "popup slides are hidden from navigation");
  assert.equal(document.pages[0].background.value, "#112233");

  // Scaling 1200x675 -> 1280x720
  const menu = document.pages[0];
  const title = menu.elements.find((element) => element.content.type === "text");
  assert.ok(title);
  assert.equal(title.frame.x, 128);
  assert.equal(title.frame.y, 64);
  assert.equal(title.frame.width, 640);
  assert.equal(title.content.text, "Kangaroos & co");
  assert.equal(title.content.style.bold, true);
  assert.equal(title.content.style.align, "center");
  assert.equal(title.content.style.color, "#f2f4fc", "palette variables resolve to document colours");
  assert.equal(title.content.style.fontSize, 59);
  assert.deepEqual(title.interactions[0].actions, [{ type: "navigate", target: SLIDE_B }]);
  assert.equal(menu.elements.some((element) => element.name.startsWith("Texte") && element.content.type === "text" && element.content.text === ""), false, "empty texts are dropped");

  const second = document.pages[1];
  const background = second.elements[0];
  assert.equal(background.name, "Fond");
  assert.equal(background.lockedInEditor, true);
  assert.equal(background.accessibility.decorative, true);
  assert.equal(background.frame.y, -13);

  const area = second.elements.find((element) => element.id === "area-1");
  assert.ok(area);
  assert.equal(area.content.type, "hotspot");
  assert.equal(area.content.transparent, true);
  assert.equal(area.interactions.length, 2, "hover tooltip gets a click trigger plus a hover trigger");
  assert.equal(area.interactions[0].trigger, "activate");
  assert.equal(area.interactions[1].trigger, "hoverOrFocus");
  const tooltip = area.interactions[0].actions[0];
  assert.equal(tooltip.type, "tooltip");
  assert.equal(tooltip.text, "Fun fact here");
  assert.ok(tooltip.imageAssetId && document.assets[tooltip.imageAssetId]);

  const parallel = second.elements.find((element) => element.id === "area-2");
  assert.deepEqual(parallel.interactions[0].actions.map((action) => action.type), ["playAudio", "navigate"], "parallel actions are flattened and zoom is dropped");
  const audioId = parallel.interactions[0].actions[0].assetId;
  assert.equal(document.assets[audioId].kind, "audio");
  assert.equal(document.assets[audioId].name, "TasmanianDevilSounds.mp3");

  const video = second.elements.find((element) => element.id === "video-1");
  assert.deepEqual(video.interactions[0].actions, [{ type: "externalLink", url: "https://www.youtube.com/watch?v=STj4p1oTk5M" }]);
  const drive = second.elements.find((element) => element.id === "rich-1");
  assert.equal(drive.content.label, "Audio");
  assert.equal(drive.content.icon, "audio");

  assert.equal(second.elements.some((element) => element.id === "area-idle"), false, "areas without actions are dropped");

  const popup = document.pages[2];
  const close = popup.elements.find((element) => element.id === "area-close");
  assert.deepEqual(close.interactions[0].actions, [{ type: "navigate", target: SLIDE_B }], "closeSlidePopup returns to the opener page");
  const back = popup.elements.find((element) => element.name === "Retour");
  assert.deepEqual(back.interactions[0].actions, [{ type: "navigate", target: SLIDE_B }]);

  assert.deepEqual(media.map((request) => request.zipPath).sort(), ["audios/sound.mpga", "images/bg.png", "images/photo.png", "images/tip.png"]);
  assert.equal(media.find((request) => request.zipPath === "audios/sound.mpga").mime, "audio/mpeg");
  assert.equal(stats.pages, 3);
  assert.equal(stats.popupPages, 1);
  assert.equal(stats.tooltips, 1);
  assert.equal(stats.audio, 1);
  assert.equal(stats.embedsReplaced, 2);
  assert.ok(issues.some((issue) => issue.code === "svg-skipped"));
  assert.ok(issues.some((issue) => issue.code === "drive-embed"));
  assert.ok(issues.some((issue) => issue.code === "video-replaced"));
});

test("convertGenially warns on newer versions and rejects empty exports", () => {
  const data = fixture();
  data.version = 99;
  assert.ok(convertGenially(data).issues.some((issue) => issue.code === "version"));
  assert.throws(() => convertGenially({ Slides: [] }), /diapositive/);
});

test("page backgrounds preserve CSS colours and palette references alongside images", () => {
  const colours = [
    ["rgb(24, 80, 120)", "rgb(24, 80, 120)"],
    ["rgba(24, 80, 120, 0.4)", "rgba(24, 80, 120, 0.4)"],
    ["var(--genially-PRIMARY)", "#00003a"],
    ["var(--genially-missing, var(--genially-secondary))", "#667cf9"],
    ["hsl(120, 100%, 25%)", "rgba(0, 128, 0, 1)"],
    ["hsl(240 100% 50% / 50%)", "rgba(0, 0, 255, 0.5)"],
    ["navy", "navy"],
    ["#1234", "#1234"],
    ["#12345", "#ffffff"],
  ];
  for (const [input, expected] of colours) {
    const data = fixture();
    data.Slides[0].BackgroundColor = input;
    const page = convertGenially(data).document.pages[1];
    assert.equal(page.background.value, expected, input);
    assert.equal(page.elements[0].name, "Fond", "image stays above the colour");
  }
  const data = fixture();
  data.Slides[1].BackgroundColor = null;
  data.Slides[1].Background = "var(--genially-tertiary)";
  assert.equal(convertGenially(data).document.pages[0].background.value, "#f2f4fc");
});

test("text backgrounds survive inline styles without overwriting foreground colours", () => {
  const data = fixture();
  data.Texts[0].TextMessage = '<div style="background-color: var(--genially-secondary); color: white">Heading</div>';
  let title = convertGenially(data).document.pages[0].elements.find(el => el.id === "text-1");
  assert.equal(title.content.style.background, "#667cf9");
  assert.equal(title.content.style.color, "white");
  data.Texts[0].TextMessage = '<div style="background-color: rgb(10, 20, 30)">Heading</div>';
  title = convertGenially(data).document.pages[0].elements.find(el => el.id === "text-1");
  assert.equal(title.content.style.color, "rgb(0, 0, 0)", "background-color is not a foreground declaration");
  assert.equal(title.content.style.background, "rgb(10, 20, 30)");
  data.Texts[0].TextMessage = '<div style="background: coral !important">Heading</div>';
  assert.equal(convertGenially(data).document.pages[0].elements.find(el => el.id === "text-1").content.style.background, "coral");
});

test("empty coloured text panels and coloured areas retain layers, opacity and actions", () => {
  const data = fixture();
  data.Texts[1].Background = "var(--genially-tertiary)";
  data.Areas[0].BackgroundColor = "rgba(0, 40, 80, 0.5)";
  data.Areas[0].Opacity = "0.7";
  data.Areas[2].Background = "#abc";
  const { document, stats } = convertGenially(data);
  const panel = document.pages[0].elements.find(el => el.id === "text-empty");
  assert.equal(panel.content.style.background, "#f2f4fc");
  const area = document.pages[1].elements.find(el => el.id === "area-1");
  assert.equal(area.content.type, "shape");
  assert.equal(area.content.fill, "rgba(0, 40, 80, 0.5)");
  assert.equal(area.opacity, 0.7);
  assert.equal(area.interactions[0].actions[0].type, "tooltip");
  const decoration = document.pages[1].elements.find(el => el.id === "area-idle");
  assert.equal(decoration.content.fill, "#abc");
  assert.equal(decoration.accessibility.decorative, true);
  assert.equal(stats.tooltips, 1);
});

test("cyclic palette references fall back without recursion errors", () => {
  const data = fixture();
  data.DocumentConfig.colors.Primary = "var(--genially-secondary)";
  data.DocumentConfig.colors.Secondary = "var(--genially-primary)";
  data.Slides[1].BackgroundColor = "var(--genially-primary, #112233)";
  assert.equal(convertGenially(data).document.pages[0].background.value, "#112233");
});

test("two-stop page gradients preserve direction, palette and RGB stops", () => {
  for (const [input, expected] of [
    ["linear-gradient(90deg, var(--genially-primary), rgb(10, 20, 30))", { type: "gradient", from: "#00003a", to: "rgb(10, 20, 30)", angle: 90 }],
    ["linear-gradient(to bottom right, #fff 0%, #000 100%)", { type: "gradient", from: "#fff", to: "#000", angle: 135 }],
    ["linear-gradient(red, blue)", { type: "gradient", from: "red", to: "blue", angle: 180 }],
  ]) {
    const data = fixture();
    data.Slides[1].BackgroundColor = input;
    assert.deepEqual(convertGenially(data).document.pages[0].background, expected);
  }
  const data = fixture();
  data.Slides[1].BackgroundColor = "linear-gradient(red, green, blue)";
  assert.ok(convertGenially(data).issues.some(issue => issue.code === "background-style"));
});

test("embedded SVG layers keep palette, transforms, stacking and interactions", () => {
  const data = fixture();
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50" fill="var(--genially-primary)"/></svg>';
  data.Svgs = [{ Id: "svg-panel", IdSlide: SLIDE_A, Source: svg, Size: { Width: 100, Height: 50 }, Position: { PositionTop: 20, PositionLeft: 10 }, Rotation: { Rotatione: "rotate(15deg)" }, ZIndex: -1, Opacity: 0.5, interactivities: { click: "act-goto" } }];
  const result = convertGenially(data);
  const element = result.document.pages[0].elements[0];
  assert.equal(element.id, "svg-panel");
  assert.equal(element.content.type, "image");
  assert.equal(element.frame.rotation, 15);
  assert.equal(element.opacity, 0.5);
  assert.equal(element.interactions[0].actions[0].target, SLIDE_B);
  assert.match(result.media.find(media => media.assetId === element.content.assetId).inlineSvg, /fill="#00003a"/);
  for (const source of ["data:image/svg+xml," + encodeURIComponent(svg), "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64")]) {
    data.Svgs[0].Source = source;
    assert.ok(convertGenially(data).media.some(media => media.inlineSvg));
  }
  data.Svgs[0].Source = "./images/panel.svg";
  const local = convertGenially(data);
  assert.equal(local.media.find(media => media.zipPath === "images/panel.svg").mime, "image/svg+xml");
});
