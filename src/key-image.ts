// Key artwork: the same Lucide icon per widget type as PixelyChat's own
// ActionWidgetIcon (lucide 0.383.0, ISC — see com.pixelychat.streamdeck.sdPlugin/THIRD_PARTY_NOTICES.txt), in the
// PixelyChat logo's colors. A running timer replaces the icon with its time.

import type { StreamDeckTimer } from "./protocol";

export type KeyStatus = "idle" | "active" | "disabled" | "missing" | "offline";

const TIMER = '<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>';
const TIMER_RESET = '<path d="M10 2h4"/><path d="M12 14v-4"/><path d="M4 13a8 8 0 0 1 8-7 8 8 0 1 1-5.3 14L4 17.6"/><path d="M9 17H4v5"/>';
const APERTURE = '<circle cx="12" cy="12" r="10"/><path d="m14.31 8 5.74 9.94"/><path d="M9.69 8h11.48"/><path d="m7.38 12 5.74-9.94"/><path d="M9.69 16 3.95 6.06"/><path d="M14.31 16H2.83"/><path d="m16.62 12-5.74 9.94"/>';
const USERS_ROUND = '<path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>';
const FLAME = '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>';
const PLAY = '<polygon points="6 3 20 12 6 21 6 3"/>';
const COFFEE = '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>';
const SPARKLES = '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>';

// Mirrors pixelychat-app src/renderer/components/ActionWidgetIcon.tsx.
// Unknown (newer) widget types fall back to Sparkles, like the app does.
const ICONS: Record<string, string> = {
	countdown: TIMER,
	stopwatch: TIMER_RESET,
	"spin-wheel": APERTURE,
	"game-queue": USERS_ROUND,
	hype: FLAME,
	brb: COFFEE,
	"starting-soon": PLAY,
};

// Background and accent gradient from the PixelyChat logo; the rest from the app theme.
const COLORS = {
	bgTop: "#140A2E",
	bgBottom: "#0A051C",
	brandPink: "#EA66F3",
	brandViolet: "#773CF6",
	text: "#ECEEF3",
	faint: "#565B66",
	warning: "#E8A23D",
	offline: "#454A55",
};

const ICON_COLOR: Record<KeyStatus, string> = {
	idle: COLORS.text,
	active: COLORS.brandPink,
	disabled: COLORS.faint,
	missing: COLORS.faint,
	offline: COLORS.faint,
};

const DOT_COLOR: Partial<Record<KeyStatus, string>> = {
	missing: COLORS.warning,
	offline: COLORS.offline,
};

