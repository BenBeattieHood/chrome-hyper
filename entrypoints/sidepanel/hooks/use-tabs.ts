import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { browser } from "wxt/browser";

// switching tabs: https://groups.google.com/a/chromium.org/g/chromium-extensions/c/x36zW3QsF0g/m/NjfwSZastrAJ

export const useTabs = () => {
    const [tabs, setTabs] = useState<Browser.tabs.Tab[]>([]);

    const refreshTabs = useDebouncedCallback(async () => {
        const tabs = (await browser.tabs.query({})) ?? [];
        setTabs(tabs);
    }, 10);

    // groupId is -1 if ungrouped

    useEffect(() => {
        (async () => {
            await refreshTabs();
        })();

        //browser.tabs.onAttached.addListener(refreshTabs);
        //browser.tabs.onDetached.addListener(refreshTabs);
        //browser.tabs.onMoved.addListener(refreshTabs);

        browser.tabs.onCreated.addListener(refreshTabs);
        browser.tabs.onRemoved.addListener(refreshTabs);
        browser.tabs.onHighlighted.addListener(refreshTabs);
        browser.tabs.onActivated.addListener(refreshTabs);
        browser.tabs.onReplaced.addListener(refreshTabs);
        browser.tabs.onUpdated.addListener(refreshTabs);
        return () => {
            //browser.tabs.onAttached.removeListener(refreshTabs);
            //browser.tabs.onDetached.removeListener(refreshTabs);
            //browser.tabs.onMoved.removeListener(refreshTabs);

            browser.tabs.onCreated.removeListener(refreshTabs);
            browser.tabs.onRemoved.removeListener(refreshTabs);
            browser.tabs.onHighlighted.removeListener(refreshTabs);
            browser.tabs.onActivated.removeListener(refreshTabs);
            browser.tabs.onReplaced.removeListener(refreshTabs);
            browser.tabs.onUpdated.removeListener(refreshTabs);
        };
    }, [refreshTabs]);

    return tabs;
};
