/**
 * 炭火焼肉 燈火 LP — 画面の自動確認
 *
 * 実際のChromeでページを開き、
 * カウントダウン・部位図・見積もり・タブ・予約導線・フォームを操作して結果を確かめる。
 *
 *   npm i puppeteer-core
 *   node tests/check.mjs
 *
 * Chrome の場所が違う場合は CHROME_PATH で指定する。
 */
import { pathToFileURL } from "node:url";
import path from "node:path";
import puppeteer from "puppeteer-core";

const PAGE_URL = pathToFileURL(path.resolve(process.cwd(), "index.html")).href;
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new", args: ["--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
const errs = [];
page.on("pageerror", e => errs.push("pageerror: " + e.message));
page.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
await page.setViewport({ width: 1280, height: 950 });
await page.goto(PAGE_URL, { waitUntil: "networkidle2" });

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  OK   " + name); }
  else { fail++; console.log("  NG   " + name + (extra ? "  -> " + extra : "")); }
};

// --- カウントダウン ---
const cd = await page.evaluate(() => ({
  d: document.getElementById("js-cd-days").textContent,
  h: document.getElementById("js-cd-hours").textContent,
  m: document.getElementById("js-cd-mins").textContent,
  s: document.getElementById("js-cd-secs").textContent,
}));
ok("カウントダウンに数字が入る", /^\d+$/.test(cd.d) && /^\d{2}$/.test(cd.h), JSON.stringify(cd));
const rest = await page.evaluate(() => new Date("2026-11-01T17:00:00+09:00") - Date.now());
ok("残り日数が実際の差と一致", Number(cd.d) === Math.floor(rest / 86400000), `表示${cd.d} 実際${Math.floor(rest/86400000)}`);
await new Promise(r => setTimeout(r, 1300));
const s2 = await page.evaluate(() => document.getElementById("js-cd-secs").textContent);
ok("秒が進む", s2 !== cd.s, `${cd.s} -> ${s2}`);

// --- 部位図 ---
for (const [key, name, menuHead] of [
  ["harami", "ハラミ", "三十日熟成"],
  ["misuji", "ミスジ", "黒毛和牛"],
  ["momo", "モモ", "ウチモモ"],
]) {
  await page.click(`.cut__region[data-cut="${key}"]`);
  const got = await page.evaluate(() => ({
    name: document.getElementById("js-cut-name").textContent,
    menu: document.getElementById("js-cut-menu").textContent,
    active: [...document.querySelectorAll(".cut__region--active")].map(e => e.dataset.cut),
    chip: [...document.querySelectorAll(".cut__chip--active")].map(e => e.dataset.cut),
  }));
  ok(`部位「${name}」を選ぶと説明が入れ替わる`,
    got.name.startsWith(name) && got.menu.includes(menuHead) &&
    got.active.length === 1 && got.active[0] === key && got.chip[0] === key,
    JSON.stringify(got));
}
// チップからも選べる（PC幅ではチップは非表示なので直接クリックさせる）
await page.$eval('.cut__chip[data-cut="sirloin"]', el => el.click());
ok("チップからも選べる",
  await page.evaluate(() => document.getElementById("js-cut-name").textContent === "サーロイン"));
// キーボードでも選べる
await page.$eval('.cut__region[data-cut="karubi"]', el => el.focus());
await page.keyboard.press("Enter");
ok("SVGの部位をEnterで選べる",
  await page.evaluate(() => document.getElementById("js-cut-name").textContent.startsWith("カルビ")));

