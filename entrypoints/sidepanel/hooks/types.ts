export interface ListNode<Data> {
    id: string;
    text: string;
    data: Data
}

export interface TreeNode<Data> extends ListNode<Data> {
    children?: TreeNode<Data>[];
}

export type HyperTreeNodeData = {
    bookmark: Browser.bookmarks.BookmarkTreeNode;
    tab: Browser.tabs.Tab | undefined;
} | {
    tab: Browser.tabs.Tab;
}

export type HyperTreeNode = TreeNode<HyperTreeNodeData>

export type HyperListNode = ListNode<HyperTreeNodeData>;
