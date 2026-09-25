// Key artwork: the same Lucide icon per widget type as PixelyChat's own
// ActionWidgetIcon (lucide 0.383.0, ISC — see THIRD_PARTY_NOTICES.txt), in the
// PixelyChat logo's colors. A running timer replaces the icon with its time.

import type { StreamDeckTimer } from "./protocol";

export type KeyStatus = "idle" | "active" | "disabled" | "missing" | "offline";

const TIMER = '<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>';
const TIMER_RESET = '<path d="M10 2h4"/><path d="M12 14v-4"/><path d="M4 13a8 8 0 0 1 8-7 8 8 0 1 1-5.3 14L4 17.6"/><path d="M9 17H4v5"/>';
const APERTURE = '<circle cx="12" cy="12" r="10"/><path d="m14.31 8 5.74 9.94"/><path d="M9.69 8h11.48"/><path d="m7.38 12 5.74-9.94"/><path d="M9.69 16 3.95 6.06"/><path d="M14.31 16H2.83"/><path d="m16.62 12-5.74 9.94"/>';
const USERS_ROUND = '<path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>';
const FLAME = '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>';
const SPARKLES = '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>';

// Mirrors pixelychat-app src/renderer/components/ActionWidgetIcon.tsx.
// Unknown (newer) widget types fall back to Sparkles, like the app does.
const ICONS: Record<string, string> = {
	countdown: TIMER,
	stopwatch: TIMER_RESET,
	"spin-wheel": APERTURE,
	"game-queue": USERS_ROUND,
	hype: FLAME,
	brb: TIMER_RESET,
	"starting-soon": TIMER,
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

export function keyImage(type: string | undefined, status: KeyStatus, timer?: string): string {
	const icon = (type && ICONS[type]) || SPARKLES;
	const dot = DOT_COLOR[status];
	const fontSize = !timer ? 0 : timer.length <= 4 ? 50 : timer.length <= 5 ? 44 : 32;
	const svg = [
		'<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">',
		"<defs>",
		`<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COLORS.bgTop}"/><stop offset="1" stop-color="${COLORS.bgBottom}"/></linearGradient>`,
		`<linearGradient id="brand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COLORS.brandPink}"/><stop offset="1" stop-color="${COLORS.brandViolet}"/></linearGradient>`,
		"</defs>",
		'<rect width="144" height="144" fill="url(#bg)"/>',
		status === "active" ? '<rect x="5" y="5" width="134" height="134" rx="18" fill="none" stroke="url(#brand)" stroke-width="6"/>' : "",
		timer
			? `<text x="72" y="${48 + fontSize / 2.8}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${fontSize}" fill="${COLORS.text}">${timer}</text>`
			: `<g transform="translate(44 20) scale(2.3333)" fill="none" stroke="${ICON_COLOR[status]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</g>`,
		dot ? `<circle cx="120" cy="24" r="9" fill="${dot}"/>` : "",
		"</svg>",
	].join("");
	return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
