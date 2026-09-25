import streamDeck from "@elgato/streamdeck";

import { TriggerActionWidget } from "./actions/trigger-action-widget";
import { pixelyChat } from "./pixelychat-connection";

streamDeck.logger.setLevel("info");

streamDeck.actions.registerAction(new TriggerActionWidget());

pixelyChat.start();
streamDeck.connect();
