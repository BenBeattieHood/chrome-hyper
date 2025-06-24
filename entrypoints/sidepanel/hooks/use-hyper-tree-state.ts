import { HyperTreeProps } from "../components/hyper-tree";
import { TreeNode } from "../components/hyper-tree/types";

interface UseHyperTreeStateProps<InputData, ItemData> {
    bookmarks: Browser.bookmarks.BookmarkTreeNode[];
    tabs: Browser.tabs.Tab[];
    // onFocusedItemChange: (item: TreeItem<ItemData>) => void;
    // onItemUpdate?: (item: TreeItem<ItemData>) => void;
    // onItemRemove?: (item: TreeItem<ItemData>) => void;
}

export type HyperTreeNodeData = {
    bookmark: Browser.bookmarks.BookmarkTreeNode;
    tab: Browser.tabs.Tab | undefined;
} | {
    tab: Browser.tabs.Tab;
}

export const useHyperTreeState = <InputData, ItemData>({
    bookmarks,
    tabs
}: UseHyperTreeStateProps<InputData, ItemData>) => {
    const items = useMemo(() => {
        const tabLookup = new Map<string, Browser.tabs.Tab[]>();
        tabs.forEach(tab => {
            const urlKey = getUrlAsMapKey(tab.url);
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
    } satisfies Partial<HyperTreeProps<HyperTreeNodeData>>;
}

const getUrlAsMapKey = (url: string | undefined): string => {
    if (!url) {
        return 'about:blank'; // Fallback for undefined URLs
    }
    try {
        const result = new URL(url);
        result.hostname = result.hostname.toLowerCase(); // Normalize hostname to lowercase
        result.pathname = result.pathname.replace(/\/$/, ''); // Remove trailing slash for consistency
        return result.toString();
    } catch (e) {
        console.error("Invalid URL:", url, e);
        return url; // Fallback to the original string if URL parsing fails
    }
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
    const bookmarkUrlAsMapKey = getUrlAsMapKey(bookmark.url);
    const tabs = bookmarkUrlAsMapKey ? tabLookup.get(bookmarkUrlAsMapKey) : undefined;
    const tab = tabs && tabs.length > 0 ? tabs.find(tab => !allocatedTabs.has(tab)) : undefined;
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
