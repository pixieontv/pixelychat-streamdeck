// Renders the Elgato Marketplace listing images into marketplace/:
// thumbnail.png and gallery-1..3.png, all 1920 × 960 PNG.
//
//   node scripts/marketplace-images.mjs
//
// Keys are drawn with the plugin's own src/key-image.ts, so the images always
// match the real plugin. Needs Google Chrome (headless) and the brand fonts from
// the sibling pixelychat-app checkout.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "marketplace");
const workDir = path.join(outDir, ".work");
const appAssets = path.resolve(root, "../pixelychat-app/src");
const fonts = path.join(appAssets, "overlays/fonts");
const logo = path.join(appAssets, "renderer/assets/icon.png");
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// Load key-image.ts without a build step.
const source = ts.transpileModule(fs.readFileSync(path.join(root, "src/key-image.ts"), "utf8"), {
	compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
new Function("module", "exports", "require", source)(mod, mod.exports, () => ({}));
const { keyImage, timerText } = mod.exports;

const now = Date.now();
const key = (type, status, name, timer) => keyImage(type, status, { name, timer });
const countdown = (seconds) => timerText({ endsAt: now + seconds * 1000 }, now);
const stopwatch = (seconds) => timerText({ elapsedMs: seconds * 1000 }, now);
const img = (src, size, extra = "") => `<img class="key" src="${src}" width="${size}" height="${size}" ${extra}>`;
const logoUrl = pathToFileURL(logo).href;

const page = (body) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Space Grotesk"; font-weight: 700; src: url("${pathToFileURL(path.join(fonts, "SpaceGrotesk-Bold.ttf")).href}"); }
@font-face { font-family: "IBM Plex Sans"; font-weight: 400; src: url("${pathToFileURL(path.join(fonts, "IBMPlexSans-Regular.ttf")).href}"); }
@font-face { font-family: "IBM Plex Sans"; font-weight: 500; src: url("${pathToFileURL(path.join(fonts, "IBMPlexSans-Medium.ttf")).href}"); }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1920px; height: 960px; overflow: hidden; }
body {
	font-family: "IBM Plex Sans", sans-serif; color: #ECEEF3;
	background:
		radial-gradient(900px 600px at 88% 8%, rgba(234,102,243,0.28), transparent 60%),
		radial-gradient(900px 700px at 70% 110%, rgba(119,60,246,0.35), transparent 60%),
		linear-gradient(180deg, #140A2E 0%, #0A051C 100%);
	display: flex; align-items: center; padding: 0 120px;
}
h1 { font-family: "Space Grotesk", sans-serif; font-weight: 700; font-size: 84px; line-height: 1.02; letter-spacing: -0.02em; }
h2 { font-family: "Space Grotesk", sans-serif; font-weight: 700; font-size: 72px; line-height: 1.05; letter-spacing: -0.02em; }
.grad { background: linear-gradient(90deg, #EA66F3, #9F5BFA); -webkit-background-clip: text; color: transparent; }
p.lead { font-size: 34px; line-height: 1.4; color: #B9B3D3; margin-top: 28px; max-width: 760px; }
.brand { display: flex; align-items: center; gap: 22px; margin-bottom: 44px; font-family: "Space Grotesk", sans-serif; font-weight: 700; font-size: 40px; }
.brand img { width: 88px; height: 88px; border-radius: 20px; }
.key { border-radius: 26%; box-shadow: 0 18px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06); display: block; }
.deck { background: rgba(8,4,20,0.75); border: 1px solid rgba(255,255,255,0.08); border-radius: 48px; padding: 44px; display: grid; gap: 30px; box-shadow: 0 40px 90px rgba(0,0,0,0.55); }
.caption { font-size: 26px; color: #B9B3D3; text-align: center; margin-top: 22px; line-height: 1.35; }
.caption b { color: #ECEEF3; font-weight: 500; display: block; font-size: 30px; }
.chip { display: inline-flex; align-items: center; gap: 12px; padding: 14px 26px; border-radius: 999px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); font-size: 26px; color: #D7D2EA; }
</style></head><body>${body}</body></html>`;

const images = {
	thumbnail: page(`
		<div style="flex:1">
			<div class="brand"><img src="${logoUrl}">PixelyChat</div>
			<h1>Your Action Widgets<br>on <span class="grad">Stream Deck</span> keys</h1>
			<p class="lead">Start countdowns, giveaway wheels and scenes with one press, with live status on every key.</p>
		</div>
		<div class="deck" style="grid-template-columns: repeat(3, 200px)">
			${img(key("countdown", "active", "Countdown", countdown(27)), 200)}
			${img(key("starting-soon", "idle", "Starting Soon"), 200)}
			${img(key("spin-wheel", "idle", "Giveaway Wheel"), 200)}
			${img(key("brb", "idle", "Be Right Back"), 200)}
			${img(key("stopwatch", "active", "Stopwatch", stopwatch(754)), 200)}
			${img(key("hype", "idle", "Hype"), 200)}
		</div>`),

	"gallery-1": page(`
		<div style="width:100%">
			<h2 style="text-align:center">Live status on <span class="grad">every key</span></h2>
			<p class="lead" style="text-align:center;margin:24px auto 70px">See at a glance what is running. Timers count right on the key.</p>
			<div style="display:flex;justify-content:center;gap:64px">
				<div>${img(key("spin-wheel", "idle", "Giveaway Wheel"), 260)}<div class="caption"><b>Ready</b>Press to start</div></div>
				<div>${img(key("countdown", "active", "Countdown", countdown(27)), 260)}<div class="caption"><b>Running</b>Press again to stop</div></div>
				<div>${img(key("stopwatch", "disabled", "Stopwatch"), 260)}<div class="caption"><b>Turned off</b>in PixelyChat</div></div>
				<div>${img(key("hype", "offline", "Hype"), 260)}<div class="caption"><b>PixelyChat closed</b>Reconnects by itself</div></div>
			</div>
		</div>`),

	"gallery-2": page(`
		<div style="flex:1;padding-right:80px">
			<h2>Pick a widget.<br><span class="grad">That's it.</span></h2>
			<p class="lead">All settings stay in PixelyChat. Rename or change a widget there and the key follows.</p>
		</div>
		<div style="display:flex;align-items:flex-start;gap:44px">
			${img(key("countdown", "idle", "Countdown"), 220)}
			<div style="width:720px;background:#2D2D2D;border-radius:22px;padding:36px 40px;font-size:25px;color:#D5D5D5;box-shadow:0 40px 90px rgba(0,0,0,0.55)">
				<div style="display:grid;grid-template-columns:200px 1fr;row-gap:26px;align-items:center">
					<div style="text-align:right;padding-right:24px;color:#9A9A9A">PixelyChat:</div><div style="color:#8B5CF6">● Connected</div>
					<div style="text-align:right;padding-right:24px;color:#9A9A9A">Action Widget:</div>
					<div style="background:#3D3D3D;border-radius:8px;padding:12px 18px;display:flex;justify-content:space-between">Countdown<span style="color:#9A9A9A">▾</span></div>
				</div>
				<div style="margin:10px 0 0 200px;background:#3A3A3A;border-radius:10px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,0.4)">
					${["Starting Soon", "Be Right Back", "Giveaway Wheel", "Countdown", "Hype"].map((n) => `<div style="padding:12px 18px;${n === "Countdown" ? "background:#5B3FD1;color:#fff" : ""}">${n}</div>`).join("")}
				</div>
				<div style="margin:24px 0 0 200px;color:#9A9A9A;line-height:1.45;font-size:22px">Press the key to start the widget, and again to stop it.</div>
			</div>
		</div>`),

	"gallery-3": page(`
		<div style="width:100%;text-align:center">
			<h2>Works in <span class="grad">Multi Actions</span></h2>
			<p class="lead" style="margin:24px auto 70px">Switch your scene and start your stream intro with a single press.</p>
			<div style="display:flex;justify-content:center;align-items:center;gap:40px">
				<div><div class="key" style="width:220px;height:220px;background:linear-gradient(180deg,#2A2F3A,#1B1E25);display:grid;place-items:center;font-family:'Space Grotesk';font-size:34px;color:#ECEEF3;line-height:1.1">Scene:<br>Intro</div><div class="caption">Your scene switch</div></div>
				<div style="font-size:64px;color:#9F5BFA">→</div>
				<div>${img(key("starting-soon", "active", "Starting Soon"), 220)}<div class="caption">PixelyChat</div></div>
				<div style="font-size:64px;color:#9F5BFA">→</div>
				<div>${img(key("countdown", "active", "Countdown", countdown(300)), 220)}<div class="caption">PixelyChat</div></div>
			</div>
			<div style="display:flex;justify-content:center;gap:20px;margin-top:76px">
				<span class="chip">Twitch · YouTube · TikTok · Kick</span>
				<span class="chip">8 languages</span>
				<span class="chip">Mac &amp; Windows</span>
			</div>
		</div>`),
};

fs.mkdirSync(workDir, { recursive: true });
for (const [name, html] of Object.entries(images)) {
	const htmlFile = path.join(workDir, `${name}.html`);
	fs.writeFileSync(htmlFile, html);
	execFileSync(chrome, [
		"--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
		"--allow-file-access-from-files", "--window-size=1920,960", "--virtual-time-budget=2000",
		`--screenshot=${path.join(outDir, `${name}.png`)}`, pathToFileURL(htmlFile).href,
	], { stdio: "ignore" });
	console.log(`marketplace/${name}.png`);
}
fs.rmSync(workDir, { recursive: true, force: true });
