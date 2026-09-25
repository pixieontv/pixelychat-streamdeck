// Stands in for the Stream Deck app so the plugin can be tested without
// hardware. Needs PixelyChat running and a fresh `npm run build`.
//
//   node scripts/fake-stream-deck.mjs
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
const DEVICE = "fake-device";
const renders = {}; // context -> { image, title, alerts, settings }
let failures = 0;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (ok, label) => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}`); if (!ok) failures++; };
const svg = (ctx) => Buffer.from(String(renders[ctx]?.image ?? "").split(",")[1] ?? "", "base64").toString();
const isActive = (ctx) => svg(ctx).includes('stroke="#8B5CF6" stroke-width="6"');
const hasDot = (ctx, color) => svg(ctx).includes(`<circle cx="120" cy="24" r="9" fill="${color}"/>`);

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
	deleted: { settings: { widgetId: "deleted-widget", cachedName: "Old Widget", cachedType: "countdown" } },
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
	application: { font: "", language: "en", platform: "mac", platformVersion: "15.0", version: "7.6.0" },
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

	check(renders.runnable?.title === runnable.name && !isActive("runnable"), `configured key shows "${runnable.name}", idle`);
	check(renders.empty?.title === "" && !!renders.empty?.image, "unconfigured key shows no title");
	check(renders.deleted?.title === "Old Widget" && hasDot("deleted", "#E8A23D"), "deleted widget keeps cached name + amber dot");
	if (disabled) check(renders.disabled?.title === disabled.name && svg("disabled").includes('stroke="#565B66"'), `disabled widget "${disabled.name}" is greyed out`);

	// 4. Press keys.
	keyEvent("keyDown", "runnable");
	await wait(1200);
	check(renders.runnable.alerts === 0 && isActive("runnable"), "press starts the widget (purple ring)");
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
	check(items.length === widgets.length && items.every((i) => typeof i.label === "string" && typeof i.value === "string"), `dropdown lists all ${widgets.length} widgets`);
	check(status?.connection === "connected" && status?.missing === true, "status: connected, selected widget missing");

	// Key artwork for a visual check.
	const out = path.join(root, "scripts", "fake-stream-deck-keys.html");
	fs.writeFileSync(out, `<body style="background:#222;display:flex;gap:16px;padding:16px;font:12px sans-serif;color:#ccc">${Object.keys(keys).map((ctx) => `<figure><img src="${renders[ctx].image}" width="144"><figcaption>${ctx}: ${renders[ctx].title}</figcaption></figure>`).join("")}</body>`);
	console.log(`\nKey artwork: ${out}`);
} finally {
	plugin.kill();
	wss.close();
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
