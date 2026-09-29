import streamDeck from "@elgato/streamdeck";
import { io, type Socket } from "socket.io-client";

import {
	CLIENT_QUERY,
	DISABLED_ERROR,
	PIXELYCHAT_URL,
	STATE_EVENT,
	SUPPORTED_PROTOCOL_VERSION,
	TOGGLE_EVENT,
	type StreamDeckState,
	type StreamDeckWidget,
	type ToggleResult,
} from "./protocol";

const TOGGLE_TIMEOUT_MS = 3000;
// Socket.IO does not retry after the server refuses or drops a connection, so
// check again on our own while Stream Deck is switched off in PixelyChat.
const TURNED_OFF_RETRY_MS = 15000;
const logger = streamDeck.logger.createScope("PixelyChat");

/**
 * The one connection to PixelyChat, shared by every key. Socket.IO reconnects
 * on its own with backoff (1s growing to 15s), so PixelyChat can start before
 * or after Stream Deck.
 */
class PixelyChatConnection {
	private socket: Socket | undefined;
	private state: StreamDeckState | undefined;
	private turnedOff = false;
	private retryTimer: NodeJS.Timeout | undefined;
	private readonly listeners = new Set<() => void>();

	start(): void {
		if (this.socket) return;
		this.socket = io(PIXELYCHAT_URL, {
			query: CLIENT_QUERY,
			transports: ["websocket"],
			reconnectionDelay: 1000,
			reconnectionDelayMax: 15000,
		});
		this.socket.on(STATE_EVENT, (state: StreamDeckState) => {
			if (!this.state) logger.info(`Connected (protocol ${state.protocolVersion}, ${state.widgets.length} widgets)`);
			this.state = state;
			this.turnedOff = false;
			this.notify();
		});
		this.socket.on("connect_error", (err) => {
			if (err.message !== DISABLED_ERROR) return; // PixelyChat not running: Socket.IO keeps retrying itself.
			if (!this.turnedOff) logger.info("Stream Deck is turned off in PixelyChat");
			this.turnedOff = true;
			this.notify();
			this.retryLater(TURNED_OFF_RETRY_MS);
		});
		this.socket.on("disconnect", (reason) => {
			logger.info(`Disconnected: ${reason}`);
			this.state = undefined;
			this.notify();
			// PixelyChat dropped us, e.g. Stream Deck was just switched off there.
			if (reason === "io server disconnect") this.retryLater(2000);
		});
	}

	private retryLater(delay: number): void {
		if (this.retryTimer) return;
		this.retryTimer = setTimeout(() => {
			this.retryTimer = undefined;
			this.socket?.connect();
		}, delay);
	}

	/** Connected and holding a widget list this plugin understands. */
	get ready(): boolean {
		return !!this.socket?.connected && !!this.state && !this.needsUpdate;
	}

	/** Stream Deck is switched off in PixelyChat's Setup → Integrations. */
	get isTurnedOff(): boolean {
		return this.turnedOff;
	}

	/** PixelyChat speaks a newer protocol than this plugin supports. */
	get needsUpdate(): boolean {
		return !!this.state && this.state.protocolVersion > SUPPORTED_PROTOCOL_VERSION;
	}

	get widgets(): StreamDeckWidget[] {
		return this.ready ? this.state!.widgets : [];
	}

	find(widgetId: string): StreamDeckWidget | undefined {
		return this.widgets.find((widget) => widget.id === widgetId);
	}

	onChange(listener: () => void): void {
		this.listeners.add(listener);
	}

	async toggle(widgetId: string): Promise<ToggleResult> {
		// Socket.IO buffers emits made while disconnected and sends them after
		// reconnecting. A key press must never fire later, so only send now.
		if (!this.ready) return { ok: false, errorCode: "notConnected" };
		try {
			return await this.socket!.timeout(TOGGLE_TIMEOUT_MS).emitWithAck(TOGGLE_EVENT, { widgetId });
		} catch {
			// No reply: the press may or may not have run in PixelyChat. Never resend it.
			return { ok: false, errorCode: "timeout" };
		}
	}

	private notify(): void {
		for (const listener of this.listeners) listener();
	}
}

export const pixelyChat = new PixelyChatConnection();
