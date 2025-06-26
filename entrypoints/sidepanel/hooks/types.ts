export interface TreeNode<Data> {
    id: string;
    text: string;
    data: Data
    children?: TreeNode<Data>[];
}

export type HyperTreeNodeData = {
    bookmark: Browser.bookmarks.BookmarkTreeNode;
    tab: Browser.tabs.Tab | undefined;
} | {
    tab: Browser.tabs.Tab;
}

export type HyperTreeNode = TreeNode<HyperTreeNodeData>
