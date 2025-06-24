export interface TreeNode<Data> {
    id: string;
    text: string;
    data: Data
    children?: TreeNode<Data>[];
}
