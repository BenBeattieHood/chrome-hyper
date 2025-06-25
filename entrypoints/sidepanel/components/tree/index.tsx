import { useRef } from 'react';
import useResizeObserver from 'use-resize-observer';
import type { TreeNode } from './types';
import {
    type NodeApi,
    Tree as ArboristTree,
    type NodeRendererProps,
    type TreeApi,
} from 'react-arborist';

export interface TreeProps<Data> {
    items: TreeNode<Data>[];
    isFiltered: boolean;
    onFilter: (item: TreeNode<Data>) => boolean;
    activeItemId: string;
    onActiveItemChange: (item: TreeNode<Data>) => void;
    onItemUpdate?: (item: TreeNode<Data>) => void;
    onItemRemove?: (item: TreeNode<Data>) => void;
    style?: React.CSSProperties;
    className?: string;
    children: React.FC<NodeRendererProps<TreeNode<Data>>>
}

const staticProps = {
    idAccessor: (item) => item.id,
    childrenAccessor: (item) => item.children ?? null,

    disableDrag: false,
    disableDrop: false,
    disableEdit: true,
    disableMultiSelection: false,
    openByDefault: true,
    selectionFollowsFocus: false,
} satisfies Partial<React.ComponentProps<typeof ArboristTree<TreeNode<unknown>>>>;

export const Tree = <Data,>({
    items,
    isFiltered,
    onFilter,
    activeItemId,
    onActiveItemChange,
    style,
    className,
    children,
}: TreeProps<Data>) => {
    type Item = TreeNode<Data>;

    const treeRef = useRef<TreeApi<Item> | undefined>(undefined);

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
            <ArboristTree<TreeNode<Data>>
                {...staticProps as Partial<React.ComponentProps<typeof Tree<TreeNode<Data>>>>}
                ref={treeRef}
                data={items}
                searchTerm={isFiltered ? ' ' : undefined}
                searchMatch={searchMatchHandler}
                onActivate={onActivateHandler}
                selection={activeItemId}
                height={height}
                width={width}
            >
                {children}
            </ArboristTree>
        </div>
    );
};
