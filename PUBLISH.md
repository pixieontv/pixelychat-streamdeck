# Publishing to the Elgato Marketplace

How to release the PixelyChat plugin on the Elgato Marketplace, first release
and updates. Elgato's docs are linked at the end; check them if a step here no
longer matches what Maker Console shows.

## 1. One-time account setup

1. Sign in to [Maker Console](https://maker.elgato.com/) with an Elgato account.
2. Create the organization **PixelyChat**. It is shown as the plugin's author,
   which is why the plugin itself is just called "PixelyChat".
3. Sign the **Maker Agreement**. Submitting is not possible before this.
4. Payouts (Stripe Connect, 70/30 split) are only needed for paid products. The
   plugin is free, so skip them.

Questions or account problems: maker@elgato.com or the
[Makers Discord](https://discord.gg/4rTB7cYzyj).

## 2. Prepare the release build

1. **Version:** raise `Version` in `com.pixelychat.streamdeck.sdPlugin/manifest.json`
   (four parts, e.g. `1.0.0.0` → `1.0.1.0`). Every submitted file gets a new version.
2. **Manifest checks:**
   - No `Nodejs.Debug` field. `"Debug": "disabled"` passes validation but makes
     the plugin crash on every launch.
   - `UUID` stays `com.pixelychat.streamdeck`. It cannot change after the first
     publish.
3. **Build and package:**

   ```bash
   npm run pack
   ```

   This builds, validates and writes
   `dist/com.pixelychat.streamdeck.streamDeckPlugin`, the file to upload.

## 3. Test the packaged file (not the dev link)

The validator and the fake deck do not start the plugin the way Stream Deck
does, so always install the real package once.

1. Remove the development link so it doesn't shadow the install:

   ```bash
   npx streamdeck unlink com.pixelychat.streamdeck
   ```

2. Double-click `dist/com.pixelychat.streamdeck.streamDeckPlugin` and confirm the
   install in Stream Deck.
3. With a released PixelyChat build (not `npm run dev`), check on **macOS and
   Windows**:
   - The plugin starts. `~/Library/Logs/ElgatoStreamDeck/StreamDeck.log` must not
     show `Process stopped (unexpected)` for `com.pixelychat.streamdeck`.
   - Add "Trigger Action Widget". The settings panel shows "● Connected" and the
     same widgets as PixelyChat's Dashboard.
   - A press starts a widget and the key shows the ring. A Countdown key shows
     the time and a second press stops it.
   - Quit PixelyChat: keys grey out and a press shows the alert. Start
     PixelyChat again: keys recover by themselves.
   - Long widget names fit on the key.
   - Switch Stream Deck's language (e.g. German) and check the action name and
     the settings panel.
   - Put the key in a Multi Action.
4. Optional automated check: `node scripts/fake-stream-deck.mjs` (needs PixelyChat
   running).
5. Afterwards, relink for development: `npx streamdeck link com.pixelychat.streamdeck.sdPlugin`.

## 4. Prepare the listing (all text in English)

| Item | Requirement | Source |
| --- | --- | --- |
| Thumbnail | 1920 × 960 PNG | `marketplace/thumbnail.png` |
| Gallery | 3 items: 1920 × 960 PNG and/or 1920 × 1080 MP4 | `marketplace/gallery-1.png` … `gallery-3.png` |
| App icon | PNG | `com.pixelychat.streamdeck.sdPlugin/imgs/plugin/marketplace@2x.png` (512 × 512) |
| Description | max. 1,500 characters, with keywords | draft below |
| Release notes | what this version contains | draft below |
| Links | website / support | https://pixelychat.com |

The images are rendered from the plugin's real key artwork by
`node scripts/marketplace-images.mjs`. Re-run it after changing the key design.
It needs Google Chrome and the pixelychat-app checkout next to this repo for the
brand fonts. A short video of a key press starting a widget in OBS can replace
one gallery image (1920 × 1080 MP4).

**Demo video:** Elgato requires one for plugins that need hardware or a paid
service. The plugin needs the PixelyChat app, so include a video of a press
starting a widget anyway. It speeds up review.

### Draft description

> Control PixelyChat from your Stream Deck. Put your PixelyChat Action Widgets on
> physical keys: start a Countdown, spin a Giveaway Wheel, show Starting Soon or
> Be Right Back, run a Stopwatch or open the Game Queue with one press, and press
> again to stop.
>
> Everything is set up once in PixelyChat. On Stream Deck you just pick the widget.
> Keys show live state: a running widget gets a highlight, and countdowns and
> stopwatches show their time right on the key. Works in Multi Actions, e.g. to
> switch an OBS scene and start your Starting Soon countdown together.
>
> Requires the free PixelyChat app (pixelychat.com) running on the same computer.
> Works with Twitch, YouTube, TikTok and Kick streams.

### Draft release notes (1.0.0.0)

> First release. "Trigger Action Widget" starts or stops any PixelyChat Action
> Widget from a key, with live status, countdown/stopwatch time on the key, and
> support for 8 Stream Deck languages.

## 5. Submit in Maker Console

1. **Products → new product → Stream Deck plugin.**
2. Upload `dist/com.pixelychat.streamdeck.streamDeckPlugin`.
3. Enter name, description (with keywords), tags and links. Set the price to free.
4. Add the thumbnail, the 3 gallery items and the app icon.
5. Add the release notes.
6. Choose whether to **publish automatically after approval**. Untick it to pick
   the go-live date yourself, e.g. to match a PixelyChat release.
7. Submit. Status becomes **Pending review**.

### Submitting before the matching PixelyChat release

To have the plugin approved in advance and go live together with a new PixelyChat:

- Untick **publish automatically after approval** (step 6). After review the
  status is **Approved**, not visible on the Marketplace yet.
- Reviewers need a PixelyChat build that supports the plugin. Without one they
  only see "Not running" and grey keys. In the submission notes, add a download
  link to that pre-release build, a demo video of a key press starting a widget,
  or both.
- Submit at least two weeks ahead (review takes 4–10 working days).
- On release day: Maker Console → the product → **Versions** → **Release**.
  There is no second review.
- A plugin change after approval means a new version and a new review.

## 6. Review

- Takes **4–10 working days**, longer in busy periods.
- Elgato checks the plugin's quality and function, the name, description and
  release notes, the media, and the supported devices and OS.
- The result comes by email from maker@elgato.com:
  - **Published:** live on the Marketplace.
  - **Approved:** waiting for you. Release it in the **Versions** tab with
    **Release**.
  - **Rejected:** fix the issues and resubmit, as a revision or a new version.

## 7. After the first publish

- In pixelychat-app, add the Marketplace link as a button on the Stream Deck tab
  (`src/renderer/pages/IntegrationsPage.tsx`) and ship it with the next PixelyChat
  release.

## Updates

1. Raise the version in `manifest.json`, then run steps 2–3 again.
2. Maker Console → the product → **Versions** tab → **Create version**. Upload the
   new file, add release notes and choose auto-publish.
3. Keep the PixelyChat protocol compatible (see README). Users update the plugin
   and PixelyChat independently, so the plugin must keep working with older and
   newer PixelyChat versions.

## Elgato references

- [Distribution](https://docs.elgato.com/streamdeck/sdk/introduction/distribution/)
- [Become a Maker](https://docs.elgato.com/makers/general/become-a-maker)
- [Submitting products](https://docs.elgato.com/maker-console/submitting-products/)
- [Review process](https://docs.elgato.com/maker-console/review-process/)
- [Managing products](https://docs.elgato.com/maker-console/managing-products/)
- [Plugin guidelines](https://docs.elgato.com/guidelines/stream-deck/plugins/)
