// Renders the Elgato Marketplace listing images into marketplace/:
// thumbnail.png and gallery-1..3.png, all 1920 × 960 PNG, plus
// website/stream-deck-<locale>.png, one per pixelychat.com language (1600 × 1215,
// the shape of the website's feature screenshots; converted to
// <locale>/assets/tight/stream-deck.webp there).
//
//   node scripts/marketplace-images.mjs
//
// Keys are drawn with the plugin's own src/key-image.ts, so the images always
// match the real plugin. Needs Google Chrome (headless) and the brand fonts from
// the sibling pixelychat-app checkout.

import { spawn } from "node:child_process";
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

const page = (body, width = 1920, height = 960) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Space Grotesk"; font-weight: 700; src: url("${pathToFileURL(path.join(fonts, "SpaceGrotesk-Bold.ttf")).href}"); }
@font-face { font-family: "IBM Plex Sans"; font-weight: 400; src: url("${pathToFileURL(path.join(fonts, "IBMPlexSans-Regular.ttf")).href}"); }
@font-face { font-family: "IBM Plex Sans"; font-weight: 500; src: url("${pathToFileURL(path.join(fonts, "IBMPlexSans-Medium.ttf")).href}"); }
* { box-sizing: border-box; margin: 0; }
html, body { width: ${width}px; height: ${height}px; overflow: hidden; }
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

