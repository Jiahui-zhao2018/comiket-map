// Standalone smoke test. Only a fresh browser context and fictional data are used.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 950 },
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const stored = () =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("comiket-circle-note-v1")),
  );
const button = (name) => page.getByRole("button", { name, exact: true });
async function register(name, location) {
  await button("＋ サークルを登録").click();
  const form = page.getByRole("dialog");
  await form.getByLabel("サークル名", { exact: false }).fill(name);
  await form.getByLabel("参加日目", { exact: false }).selectOption("1日目");
  await form.getByLabel("ホール 必須").selectOption("架空ホールA");
  await form.getByLabel("場所 必須").fill(location);
  await form.getByRole("radio", { name: "優先度5（最高）" }).check();
  await form
    .getByLabel("URL または Xの@ユーザー名")
    .fill("https://circle-a.example.invalid");
  await form.getByRole("button", { name: "登録する", exact: true }).click();
  await form.waitFor({ state: "hidden" });
}
async function assertAnchored() {
  const coordinates = await page
    .locator(".map-marker")
    .first()
    .evaluate((el) => {
      const marker = el.getBoundingClientRect(),
        plane = el.parentElement.getBoundingClientRect();
      return {
        x: (marker.x + marker.width / 2 - plane.x) / plane.width,
        y: (marker.y + marker.height / 2 - plane.y) / plane.height,
      };
    });
  assert.ok(Math.abs(coordinates.x - 0.25) < 0.003);
  assert.ok(Math.abs(coordinates.y - 0.3) < 0.003);
}
try {
  await page.goto("http://127.0.0.1:5173/");
  await button("架空サンプル開催回を追加").click();
  await page
    .getByText("架空のサンプル地図・配置です。", { exact: false })
    .waitFor();
  await register("架空サークルA", " A-01a ");
  await page.locator(".map-marker").waitFor();
  assert.equal(
    (await stored()).events[0].circles[0].placement.source,
    "mapping",
  );
  await page
    .getByRole("button", {
      name: "架空サークルAの詳細（優先度5）",
      exact: true,
    })
    .click();
  const details = page.getByRole("region", { name: "サークル詳細" });
  await details.waitFor();
  assert.match(await details.innerText(), /1日目/);
  assert.match(await details.innerText(), /架空ホールA/);
  assert.match(await details.innerText(), /A-01a/);
  assert.equal(
    await details.getByRole("link").getAttribute("href"),
    "https://circle-a.example.invalid",
  );
  await assertAnchored();
  await button("拡大").click();
  await assertAnchored();
  const viewport = page.getByRole("region", { name: "ホール地図" });
  let v = await viewport.boundingBox();
  await page.mouse.move(v.x + 30, v.y + 30);
  await page.mouse.down();
  await page.mouse.move(v.x + 100, v.y + 70, { steps: 5 });
  await page.mouse.up();
  await assertAnchored();
  await page.setViewportSize({ width: 900, height: 850 });
  await page.waitForTimeout(150);
  await assertAnchored();
  await button("全体表示").click();
  const before = JSON.stringify(await stored());
  let p = await page.locator(".map-plane").boundingBox();
  await page.mouse.click(p.x + p.width * 0.55, p.y + p.height * 0.55);
  assert.equal(JSON.stringify(await stored()), before);
  await button("位置を指定・修正").click();
  await viewport.scrollIntoViewIfNeeded();
  p = await page.locator(".map-plane").boundingBox();
  await page.mouse.click(p.x + p.width * 0.55, p.y + p.height * 0.55);
  assert.equal(JSON.stringify(await stored()), before);
  await button("この位置を保存").click();
  let c = (await stored()).events[0].circles[0];
  assert.equal(c.placement.source, "manual");
  assert.ok(Math.abs(c.placement.x - 0.55) < 0.005);
  await button("既存サークルを自動照合").click();
  assert.equal(
    (await stored()).events[0].circles[0].placement.source,
    "manual",
  );
  await page.reload();
  await button("マップ").click();
  await page.locator(".map-marker").waitFor();
  assert.ok(
    Math.abs((await stored()).events[0].circles[0].placement.x - 0.55) < 0.005,
  );
  await register("架空サークルB", "A-02a");
  await register("架空サークルC", "A-02a");
  assert.equal(await page.locator(".map-marker").count(), 3);
  for (const name of ["架空サークルB", "架空サークルC"]) {
    await page.locator(".map-circle").filter({ hasText: name }).click();
    assert.ok((await details.innerText()).includes(name));
  }
  await page
    .locator(".map-circle")
    .filter({ hasText: "架空サークルA" })
    .click();
  await button("配置を解除").click();
  await button("既存サークルを自動照合").click();
  assert.equal((await stored()).events[0].circles[0].placement, null);
  await page.reload();
  await button("マップ").click();
  assert.equal(await page.locator(".map-marker").count(), 2);
  await page.getByLabel("マップの日目").selectOption("2日目");
  await page.getByRole("heading", { name: "マップ未設定" }).waitFor();
  assert.equal(await page.locator(".map-marker").count(), 0);
  await page.getByLabel("マップの日目").selectOption("1日目");
  const downloadPromise = page.waitForEvent("download");
  await button("↓ JSONを書き出す").click();
  const download = await downloadPromise;
  const path = await download.path();
  const backup = JSON.parse(await readFile(path, "utf8"));
  assert.ok(
    backup.events[0].maps[0].asset.startsWith("data:image/png;base64,"),
  );
  assert.equal(backup.events[0].circles[1].placement.source, "mapping");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("aside input[type=file]").setInputFiles(path);
  await page
    .getByText("JSONを読み戻して保存しました", { exact: false })
    .waitFor();
  await button("マップ").click();
  assert.equal(await page.locator(".map-marker").count(), 2);
  await button("サークル一覧").click();
  await page.getByRole("button", { name: "編集", exact: true }).nth(1).click();
  await page
    .getByRole("dialog")
    .getByLabel("参加日目", { exact: false })
    .selectOption("2日目");
  await button("変更を保存").click();
  await button("マップ").click();
  assert.equal(await page.locator(".map-marker").count(), 1);
  // An unmatched circle can be placed explicitly, saved and restored.
  await register("架空未配置サークル", "Z-99a");
  await page
    .locator(".map-circle")
    .filter({ hasText: "架空未配置サークル" })
    .click();
  await button("位置を指定・修正").click();
  await viewport.scrollIntoViewIfNeeded();
  const unplacedPlane = await page.locator(".map-plane").boundingBox();
  await page.mouse.click(
    unplacedPlane.x + unplacedPlane.width * 0.4,
    unplacedPlane.y + unplacedPlane.height * 0.6,
  );
  await button("この位置を保存").click();
  await page.reload();
  await button("マップ").click();
  const manuallyPlaced = (await stored()).events[0].circles.find(
    (c) => c.name === "架空未配置サークル",
  );
  assert.equal(manuallyPlaced.placement.source, "manual");
  assert.ok(Math.abs(manuallyPlaced.placement.x - 0.4) < 0.005);
  // Fresh sample event never changes the previous event's circles.
  const old = JSON.stringify((await stored()).events[0]);
  await button("架空サンプル開催回を追加").click();
  assert.equal(await page.locator(".map-marker").count(), 0);
  assert.equal(JSON.stringify((await stored()).events[0]), old);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: registration, mapping, detail, zoom/pan/resize anchoring, manual save/clear, reload, overlaps, day/event isolation, JSON download/import, edited-day invalidation",
  );
} finally {
  await context.close();
  await browser.close();
}
