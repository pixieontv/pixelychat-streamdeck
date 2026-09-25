// Stands in for the Stream Deck app so the plugin can be tested without
// hardware. Needs PixelyChat running and a fresh `npm run build`.
//
//   node scripts/fake-stream-deck.mjs [language]   (Stream Deck UI language, default en)
//
// It launches bin/plugin.js the way Stream Deck does, places keys, presses
// them, and checks what the plugin draws. Pressing a key really starts and
// stops that widget in PixelyChat (a Countdown is preferred).

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { io } from "socket.io-client";
import { WebSocketServer } from "ws";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginDir = path.join(root, "com.pixelychat.streamdeck.sdPlugin");
const ACTION = "com.pixelychat.streamdeck.trigger-action-widget";
const LANGUAGE = process.argv[2] ?? "en";
const OFF = JSON.parse(fs.readFileSync(path.join(pluginDir, `${LANGUAGE}.json`), "utf8")).Localization.off;
const DEVICE = "fake-device";
const renders = {}; // context -> { image, title, alerts, settings }
const LONG_NAME = "Friday Night Giveaway Wheel";
let failures = 0;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (ok, label) => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}`); if (!ok) failures++; };
const svg = (ctx) => Buffer.from(String(renders[ctx]?.image ?? "").split(",")[1] ?? "", "base64").toString();
const isActive = (ctx) => svg(ctx).includes('stroke="url(#brand)" stroke-width="6"');
const shownTime = (ctx) => svg(ctx).match(/>(\d+(?::\d\d)+)<\/text>/)?.[1];
const hasDot = (ctx, color) => svg(ctx).includes(`r="8" fill="${color}"/>`);
// Text the plugin drew into the key (the name, and the time while running).
const drawnText = (ctx) => [...svg(ctx).matchAll(/>([^<]+)<\/text>/g)].map((m) => m[1]);
const escapeXml = (text) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// 1. Read the widget list from PixelyChat, like the plugin will.
const widgets = await new Promise((resolve, reject) => {
	const socket = io("http://127.0.0.1:4200", { query: { dock: "streamdeck" }, transports: ["websocket"], reconnection: false });
	socket.on("connect_error", () => reject(new Error("PixelyChat is not running on 127.0.0.1:4200")));
	socket.on("streamdeck-state", (state) => { socket.close(); resolve(state.widgets); });
});
const runnable = widgets.find((w) => w.enabled && w.type === "countdown") ?? widgets.find((w) => w.enabled && w.type !== "game-queue");
const disabled = widgets.find((w) => !w.enabled);
if (!runnable) throw new Error("Needs at least one enabled Action Widget in PixelyChat");

const keys = {
	runnable: { settings: { widgetId: runnable.id } },
	empty: { settings: {} },
	deleted: { settings: { widgetId: "deleted-widget", cachedName: LONG_NAME, cachedType: "countdown" } },
	userTitle: { settings: { widgetId: runnable.id } },
	...(disabled ? { disabled: { settings: { widgetId: disabled.id } } } : {}),
};

// 2. Fake Stream Deck app: a WebSocket server the plugin registers with.
const wss = new WebSocketServer({ port: 0, host: "127.0.0.1" });
await new Promise((resolve) => wss.once("listening", resolve));
const port = wss.address().port;
let pluginSocket;
const send = (msg) => pluginSocket.send(JSON.stringify(msg));
const pluginMessages = [];

const registered = new Promise((resolve) => {
	wss.on("connection", (ws) => {
		ws.on("message", (raw) => {
			const msg = JSON.parse(raw.toString());
			if (msg.event === "registerPlugin") { pluginSocket = ws; resolve(); return; }
			pluginMessages.push(msg);
			const r = (renders[msg.context] ??= { alerts: 0 });
			if (msg.event === "setImage") r.image = msg.payload.image;
			if (msg.event === "setTitle") r.title = msg.payload.title;
			if (msg.event === "showAlert") r.alerts++;
			if (msg.event === "setSettings") r.settings = msg.payload;
			if (msg.event === "getSettings") {
				send({ action: ACTION, context: msg.context, device: DEVICE, event: "didReceiveSettings", payload: { controller: "Keypad", coordinates: { column: 0, row: 0 }, isInMultiAction: false, settings: r.settings ?? keys[msg.context]?.settings ?? {} } });
			}
		});
	});
});

const info = {
	application: { font: "", language: LANGUAGE, platform: "mac", platformVersion: "15.0", version: "7.6.0" },
	plugin: { uuid: "com.pixelychat.streamdeck", version: "0.1.0.0" },
	devicePixelRatio: 2,
	colors: {},
	devices: [{ id: DEVICE, name: "Fake Stream Deck", size: { columns: 5, rows: 3 }, type: 0 }],
};
const plugin = spawn(process.execPath, ["bin/plugin.js", "-port", String(port), "-pluginUUID", "com.pixelychat.streamdeck", "-registerEvent", "registerPlugin", "-info", JSON.stringify(info)], { cwd: pluginDir, stdio: "inherit" });

try {
	await Promise.race([registered, wait(5000).then(() => { throw new Error("plugin did not register"); })]);
	const payload = (ctx, extra = {}) => ({ controller: "Keypad", coordinates: { column: Object.keys(keys).indexOf(ctx), row: 0 }, isInMultiAction: false, settings: renders[ctx]?.settings ?? keys[ctx].settings, state: 0, ...extra });
	const keyEvent = (event, ctx) => send({ action: ACTION, context: ctx, device: DEVICE, event, payload: payload(ctx) });

	// 3. Place the keys.
	for (const ctx of Object.keys(keys)) keyEvent("willAppear", ctx);
	await wait(1500);

	check(drawnText("runnable").join(" ") === escapeXml(runnable.name) && !isActive("runnable"), `configured key draws "${runnable.name}", idle`);
	check(!!renders.empty?.image && drawnText("empty").length === 0, "unconfigured key draws no name");
	check(drawnText("deleted").length === 2 && drawnText("deleted").join(" ") === LONG_NAME && hasDot("deleted", "#E8A23D"), `long cached name wraps to two lines + amber dot (${JSON.stringify(drawnText("deleted"))})`);
	if (disabled) check(drawnText("disabled").join(" ") === escapeXml(disabled.name) && svg("disabled").includes('stroke="#565B66"'), `disabled widget "${disabled.name}" is greyed out`);
	check(!Object.values(renders).some((r) => r.title !== undefined), "plugin never sets a Stream Deck title");

	// A typed title is drawn (auto-fitted) in place of the name while Stream Deck's own title is hidden,
	// and left to Stream Deck when the user turns "Show Title" back on.
	const setTitle = (title, showTitle) => send({ action: ACTION, context: "userTitle", device: DEVICE, event: "titleParametersDidChange", payload: { ...payload("userTitle"), title, titleParameters: { fontFamily: "", fontSize: 11, fontStyle: "", fontUnderline: false, showTitle, titleAlignment: "bottom", titleColor: "#ffffff" } } });
	setTitle("My title", false);
	await wait(500);
	check(drawnText("userTitle").join(" ") === "My title", "typed title is drawn instead of the widget name");
	setTitle("My title", true);
	await wait(500);
	check(drawnText("userTitle").length === 0, "with Show Title on, Stream Deck draws it and the key does not");
	setTitle("", false);
	await wait(500);
	check(drawnText("userTitle").join(" ") === escapeXml(runnable.name), "empty title falls back to the widget name");

	// 4. Press keys.
	keyEvent("keyDown", "runnable");
	await wait(1200);
	check(renders.runnable.alerts === 0 && isActive("runnable"), "press starts the widget (brand ring)");
	if (runnable.type === "countdown") {
		const first = shownTime("runnable");
		await wait(1300);
		const second = shownTime("runnable");
		check(!!first && !!second && first !== second, `countdown time ticks on the key (${first} → ${second})`);
	}
	keyEvent("keyDown", "runnable");
	await wait(1200);
	check(renders.runnable.alerts === 0 && !isActive("runnable"), "second press stops it");

	for (const ctx of ["empty", "deleted", ...(disabled ? ["disabled"] : [])]) {
		keyEvent("keyDown", ctx);
		await wait(500);
		check(renders[ctx].alerts === 1, `press on ${ctx} key shows alert`);
	}

	// 5. Settings panel: dropdown items + status line.
	pluginMessages.length = 0;
	send({ action: ACTION, context: "deleted", device: DEVICE, event: "propertyInspectorDidAppear" });
	send({ action: ACTION, context: "deleted", event: "sendToPlugin", payload: { event: "getWidgets" } });
	await wait(800);
	const toPI = pluginMessages.filter((m) => m.event === "sendToPropertyInspector").map((m) => m.payload);
	const items = toPI.find((p) => p.event === "getWidgets")?.items ?? [];
	const status = toPI.find((p) => p.event === "status");
	const offered = widgets.filter((w) => w.enabled);
	check(items.length === offered.length && items.every((i) => offered.some((w) => w.id === i.value && w.name === i.label)), `dropdown lists only the Dashboard's ${offered.length} widgets`);
	if (disabled) {
		pluginMessages.length = 0;
		send({ action: ACTION, context: "disabled", event: "sendToPlugin", payload: { event: "getWidgets" } });
		await wait(800);
		const own = pluginMessages.find((m) => m.event === "sendToPropertyInspector" && m.payload.event === "getWidgets")?.payload.items ?? [];
		check(own.some((i) => i.value === disabled.id && i.label === `${disabled.name} (${OFF})`), `a key's own widget stays listed while off, marked (${OFF})`);
	}
	check(status?.connection === "connected" && status?.missing === true, "status: connected, selected widget missing");

	// Key artwork for a visual check.
	const out = path.join(root, "scripts", "fake-stream-deck-keys.html");
	fs.writeFileSync(out, `<body style="background:#222;display:flex;gap:16px;padding:16px;font:12px sans-serif;color:#ccc">${Object.keys(keys).map((ctx) => `<figure><img src="${renders[ctx].image}" width="144"><figcaption>${ctx}</figcaption></figure>`).join("")}</body>`);
	console.log(`\nKey artwork: ${out}`);
} finally {
	plugin.kill();
	wss.close();
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
