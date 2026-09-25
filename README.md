# PixelyChat for Stream Deck

Stream Deck plugin that triggers PixelyChat Action Widgets from keys. All
widget settings stay in PixelyChat; a key only stores which widget it controls
(by stable id).

## How it talks to PixelyChat

One shared Socket.IO connection to PixelyChat's local server
(`127.0.0.1:4200`, query `dock=streamdeck`). The contract lives in
[`src/protocol.ts`](src/protocol.ts) and mirrors `src/main/local-server.ts` in
pixelychat-app:

- `streamdeck-state` (app → plugin): `{ protocolVersion, widgets: [{ id, name, type, enabled, active }] }`
- `streamdeck:toggle` (plugin → app, acked): `{ widgetId }` → `{ ok, errorCode? }`. Same as the
  widget's global hotkey: start it, or stop it while running.

The app only adds fields. A trigger is never retried or sent after a reconnect.

## Development

Enable Stream Deck's developer mode once (`npx streamdeck dev`). Without it,
`streamdeck restart` (and so `npm run watch`) reports success but keeps the old
plugin process running.

```bash
npm install
npm run build        # bundle to com.pixelychat.streamdeck.sdPlugin/bin
npx streamdeck link com.pixelychat.streamdeck.sdPlugin   # once: load into the Stream Deck app
npm run watch        # rebuild + restart the plugin on change
npm run validate     # Elgato validator
npm run pack         # dist/com.pixelychat.streamdeck.streamDeckPlugin
node scripts/fake-stream-deck.mjs   # test without hardware (PixelyChat must be running)
```

`scripts/fake-stream-deck.mjs` plays the Stream Deck app: it launches the built
plugin, places keys, presses them (this really starts/stops a widget in
PixelyChat) and checks titles, images, alerts and the settings panel data.

Plugin logs: `com.pixelychat.streamdeck.sdPlugin/logs/`. If the plugin dies before it
logs anything, check Stream Deck's own log (`~/Library/Logs/ElgatoStreamDeck/StreamDeck.log`).

Leave `Nodejs.Debug` out of the manifest for releases (no debugger by default).
`"Debug": "disabled"` passes `streamdeck validate` but makes Node exit on launch.
Use `"Debug": "enabled"` only locally when attaching a debugger.
