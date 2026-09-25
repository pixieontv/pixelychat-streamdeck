// Contract with PixelyChat's local server (pixelychat-app: src/main/local-server.ts).
// The app only ever adds fields, so anything unknown here is ignored. The app
// bumps protocolVersion only for a change this plugin could not ignore.

export const PIXELYCHAT_URL = "http://127.0.0.1:4200";
export const SUPPORTED_PROTOCOL_VERSION = 1;

/** Socket.IO query that identifies this client to PixelyChat. */
export const CLIENT_QUERY = { dock: "streamdeck" };

/** App → plugin: sent on connect and whenever the list or a widget's running state changes. */
export const STATE_EVENT = "streamdeck-state";
/** Plugin → app, with ack: start the widget's primary action, or stop it while running. */
export const TOGGLE_EVENT = "streamdeck:toggle";

/**
 * A running timer as fixed timestamps (same clock: both run on this machine).
 * `{ endsAt }` counts down; `{ elapsedMs, runningSince? }` counts up and is
 * paused when `runningSince` is missing.
 */
export type StreamDeckTimer = { endsAt: number } | { elapsedMs: number; runningSince?: number };

export interface StreamDeckWidget {
	id: string;
	name: string;
	type: string;
	enabled: boolean;
	active: boolean;
	timer?: StreamDeckTimer;
}

export interface StreamDeckState {
	protocolVersion: number;
	widgets: StreamDeckWidget[];
}

export interface ToggleResult {
	ok: boolean;
	errorCode?: string;
}
