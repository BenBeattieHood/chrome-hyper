import { defineConfig } from 'vite'
import type { Bookmarks, Tabs } from 'webextension-polyfill'
import { omit } from './entrypoints/sidepanel/utils/framework';

class EventEmitter<Listener extends (...data: any[]) => void> {
    private listeners: Listener[] = [];

    addListener(listener: Listener) {
        this.listeners.push(listener);
    }

    hasListener(listener: Listener): boolean {
        return this.listeners.includes(listener);
    }

    removeListener(listener: Listener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    emit(data: Parameters<Listener>) {
        this.listeners.forEach(listener => listener(data));
    }
}

const bookmarkData: Bookmarks.BookmarkTreeNode[] = [];
const bookmarkLookup = new Map<string, Bookmarks.BookmarkTreeNode>();
const recentBookmarks: Bookmarks.BookmarkTreeNode[] = [];

let nextTabId = 0;

export default defineConfig({
    root: 'entrypoints/sidepanel',
    define: {
        bookmarks: {
            create: async (bookmark) => {
                const result = {
                    id: crypto.randomUUID(),
                    title: bookmark.title ?? 'Untitled',
                    url: bookmark.url,
                    parentId: bookmark.parentId,
                    dateAdded: Date.now(),
                    dateGroupModified: Date.now(),
                    children: [],
                    type: bookmark.url ? 'bookmark' : 'folder',
                    index: bookmark.index ?? 0,
                } satisfies Bookmarks.BookmarkTreeNode;
                if (result.parentId) {
                    bookmarkLookup.get(result.parentId)?.children?.push(result);
                } else {
                    bookmarkData.push(result);
                }
                recentBookmarks.unshift(result);
                return result;
            },
            get: async (idOrIds) => {
                const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
                return (
                    ids.map(id => omit(bookmarkLookup.get(id)!, 'children'))
                )
            },
            getChildren: async (id) => {
                const bookmark = bookmarkLookup.get(id);
                return (bookmark?.children ?? []).map(child => omit(child, 'children'))
            },
            getRecent: async (maxResults) => {
                return recentBookmarks.slice(0, maxResults);
            },
            getSubTree: async (id) => {
                const bookmark = bookmarkLookup.get(id);
                return bookmark ? [bookmark] : [];
            },
            getTree: async () => {
                return bookmarkData;
            },
            move: bookmarks.move,
            remove: bookmarks.remove,
            removeTree: bookmarks.removeTree,
            search: bookmarks.search,
            update: bookmarks.update,
            onCreated: new EventEmitter<(id: string, bookmark: Bookmarks.BookmarkTreeNode) => void>(),
            onRemoved: new EventEmitter<(id: string, removeInfo: Bookmarks.OnRemovedRemoveInfoType) => void>(),
            onChanged: new EventEmitter<(id: string, changeInfo: Bookmarks.OnChangedChangeInfoType) => void>(),
            onMoved: new EventEmitter<(id: string, moveInfo: Bookmarks.OnMovedMoveInfoType) => void>(),
        } satisfies Bookmarks.Static,
        tabs: {
            captureTab: async (tabId, options) => {
            },
            create: async (createProperties) => {
                const tab = {
                    id: nextTabId++,
                    index: 0,
                    windowId: 0,
                    title: createProperties.title ?? 'New Tab',
                    url: createProperties.url ?? 'about:blank',
                    active: true,
                    pinned: false,
                    audible: false,
                    discarded: false,
                    highlighted: false,
                    incognito: false,
                    status: 'loading',
                } satisfies Tabs.Tab;
                return tab;
            },
            get: async (tabId) => {
                return {
                    id: tabId,
                    index: 0,
                    windowId: 0,
                    title: 'Tab ' + tabId,
                    url: 'https://example.com',
                }
            },
            getCurrent: async () => {
                return {
                    id: 0,
                    index: 0,
                    windowId: 0,
                };
            },

        } satisfies Tabs.Static
    }
})

'(listener: (data: (id: string, bookmark: BookmarkTreeNode) => void) => void) => void'
'(callback: (id: string, bookmark: BookmarkTreeNode) => void, ...params: unknown[]) => void'
