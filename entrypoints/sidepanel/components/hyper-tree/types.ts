import { TreeNode } from "../tree/types";

export type HyperTreeNodeData = {
    bookmark: Browser.bookmarks.BookmarkTreeNode;
    tab: Browser.tabs.Tab | undefined;
} | {
    tab: Browser.tabs.Tab;
}

export type HyperTreeNode = TreeNode<HyperTreeNodeData>
