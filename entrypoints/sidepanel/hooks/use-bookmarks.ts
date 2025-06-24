import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { browser } from "wxt/browser";

export const useBookmarks = () => {
    const [bookmarks, setBookmarks] = useState<
        Browser.bookmarks.BookmarkTreeNode[]
    >([]);

    const refreshBookmarks = useDebouncedCallback(async () => {
        const bookmarks = (await browser.bookmarks.getTree()) ?? [];
        setBookmarks(bookmarks);
    }, 10);

    useEffect(() => {
        (async () => {
            await refreshBookmarks();
        })();
        browser.bookmarks.onImportBegan.addListener(refreshBookmarks);
        browser.bookmarks.onImportEnded.addListener(refreshBookmarks);

        browser.bookmarks.onCreated.addListener(refreshBookmarks);
        browser.bookmarks.onChildrenReordered.addListener(refreshBookmarks);
        browser.bookmarks.onChanged.addListener(refreshBookmarks);
        browser.bookmarks.onMoved.addListener(refreshBookmarks);
        browser.bookmarks.onRemoved.addListener(refreshBookmarks);
        return () => {
            browser.bookmarks.onImportBegan.removeListener(refreshBookmarks);
            browser.bookmarks.onImportEnded.removeListener(refreshBookmarks);

            browser.bookmarks.onCreated.removeListener(refreshBookmarks);
            browser.bookmarks.onChildrenReordered.removeListener(refreshBookmarks);
            browser.bookmarks.onChanged.removeListener(refreshBookmarks);
            browser.bookmarks.onMoved.removeListener(refreshBookmarks);
            browser.bookmarks.onRemoved.removeListener(refreshBookmarks);
        };
    }, [refreshBookmarks]);

    return bookmarks;
};