// --- 見積もり ---
async function sim(guests, course, drink) {
  await page.evaluate((g, c, d) => {
    const set = (id, v) => {
      const el = document.getElementById(id);
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    set("sim-guests", g); set("sim-course", c); set("sim-drink", d);
  }, String(guests), course, drink);
  return page.evaluate(() => ({
    total: document.getElementById("js-sim-total").textContent,
    each: document.getElementById("js-sim-each").textContent,
    offHidden: document.getElementById("js-sim-off-row").hidden,
    off: document.getElementById("js-sim-off").textContent,
    comment: document.getElementById("js-sim-comment").textContent,
  }));
}
let r = await sim(2, "tomoshibi", "none");
ok("2名 燈火 飲み放題なし = 9,600 / 4,800", r.total === "9,600" && r.each === "4,800", JSON.stringify(r));
ok("2名では幹事無料の行が出ない", r.offHidden === true);
ok("2名では『あと2名様で』の案内", r.comment.includes("あと2名様"), r.comment);

r = await sim(4, "takumi", "min90");
ok("4名 匠+90分 = 34,400 / 8,600", r.total === "34,400" && r.each === "8,600", JSON.stringify(r));
ok("4名で乾杯ドリンク無料の案内", r.comment.includes("乾杯ドリンク1杯無料が適用"), r.comment);

r = await sim(10, "takumi", "min120");
// (6800+2300)*10 - 6800 = 91000 - 6800 = 84200 / 10 = 8420
ok("10名 匠+120分 = 84,200 / 8,420", r.total === "84,200" && r.each === "8,420", JSON.stringify(r));
ok("10名で幹事1名分の行が出る", r.offHidden === false && r.off === "-6,800円", JSON.stringify(r));

r = await sim(20, "kiwami", "none");
// 9800*20 - 9800 = 186200 / 20 = 9310
ok("20名 極 飲み放題なし = 186,200 / 9,310", r.total === "186,200" && r.each === "9,310", JSON.stringify(r));
ok("20名で貸切の案内", r.comment.includes("貸切"), r.comment);
ok("飲み放題なしは『なし』表示",
  await page.evaluate(() => document.getElementById("js-sim-drink-calc").textContent === "なし"));

// --- タブ ---
await page.click("#tab-drink");
let tab = await page.evaluate(() => ({
  shown: [...document.querySelectorAll(".tabs__panel")].filter(p => !p.hidden).map(p => p.id),
  selected: [...document.querySelectorAll('.tabs__btn[aria-selected="true"]')].map(b => b.id),
  tabindex: [...document.querySelectorAll(".tabs__btn")].map(b => b.tabIndex),
}));
ok("ドリンクタブに切り替わる",
  tab.shown.length === 1 && tab.shown[0] === "panel-drink" && tab.selected[0] === "tab-drink",
  JSON.stringify(tab));
ok("選択中のタブだけがタブ移動の対象", JSON.stringify(tab.tabindex) === "[-1,-1,0]", JSON.stringify(tab.tabindex));
await page.focus("#tab-drink");
await page.keyboard.press("ArrowRight");
ok("→キーで先頭のタブに戻る",
  await page.evaluate(() => document.activeElement.id === "tab-ippin" &&
    !document.getElementById("panel-ippin").hidden));

// --- FVの予約ウィジェット → フォーム ---
await page.evaluate(() => {
  const set = (id, v) => { const el = document.getElementById(id); el.value = v; };
  set("quick-date", "2026-11-14"); set("quick-time", "19:30"); set("quick-guests", "6");
});
await page.click("#js-quick-go");
await new Promise(r => setTimeout(r, 900));
const handed = await page.evaluate(() => ({
  date: document.getElementById("r-date").value,
  time: document.getElementById("r-time").value,
  guests: document.getElementById("r-guests").value,
  focused: document.activeElement.id,
}));
ok("ウィジェットの内容がフォームに入る",
  handed.date === "2026-11-14" && handed.time === "19:30" && handed.guests === "6",
  JSON.stringify(handed));
ok("お名前欄にカーソルが移る", handed.focused === "r-name", handed.focused);

// --- フォーム ---
await page.click('#js-form button[type="submit"]');
let form = await page.evaluate(() => ({
  validated: document.getElementById("js-form").classList.contains("was-validated"),
  resultHidden: document.getElementById("js-form-result").hidden,
  focused: document.activeElement.id,
}));
ok("未入力では送信されない", form.validated && form.resultHidden === true, JSON.stringify(form));
ok("最初の未入力欄にカーソルが移る", form.focused === "r-name", form.focused);

await page.type("#r-name", "山田 太郎");
await page.type("#r-tel", "09012345678");
await page.type("#r-email", "taro@example.com");
await page.click("#r-agree");
await page.click('#js-form button[type="submit"]');
await new Promise(r => setTimeout(r, 700));
form = await page.evaluate(() => ({
  resultHidden: document.getElementById("js-form-result").hidden,
  name: document.getElementById("r-name").value,
}));
ok("正しく入力すると完了表示が出る", form.resultHidden === false, JSON.stringify(form));
ok("送信後にフォームが空になる", form.name === "", form.name);

// --- 全体 ---
ok("アンカーの飛び先がすべて存在する", await page.evaluate(() =>
  [...document.querySelectorAll('a[href^="#"]')]
    .every(a => a.getAttribute("href") === "#" || document.querySelector(a.getAttribute("href")))));
ok("画像にalt属性がある", await page.evaluate(() =>
  [...document.images].every(i => i.hasAttribute("alt"))));
ok("コンソールエラーなし", errs.length === 0, errs.join(" / "));

console.log(`\n合計 ${pass + fail}件  成功 ${pass}  失敗 ${fail}`);
await browser.close();
process.exit(fail ? 1 : 0);