// Website feature image, one per pixelychat.com language: no headline (the website
// section has its own), widget names as the app names them, panel labels as the plugin does.
const appLocales = path.join(appAssets, "locales");
const websiteLocales = {
	en: { app: "en", actionWidget: "Action Widget", connected: "Connected" },
	ar: { app: "ar", actionWidget: "عنصر الإجراء", connected: "متصل", rtl: true },
	de: { app: "de", actionWidget: "Action Widget", connected: "Verbunden" },
	es: { app: "es", actionWidget: "Widget de acción", connected: "Conectado" },
	fr: { app: "fr", actionWidget: "Widget d’action", connected: "Connecté" },
	id: { app: "id", actionWidget: "Widget Aksi", connected: "Terhubung" },
	ja: { app: "ja", actionWidget: "アクションウィジェット", connected: "接続済み" },
	ko: { app: "ko", actionWidget: "액션 위젯", connected: "연결됨" },
	"pt-br": { app: "pt-BR", actionWidget: "Widget de ação", connected: "Conectado" },
	"zh-cn": { app: "zh-CN", actionWidget: "操作小组件", connected: "已连接" },
	"zh-tw": { app: "zh-TW", actionWidget: "操作小工具", connected: "已連線" },
};
const websiteImage = ({ app, actionWidget, connected, rtl }) => {
	const n = JSON.parse(fs.readFileSync(path.join(appLocales, app, "common.json"), "utf8")).widgets.defaults;
	return page(`
		<div style="position:relative;width:100%;height:100%">
			<div class="deck" style="position:absolute;left:60px;top:90px;grid-template-columns: repeat(3, 220px)">
				${img(key("countdown", "active", n.countdown, countdown(27)), 220)}
				${img(key("starting-soon", "idle", n.startingSoon), 220)}
				${img(key("spin-wheel", "idle", n.spinWheel), 220)}
				${img(key("brb", "idle", n.brb), 220)}
				${img(key("stopwatch", "active", n.stopwatch, stopwatch(754)), 220)}
				${img(key("media-player", "idle", n.mediaPlayer), 220)}
			</div>
			<div dir="${rtl ? "rtl" : "ltr"}" style="position:absolute;right:60px;top:640px;width:760px;background:#2D2D2D;border-radius:22px;padding:36px 40px;font-size:25px;color:#D5D5D5;box-shadow:0 40px 90px rgba(0,0,0,0.6)">
				<div style="display:grid;grid-template-columns:max-content 1fr;column-gap:24px;row-gap:26px;align-items:center">
					<div style="text-align:end;color:#9A9A9A">PixelyChat:</div><div style="color:#8B5CF6">● ${connected}</div>
					<div style="text-align:end;color:#9A9A9A;white-space:nowrap">${actionWidget}:</div>
					<div style="background:#3D3D3D;border-radius:8px;padding:12px 18px;display:flex;justify-content:space-between">${n.countdown}<span style="color:#9A9A9A">▾</span></div>
					<div></div>
					<div style="margin-top:-16px;background:#3A3A3A;border-radius:10px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,0.4)">
						${[n.startingSoon, n.brb, n.spinWheel, n.countdown, n.mediaPlayer].map((name) => `<div style="padding:12px 18px;${name === n.countdown ? "background:#5B3FD1;color:#fff" : ""}">${name}</div>`).join("")}
					</div>
				</div>
			</div>
		</div>`, 1600, 1215);
};
for (const [locale, strings] of Object.entries(websiteLocales)) images[`website/stream-deck-${locale}`] = websiteImage(strings);

// The three gallery images in each website language, for the Stream Deck article on
// pixelychat.com (website/news-gallery-<n>-<locale>.png; converted to
// <locale>/news/images/stream-deck-gallery-<n>.webp there). English uses the marketplace gallery.
const NEWS_GALLERY = {
	ar: { status: ["حالة مباشرة على ", "كل زر", ""], statusLead: "اعرف ما يعمل بنظرة واحدة. تعدّ المؤقتات على الزر نفسه.", ready: ["جاهز", "اضغط للتشغيل"], running: ["قيد التشغيل", "اضغط مرة أخرى للإيقاف"], off: ["مُطفأ", "في PixelyChat"], closed: ["PixelyChat مغلق", "يعيد الاتصال تلقائيًا"], pick: ["اختر عنصرًا.", "هذا كل شيء."], pickLead: "تبقى كل الإعدادات في PixelyChat. غيّر اسم العنصر أو مظهره هناك وسيتبعه الزر.", pickHint: "اضغط الزر لتشغيل العنصر، ومرة أخرى لإيقافه.", multi: ["يعمل في ", "الإجراءات المتعددة", ""], multiLead: "بدّل مشهدك وابدأ مقدمة بثك بضغطة واحدة.", scene: "مشهد:<br>المقدمة", sceneCaption: "تبديل مشهدك", languages: "8 لغات", platforms: "Twitch · YouTube · TikTok · Kick", systems: "Mac و Windows" },
	de: { status: ["Live-Status auf ", "jeder Taste", ""], statusLead: "Sieh auf einen Blick, was läuft. Timer laufen direkt auf der Taste.", ready: ["Bereit", "Drücken zum Starten"], running: ["Läuft", "Nochmal drücken zum Stoppen"], off: ["Ausgeschaltet", "in PixelyChat"], closed: ["PixelyChat geschlossen", "Verbindet sich von selbst"], pick: ["Widget wählen.", "Fertig."], pickLead: "Alle Einstellungen bleiben in PixelyChat. Benenn ein Widget dort um oder ändere es, und die Taste zieht mit.", pickHint: "Drück die Taste, um das Widget zu starten, und nochmal, um es zu stoppen.", multi: ["Funktioniert in ", "Multi-Aktionen", ""], multiLead: "Wechsle die Szene und starte dein Stream-Intro mit einem Tastendruck.", scene: "Szene:<br>Intro", sceneCaption: "Dein Szenenwechsel", languages: "8 Sprachen", platforms: "Twitch · YouTube · TikTok · Kick", systems: "Mac &amp; Windows" },
	es: { status: ["Estado en directo en ", "cada tecla", ""], statusLead: "Mira de un vistazo lo que está en marcha. Los temporizadores cuentan en la propia tecla.", ready: ["Listo", "Pulsa para iniciar"], running: ["En marcha", "Pulsa otra vez para detener"], off: ["Desactivado", "en PixelyChat"], closed: ["PixelyChat cerrado", "Se reconecta solo"], pick: ["Elige un widget.", "Eso es todo."], pickLead: "Todos los ajustes se quedan en PixelyChat. Cambia el nombre o el widget allí y la tecla se actualiza.", pickHint: "Pulsa la tecla para iniciar el widget y otra vez para detenerlo.", multi: ["Funciona en ", "Multiacciones", ""], multiLead: "Cambia de escena e inicia la intro de tu stream con una sola pulsación.", scene: "Escena:<br>Intro", sceneCaption: "Tu cambio de escena", languages: "8 idiomas", platforms: "Twitch · YouTube · TikTok · Kick", systems: "Mac y Windows" },
	fr: { status: ["L’état en direct sur ", "chaque touche", ""], statusLead: "Vois d’un coup d’œil ce qui tourne. Les minuteurs défilent sur la touche.", ready: ["Prêt", "Appuie pour lancer"], running: ["En cours", "Appuie encore pour arrêter"], off: ["Désactivé", "dans PixelyChat"], closed: ["PixelyChat fermé", "Se reconnecte tout seul"], pick: ["Choisis un widget.", "C’est tout."], pickLead: "Tous les réglages restent dans PixelyChat. Renomme ou modifie un widget là-bas et la touche suit.", pickHint: "Appuie sur la touche pour lancer le widget, et encore pour l’arrêter.", multi: ["Fonctionne dans les ", "Multi-actions", ""], multiLead: "Change de scène et lance l’intro de ton stream en une seule pression.", scene: "Scène :<br>Intro", sceneCaption: "Ton changement de scène", languages: "8 langues", platforms: "Twitch · YouTube · TikTok · Kick", systems: "Mac et Windows" },
	id: { status: ["Status langsung di ", "setiap tombol", ""], statusLead: "Lihat sekilas apa yang sedang berjalan. Timer berjalan langsung di tombol.", ready: ["Siap", "Tekan untuk mulai"], running: ["Berjalan", "Tekan lagi untuk berhenti"], off: ["Dimatikan", "di PixelyChat"], closed: ["PixelyChat ditutup", "Tersambung lagi sendiri"], pick: ["Pilih widget.", "Selesai."], pickLead: "Semua pengaturan tetap di PixelyChat. Ganti nama atau ubah widget di sana, dan tombolnya ikut berubah.", pickHint: "Tekan tombol untuk memulai widget, dan tekan lagi untuk menghentikannya.", multi: ["Bisa dipakai di ", "Multi Action", ""], multiLead: "Ganti scene dan mulai intro stream kamu dengan satu tekan.", scene: "Scene:<br>Intro", sceneCaption: "Ganti scene kamu", languages: "8 bahasa", platforms: "Twitch · YouTube · TikTok · Kick", systems: "Mac &amp; Windows" },
	ja: { status: ["", "すべてのキー", "に状態を表示"], statusLead: "何が動いているかひと目でわかります。タイマーはキーの上で進みます。", ready: ["準備完了", "押すと開始"], running: ["実行中", "もう一度押すと停止"], off: ["オフ", "PixelyChatで"], closed: ["PixelyChatが終了", "自動で再接続"], pick: ["ウィジェットを選ぶ。", "それだけ。"], pickLead: "設定はすべてPixelyChatに。そこで名前や内容を変えれば、キーも追従します。", pickHint: "キーを押すとウィジェットが開始し、もう一度押すと停止します。", multi: ["", "マルチアクション", "にも対応"], multiLead: "シーンの切り替えと配信のオープニングをワンプッシュで。", scene: "シーン：<br>イントロ", sceneCaption: "シーン切り替え", languages: "8言語", platforms: "Twitch · YouTube · TikTok · Kick", systems: "Mac・Windows" },
	ko: { status: ["", "모든 키", "에 실시간 상태"], statusLead: "실행 중인 것을 한눈에 확인하세요. 타이머는 키 위에서 바로 줄어들어요.", ready: ["준비", "눌러서 시작"], running: ["실행 중", "다시 눌러서 정지"], off: ["꺼짐", "PixelyChat에서"], closed: ["PixelyChat 닫힘", "자동으로 다시 연결"], pick: ["위젯을 고르세요.", "끝."], pickLead: "모든 설정은 PixelyChat에 남아요. 거기서 위젯 이름이나 설정을 바꾸면 키도 따라 바뀌어요.", pickHint: "키를 누르면 위젯이 시작되고, 다시 누르면 멈춰요.", multi: ["", "멀티 액션", "에서도 작동"], multiLead: "씬 전환과 방송 인트로 시작을 한 번에 누르세요.", scene: "씬:<br>인트로", sceneCaption: "씬 전환", languages: "8개 언어", platforms: "Twitch · YouTube · TikTok · Kick", systems: "Mac &amp; Windows" },
	"pt-br": { status: ["Status ao vivo em ", "cada tecla", ""], statusLead: "Veja de relance o que está rodando. Os timers contam direto na tecla.", ready: ["Pronto", "Aperte para iniciar"], running: ["Rodando", "Aperte de novo para parar"], off: ["Desativado", "no PixelyChat"], closed: ["PixelyChat fechado", "Reconecta sozinho"], pick: ["Escolha um widget.", "Pronto."], pickLead: "Todas as configurações ficam no PixelyChat. Renomeie ou mude um widget lá e a tecla acompanha.", pickHint: "Aperte a tecla para iniciar o widget, e de novo para parar.", multi: ["Funciona em ", "Multi Ações", ""], multiLead: "Troque de cena e comece a intro da sua live com um só toque.", scene: "Cena:<br>Intro", sceneCaption: "Sua troca de cena", languages: "8 idiomas", platforms: "Twitch · YouTube · TikTok · Kick", systems: "Mac e Windows" },
	"zh-cn": { status: ["", "每个按键", "都有实时状态"], statusLead: "正在运行的一目了然。计时器直接在按键上走动。", ready: ["就绪", "按下即可启动"], running: ["运行中", "再按一次停止"], off: ["已关闭", "在 PixelyChat 中"], closed: ["PixelyChat 已关闭", "会自动重新连接"], pick: ["选一个组件。", "就这么简单。"], pickLead: "所有设置都保留在 PixelyChat 中。在那里重命名或修改组件，按键会跟着更新。", pickHint: "按下按键启动组件，再按一次停止。", multi: ["支持", "多重操作", ""], multiLead: "按一下就能切换场景并开始直播开场。", scene: "场景：<br>开场", sceneCaption: "你的场景切换", languages: "8 种语言", platforms: "Twitch · YouTube · TikTok · Kick", systems: "Mac 和 Windows" },
	"zh-tw": { status: ["", "每個按鍵", "都有即時狀態"], statusLead: "正在執行的一目了然。計時器直接在按鍵上跑。", ready: ["就緒", "按下即可啟動"], running: ["執行中", "再按一次停止"], off: ["已關閉", "在 PixelyChat 中"], closed: ["PixelyChat 已關閉", "會自動重新連線"], pick: ["選一個小工具。", "就這麼簡單。"], pickLead: "所有設定都保留在 PixelyChat 中。在那裡重新命名或修改小工具，按鍵會跟著更新。", pickHint: "按下按鍵啟動小工具，再按一次停止。", multi: ["支援", "多重動作", ""], multiLead: "按一下就能切換場景並開始直播開場。", scene: "場景：<br>開場", sceneCaption: "你的場景切換", languages: "8 種語言", platforms: "Twitch · YouTube · TikTok · Kick", systems: "Mac 和 Windows" },
};
const newsGallery = (locale) => {
	const { app, rtl, connected, actionWidget } = websiteLocales[locale];
	const t = NEWS_GALLERY[locale];
	const n = JSON.parse(fs.readFileSync(path.join(appLocales, app, "common.json"), "utf8")).widgets.defaults;
	const heading = ([a, b, c]) => `${a}<span class="grad">${b}</span>${c}`;
	const dir = (html) => (rtl ? html.replace("<body>", '<body dir="rtl">') : html);
	const arrow = rtl ? "←" : "→";
	return {
		1: dir(page(`
		<div style="width:100%">
			<h2 style="text-align:center">${heading(t.status)}</h2>
			<p class="lead" style="text-align:center;margin:24px auto 70px">${t.statusLead}</p>
			<div style="display:flex;justify-content:center;gap:64px">
				<div>${img(key("spin-wheel", "idle", n.spinWheel), 260)}<div class="caption"><b>${t.ready[0]}</b>${t.ready[1]}</div></div>
				<div>${img(key("countdown", "active", n.countdown, countdown(27)), 260)}<div class="caption"><b>${t.running[0]}</b>${t.running[1]}</div></div>
				<div>${img(key("stopwatch", "disabled", n.stopwatch), 260)}<div class="caption"><b>${t.off[0]}</b>${t.off[1]}</div></div>
				<div>${img(key("hype", "offline", n.hype), 260)}<div class="caption"><b>${t.closed[0]}</b>${t.closed[1]}</div></div>
			</div>
		</div>`)),
		2: dir(page(`
		<div style="flex:1;padding-inline-end:80px">
			<h2>${t.pick[0]}<br><span class="grad">${t.pick[1]}</span></h2>
			<p class="lead">${t.pickLead}</p>
		</div>
		<div style="display:flex;align-items:flex-start;gap:44px">
			${img(key("countdown", "idle", n.countdown), 220)}
			<div style="width:720px;background:#2D2D2D;border-radius:22px;padding:36px 40px;font-size:25px;color:#D5D5D5;box-shadow:0 40px 90px rgba(0,0,0,0.55)">
				<div style="display:grid;grid-template-columns:max-content 1fr;column-gap:24px;row-gap:26px;align-items:center">
					<div style="text-align:end;color:#9A9A9A">PixelyChat:</div><div style="color:#8B5CF6">● ${connected}</div>
					<div style="text-align:end;color:#9A9A9A;white-space:nowrap">${actionWidget}:</div>
					<div style="background:#3D3D3D;border-radius:8px;padding:12px 18px;display:flex;justify-content:space-between">${n.countdown}<span style="color:#9A9A9A">▾</span></div>
					<div></div>
					<div style="margin-top:-16px;background:#3A3A3A;border-radius:10px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,0.4)">
						${[n.startingSoon, n.brb, n.spinWheel, n.countdown, n.hype].map((name) => `<div style="padding:12px 18px;${name === n.countdown ? "background:#5B3FD1;color:#fff" : ""}">${name}</div>`).join("")}
					</div>
					<div></div>
					<div style="color:#9A9A9A;line-height:1.45;font-size:22px">${t.pickHint}</div>
				</div>
			</div>
		</div>`)),
		3: dir(page(`
		<div style="width:100%;text-align:center">
			<h2>${heading(t.multi)}</h2>
			<p class="lead" style="margin:24px auto 70px">${t.multiLead}</p>
			<div style="display:flex;justify-content:center;align-items:center;gap:40px">
				<div><div class="key" style="width:220px;height:220px;background:linear-gradient(180deg,#2A2F3A,#1B1E25);display:grid;place-items:center;font-family:'Space Grotesk';font-size:34px;color:#ECEEF3;line-height:1.1;text-align:center">${t.scene}</div><div class="caption">${t.sceneCaption}</div></div>
				<div style="font-size:64px;color:#9F5BFA">${arrow}</div>
				<div>${img(key("starting-soon", "active", n.startingSoon), 220)}<div class="caption">PixelyChat</div></div>
				<div style="font-size:64px;color:#9F5BFA">${arrow}</div>
				<div>${img(key("countdown", "active", n.countdown, countdown(300)), 220)}<div class="caption">PixelyChat</div></div>
			</div>
			<div style="display:flex;justify-content:center;gap:20px;margin-top:76px">
				<span class="chip">${t.platforms}</span>
				<span class="chip">${t.languages}</span>
				<span class="chip">${t.systems}</span>
			</div>
		</div>`)),
	};
};
for (const locale of Object.keys(NEWS_GALLERY)) {
	for (const [nr, html] of Object.entries(newsGallery(locale))) images[`website/news-gallery-${nr}-${locale}`] = html;
}

fs.mkdirSync(path.join(workDir, "website"), { recursive: true });
fs.mkdirSync(path.join(outDir, "website"), { recursive: true });
// Newer Chrome writes the headless screenshot but then doesn't exit, so wait for a
// fresh, complete file and close Chrome ourselves.
async function screenshot(htmlFile, outFile, width, height) {
	const started = Date.now();
	const child = spawn(chrome, [
		// Own throwaway profile, so an open everyday Chrome can't interfere.
		"--headless=new", `--user-data-dir=${path.join(workDir, "chrome-profile")}`, "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
		"--allow-file-access-from-files", `--window-size=${width},${height}`, "--virtual-time-budget=2000",
		`--screenshot=${outFile}`, pathToFileURL(htmlFile).href,
	], { stdio: "ignore" });
	try {
		let lastSize = -1;
		while (Date.now() - started < 60_000) {
			await new Promise((r) => setTimeout(r, 250));
			const stat = fs.existsSync(outFile) ? fs.statSync(outFile) : null;
			if (stat && stat.mtimeMs >= started && stat.size > 0 && stat.size === lastSize) return;
			lastSize = stat && stat.mtimeMs >= started ? stat.size : -1;
		}
		throw new Error(`Timed out rendering ${path.basename(outFile)}`);
	} finally {
		const exited = new Promise((r) => child.once("exit", r));
		child.kill("SIGKILL");
		await exited;
	}
}
for (const [name, html] of Object.entries(images)) {
	const htmlFile = path.join(workDir, `${name}.html`);
	fs.writeFileSync(htmlFile, html);
	const size = /width: (\d+)px; height: (\d+)px/.exec(html);
	await screenshot(htmlFile, path.join(outDir, `${name}.png`), size[1], size[2]);
	console.log(`marketplace/${name}.png`);
}
// The killed Chrome's helpers may still be releasing the profile for a moment.
fs.rmSync(workDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
