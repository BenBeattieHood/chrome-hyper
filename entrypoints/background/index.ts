import { browser } from "wxt/browser";

export default defineBackground(() => {
	// Executed when background is loaded
	browser.sidePanel
		.setPanelBehavior({ openPanelOnActionClick: true })
		.catch((error: unknown) => console.error(error));
});
