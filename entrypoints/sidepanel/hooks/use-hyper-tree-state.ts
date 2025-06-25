import { HyperTreeNodeData } from "../components/hyper-tree/types";
import { TreeProps } from "../components/tree";
import { TreeNode } from "../components/tree/types";

interface UseHyperTreeStateProps<InputData, ItemData> {
    bookmarks: Browser.bookmarks.BookmarkTreeNode[];
    tabs: Browser.tabs.Tab[];
    // onFocusedItemChange: (item: TreeItem<ItemData>) => void;
    // onItemUpdate?: (item: TreeItem<ItemData>) => void;
    // onItemRemove?: (item: TreeItem<ItemData>) => void;
}

const NEW_TAB_URL = 'about:newtab';

export const useHyperTreeState = <InputData, ItemData>({
    bookmarks,
    tabs
}: UseHyperTreeStateProps<InputData, ItemData>) => {
    const items = useMemo(() => {
        const tabLookup = new Map<string, Browser.tabs.Tab[]>();
        tabs.forEach(tab => {
            const urlKey = tab.url !== undefined ? getUrlAsMapKey(tab.url) : NEW_TAB_URL;
            const existingTabs = tabLookup.get(urlKey);
            if (existingTabs) {
                existingTabs.push(tab);
            }
            else {
                tabLookup.set(urlKey, [tab]);
            }
        });
        const allocatedTabs = new WeakSet<Browser.tabs.Tab>();
        const treeItems = bookmarks.map(bookmark => convertBookmarkToTreeItem(bookmark, tabLookup, allocatedTabs));

        return [...treeItems, ...tabs.filter(tab => !allocatedTabs.has(tab)).map(tab => convertTabToOrphanedTreeItem(tab))];
    }, [bookmarks, tabs]);

    return {
        items,
        activeItemId: tabs.find(tab => tab.highlighted)?.url,
    } satisfies Partial<TreeProps<HyperTreeNodeData>>;
}

const getUrlAsMapKey = (url: string): string => {
    if (url) {
        const urlLowerCase = url.toLowerCase();
        switch (urlLowerCase) {
            // Normalize new tab URL across browsers and extensions (user can customize new tab page in many browsers)
            case 'chrome://newtab/':
            case 'firefox://newtab/':
            case 'brave://newtab/':
                return NEW_TAB_URL;
        }
    }
    const result = new URL(url);
    result.hostname = result.hostname.toLowerCase(); // Normalize hostname to lowercase
    result.pathname = result.pathname.replace(/\/$/, ''); // Remove trailing slash for consistency
    return result.toString();
}

export function getHyperTreeNodeId(item: Browser.bookmarks.BookmarkTreeNode | Browser.tabs.Tab): string {
    if (!('id' in item) || item.id === undefined || item.id === null) {
        throw new Error("Item must have an 'id' property");
    }
    const prefix = "parentId" in item ? 'bookmark-' : 'tab-';
    return prefix + item.id.toString();
}

const convertBookmarkToTreeItem = (
    bookmark: Browser.bookmarks.BookmarkTreeNode,
    tabLookup: Map<string, Browser.tabs.Tab[]>,
    allocatedTabs: WeakSet<Browser.tabs.Tab>
): TreeNode<HyperTreeNodeData> => {
    if (bookmark.url === undefined && bookmark.children === undefined) {
        throw new Error("Bookmark must have either a 'url' or 'children' property");
    }
    const bookmarkUrlAsMapKey = bookmark.url !== undefined ? getUrlAsMapKey(bookmark.url) : undefined;
    const tabs = bookmarkUrlAsMapKey !== undefined ? tabLookup.get(bookmarkUrlAsMapKey) : undefined;
    const tab = tabs !== undefined && tabs.length > 0 ? tabs.find(tab => !allocatedTabs.has(tab)) : undefined;
    if (tab) {
        allocatedTabs.add(tab);
    }
    const result: TreeNode<HyperTreeNodeData> = {
        id: getHyperTreeNodeId(tab ?? bookmark),
        text: bookmark.title,
        data: {
            bookmark,
            tab,
        },
        children: bookmark.children ? bookmark.children.map(child => convertBookmarkToTreeItem(child, tabLookup, allocatedTabs)) : undefined
    }
    return result;
}

const convertTabToOrphanedTreeItem = (
    tab: Browser.tabs.Tab,
): TreeNode<HyperTreeNodeData> => {
    return {
        id: getHyperTreeNodeId(tab),
        text: tab.title || 'Untitled Tab',
        data: {
            bookmark: undefined,
            tab
        },
        children: undefined
    }
}
