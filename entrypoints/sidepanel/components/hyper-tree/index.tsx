import { useRef } from 'react';
import useResizeObserver from 'use-resize-observer';
import type { TreeNode } from './types';
import {
    type NodeApi,
    Tree,
    type NodeRendererProps,
    type TreeApi,
} from 'react-arborist';

export interface HyperTreeProps<Data> {
    items: TreeNode<Data>[];
    isFiltered: boolean;
    onFilter: (item: TreeNode<Data>) => boolean;
    activeItemId: string;
    onActiveItemChange: (item: TreeNode<Data>) => void;
    onItemUpdate?: (item: TreeNode<Data>) => void;
    onItemRemove?: (item: TreeNode<Data>) => void;
    style?: React.CSSProperties;
    className?: string;
}

export const HyperTree = <Data,>({
    items,
    isFiltered,
    onFilter,
    activeItemId,
    onActiveItemChange,
    style,
    className,
}: HyperTreeProps<Data>) => {
    type Item = TreeNode<Data>;

    const treeRef = useRef<TreeApi<Item> | undefined>(undefined);
    const staticProps = useMemo(
        () =>
            ({
                idAccessor: (item: Item) => item.id,
                childrenAccessor: (item: Item) => item.children ?? null,

                ref: treeRef,
                disableDrag: false,
                disableDrop: false,
                disableEdit: true,
                disableMultiSelection: false,
                openByDefault: true,
                selectionFollowsFocus: false,
            }) satisfies Partial<React.ComponentProps<typeof Tree<Item>>>,
        [treeRef],
    );

    const searchMatchHandler = useCallback(
        (node: NodeApi<Item>) => onFilter(node.data),
        [onFilter],
    );

    const onActivateHandler = useCallback(
        (node: NodeApi<Item>) => {
            if (!node.data.children) {
                onActiveItemChange(node.data);
            }
        },
        [onActiveItemChange],
    );

    const { ref: containerRef, width, height } = useResizeObserver();

    return (
        <div ref={containerRef} style={style} className={className}>
            <Tree
                {...staticProps}
                data={items}
                searchTerm={isFiltered ? ' ' : undefined}
                searchMatch={searchMatchHandler}
                onActivate={onActivateHandler}
                selection={activeItemId}
                height={height}
                width={width}
            >
                {HyperTreeNode}
            </Tree>
        </div>
    );
};

const HyperTreeNode = <Data,>({
    node,
    style,
    tree,
    dragHandle,
    preview,
}: NodeRendererProps<TreeNode<Data>>) => {
    return (
        <div style={style} ref={dragHandle}>
            {node.data.children ? 'p' : 'c'}
            {preview ? '_' : ' '}
            {node.data.text}
        </div>
    );
};
