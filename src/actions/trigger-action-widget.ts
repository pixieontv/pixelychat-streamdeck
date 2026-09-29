import streamDeck, {
	action,
	type DidReceiveSettingsEvent,
	type KeyAction,
	type KeyDownEvent,
	type SendToPluginEvent,
	SingletonAction,
	type TitleParametersDidChangeEvent,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";

import { keyImage, timerText, type KeyStatus } from "../key-image";
import { pixelyChat } from "../pixelychat-connection";

/**
 * A key bound to one PixelyChat Action Widget. Only the widget's stable id is
 * authoritative; the cached name/type just keep the key readable while
 * PixelyChat is closed and are never used to pick what runs.
 */
type Settings = {
	widgetId?: string;
	cachedName?: string;
	cachedType?: string;
};

@action({ UUID: "com.pixelychat.streamdeck.trigger-action-widget" })
export class TriggerActionWidget extends SingletonAction<Settings> {
	/** What each key last showed, so an unchanged image is not resent (the timer tick redraws often). */
	private readonly drawn = new Map<string, string>();
	/**
	 * The Title field as typed in Stream Deck. Stream Deck's own title cannot
	 * shrink to fit, so the manifest hides it by default (ShowTitle: false) and
	 * the key draws the text itself instead: the typed title, else the widget
	 * name. The plugin never sets a title. If the user turns "Show Title" back
	 * on, Stream Deck draws it and the key leaves its own text out.
	 */
	private readonly titles = new Map<string, { title: string; shownByStreamDeck: boolean }>();
	private ticker: NodeJS.Timeout | undefined;

	constructor() {
		super();
		pixelyChat.onChange(() => {
			this.updateTicker();
			void this.refreshAll();
		});
	}

	override async onWillAppear(ev: WillAppearEvent<Settings>): Promise<void> {
		// Stream Deck shows the default image again when a key reappears.
		this.drawn.delete(ev.action.id);
		if (ev.action.isKey()) await this.render(ev.action, ev.payload.settings);
	}

	override onWillDisappear(ev: WillDisappearEvent<Settings>): void {
		this.drawn.delete(ev.action.id);
	}

	override async onTitleParametersDidChange(ev: TitleParametersDidChangeEvent<Settings>): Promise<void> {
		streamDeck.logger.debug(`titleParametersDidChange ${ev.action.id}: ${JSON.stringify(ev.payload.title)} showTitle=${ev.payload.titleParameters.showTitle}`);
		this.titles.set(ev.action.id, { title: ev.payload.title, shownByStreamDeck: ev.payload.titleParameters.showTitle });
		if (ev.action.isKey()) await this.render(ev.action, ev.payload.settings);
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<Settings>): Promise<void> {
		if (ev.action.isKey()) await this.render(ev.action, ev.payload.settings);
		await this.updatePropertyInspector(ev.payload.settings);
	}

	override async onKeyDown(ev: KeyDownEvent<Settings>): Promise<void> {
		const widgetId = ev.payload.settings.widgetId;
		const widget = widgetId ? pixelyChat.find(widgetId) : undefined;
		if (!widget || !widget.enabled) {
			await ev.action.showAlert();
			return;
		}
		const result = await pixelyChat.toggle(widget.id);
		if (!result.ok) {
			streamDeck.logger.warn(`Trigger failed for ${widget.id}: ${result.errorCode ?? "unknown"}`);
			await ev.action.showAlert();
		}
		// On success the key's running indicator is the feedback, so no showOk().
	}

	override async onSendToPlugin(ev: SendToPluginEvent<{ event?: string }, Settings>): Promise<void> {
		if (ev.payload?.event === "getWidgets") await this.updatePropertyInspector(await ev.action.getSettings());
	}

	/** Redraws running timers locally while any widget has one; PixelyChat only sends start/stop. */
	private updateTicker(): void {
		const running = pixelyChat.widgets.some((widget) => widget.timer && ("endsAt" in widget.timer || widget.timer.runningSince));
		if (running && !this.ticker) this.ticker = setInterval(() => void this.refreshKeys(), 250);
		if (!running && this.ticker) {
			clearInterval(this.ticker);
			this.ticker = undefined;
		}
	}

	private async refreshKeys(): Promise<void> {
		for (const keyAction of this.actions) {
			if (keyAction.isKey()) await this.render(keyAction, await keyAction.getSettings());
		}
	}

	private async refreshAll(): Promise<void> {
		await this.refreshKeys();
		const visible = streamDeck.ui.action;
		if (visible) await this.updatePropertyInspector((await visible.getSettings()) as Settings);
	}

	private async render(key: KeyAction<Settings>, settings: Settings): Promise<void> {
		const widget = settings.widgetId ? pixelyChat.find(settings.widgetId) : undefined;
		if (widget && (widget.name !== settings.cachedName || widget.type !== settings.cachedType)) {
			await key.setSettings({ ...settings, cachedName: widget.name, cachedType: widget.type });
		}

		let status: KeyStatus;
		if (!pixelyChat.ready) status = "offline";
		else if (!settings.widgetId) status = "idle";
		else if (!widget) status = "missing";
		else if (!widget.enabled) status = "disabled";
		else status = widget.active ? "active" : "idle";

		const timer = status === "active" ? timerText(widget?.timer, Date.now()) : undefined;
		const title = this.titles.get(key.id);
		const name = title?.shownByStreamDeck ? undefined : title?.title.trim() || widget?.name || settings.cachedName;
		const image = keyImage(widget?.type ?? settings.cachedType, status, { timer, name });
		if (this.drawn.get(key.id) === image) return;
		this.drawn.set(key.id, image);
		await key.setImage(image);
	}

	/** Feeds the settings panel's dropdown (sdpi datasource "getWidgets") and its status line. */
	private async updatePropertyInspector(settings: Settings): Promise<void> {
		// Same list as PixelyChat's Dashboard; the key's own widget stays listed while it is off.
		const widgets = pixelyChat.widgets.filter((widget) => widget.enabled || widget.id === settings.widgetId);
		await streamDeck.ui.sendToPropertyInspector({
			event: "getWidgets",
			items: widgets.map((widget) => ({ label: widget.enabled ? widget.name : `${widget.name} (${streamDeck.i18n.translate("off")})`, value: widget.id })),
		});
		await streamDeck.ui.sendToPropertyInspector({
			event: "status",
			connection: pixelyChat.ready ? "connected" : pixelyChat.needsUpdate ? "needsUpdate" : pixelyChat.isTurnedOff ? "turnedOff" : "notRunning",
			empty: pixelyChat.ready && !widgets.some((widget) => widget.enabled),
			missing: pixelyChat.ready && !!settings.widgetId && !pixelyChat.find(settings.widgetId),
		});
	}
}