/** "0:27", "12:05" or "1:02:03"; undefined when there is no timer to show. */
export function timerText(timer: StreamDeckTimer | undefined, now: number): string | undefined {
	if (!timer) return undefined;
	const ms = "endsAt" in timer
		? Math.max(0, timer.endsAt - now)
		: timer.elapsedMs + (timer.runningSince ? Math.max(0, now - timer.runningSince) : 0);
	// Counting down rounds up so the key reaches 0:00 exactly when the countdown ends.
	const total = "endsAt" in timer ? Math.ceil(ms / 1000) : Math.floor(ms / 1000);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = String(total % 60).padStart(2, "0");
	return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

// No font metrics are available in the plugin, so text is fitted with
// per-character widths close to Helvetica/Arial Bold (in em), plus 4% margin.
function textWidth(text: string, fontSize: number): number {
	let em = 0;
	for (const char of text) {
		if (/[\u1100-\u11ff\u2e80-\ua4cf\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/.test(char)) em += 1;
		else if (/[ il.,:;|!'I]/.test(char)) em += 0.28;
		else if (/[fjrt()\-]/.test(char)) em += 0.38;
		else if (/[mwMW]/.test(char)) em += 0.88;
		else if (/[A-Z#%&@?]/.test(char)) em += 0.72;
		else em += 0.58; // lowercase and digits
	}
	return em * fontSize * 1.04;
}

function escapeXml(text: string): string {
	return text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!);
}

/** The largest size from `max` down to `min` at which `text` fits `width`, or undefined. */
function fitSize(text: string, width: number, max: number, min: number): number | undefined {
	for (let size = max; size >= min; size -= 1) if (textWidth(text, size) <= width) return size;
	return undefined;
}

/** Splits a name into two lines as evenly as possible, at spaces when there are any. */
function splitInTwo(text: string): [string, string] {
	const words = text.split(" ");
	if (words.length > 1) {
		let best: [string, string] = [text, ""];
		let bestDiff = Infinity;
		for (let i = 1; i < words.length; i++) {
			const pair: [string, string] = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
			const diff = Math.abs(textWidth(pair[0], 1) - textWidth(pair[1], 1));
			if (diff < bestDiff) [best, bestDiff] = [pair, diff];
		}
		return best;
	}
	const chars = [...text];
	const half = Math.ceil(chars.length / 2);
	return [chars.slice(0, half).join(""), chars.slice(half).join("")];
}

function truncate(text: string, width: number, fontSize: number): string {
	const chars = [...text];
	while (chars.length > 1 && textWidth(`${chars.join("")}…`, fontSize) > width) chars.pop();
	return `${chars.join("").trimEnd()}…`;
}

const TEXT_WIDTH = 118; // inside the ring (its inner edge is at 11..133)
const FONT = 'font-family="Helvetica, Arial, sans-serif" font-weight="700" text-anchor="middle"';

/** The name as one line, else two lines, shrunk to fit; truncated only as a last resort. */
function nameLines(name: string): { lines: string[]; fontSize: number } {
	const single = fitSize(name, TEXT_WIDTH, 24, 18);
	if (single) return { lines: [name], fontSize: single };
	const [first, second] = splitInTwo(name);
	const longer = textWidth(first, 1) >= textWidth(second, 1) ? first : second;
	const double = fitSize(longer, TEXT_WIDTH, 20, 13);
	if (double && second) return { lines: [first, second], fontSize: double };
	return { lines: [truncate(first, TEXT_WIDTH, 13), ...(second ? [truncate(second, TEXT_WIDTH, 13)] : [])], fontSize: 13 };
}

/**
 * The key, drawn at 144×144: icon (or running time) on top, the widget name
 * below it. `name` is omitted when the user typed their own title in Stream
 * Deck, which Stream Deck then draws itself.
 */
export function keyImage(type: string | undefined, status: KeyStatus, options: { timer?: string; name?: string } = {}): string {
	const icon = (type && ICONS[type]) || SPARKLES;
	const dot = DOT_COLOR[status];
	const name = options.name?.trim() ? nameLines(options.name.trim()) : undefined;

	// Vertical layout: the top block (icon or time) is centered in the space above the name.
	const lineHeight = name ? name.fontSize * 1.15 : 0;
	const nameTop = name ? 124 - lineHeight * name.lines.length : 144;
	const blockCenter = name ? (16 + nameTop) / 2 + 2 : 72;
	const iconSize = name ? (name.lines.length > 1 ? 40 : 46) : 58;

	let block: string;
	if (options.timer) {
		const maxSize = name ? (name.lines.length > 1 ? 34 : 40) : 50;
		const size = fitSize(options.timer, TEXT_WIDTH, maxSize, 16) ?? 16;
		block = `<text x="72" y="${(blockCenter + size * 0.36).toFixed(1)}" ${FONT} font-size="${size}" fill="${COLORS.text}">${options.timer}</text>`;
	} else {
		const scale = iconSize / 24;
		block = `<g transform="translate(${(72 - iconSize / 2).toFixed(1)} ${(blockCenter - iconSize / 2).toFixed(1)}) scale(${scale.toFixed(4)})" fill="none" stroke="${ICON_COLOR[status]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</g>`;
	}

	const nameColor = status === "idle" || status === "active" ? COLORS.text : COLORS.faint;
	const nameText = name
		? name.lines.map((line, i) => `<text x="72" y="${(nameTop + lineHeight * (i + 1) - name.fontSize * 0.25).toFixed(1)}" ${FONT} font-size="${name.fontSize}" fill="${nameColor}">${escapeXml(line)}</text>`).join("")
		: "";

	const svg = [
		'<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">',
		"<defs>",
		`<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COLORS.bgTop}"/><stop offset="1" stop-color="${COLORS.bgBottom}"/></linearGradient>`,
		`<linearGradient id="brand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COLORS.brandPink}"/><stop offset="1" stop-color="${COLORS.brandViolet}"/></linearGradient>`,
		"</defs>",
		'<rect width="144" height="144" fill="url(#bg)"/>',
		// Inset so the phone app's rounded key corners never clip it.
		status === "active" ? '<rect x="8" y="8" width="128" height="128" rx="26" fill="none" stroke="url(#brand)" stroke-width="6"/>' : "",
		block,
		nameText,
		dot ? `<circle cx="116" cy="28" r="8" fill="${dot}"/>` : "",
		"</svg>",
	].join("");
	return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
