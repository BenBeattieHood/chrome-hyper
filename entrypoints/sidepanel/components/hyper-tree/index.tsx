import React from 'react';
import { pick } from '../../utils/framework';
import { HyperTreeNode } from './types';
import { Tree } from '../tree';
import { NodeRendererProps } from 'react-arborist';
import { AppWindow, Bookmark, ChevronDown } from 'lucide-react';

export interface HyperTreeProps {
    items: HyperTreeNode[];
    isFiltered: boolean;
    onFilter: (item: HyperTreeNode) => boolean;
    activeItemId: string;
    onActiveItemChange: (item: HyperTreeNode) => void;
    onItemUpdate?: (item: HyperTreeNode) => void;
    onItemRemove?: (item: HyperTreeNode) => void;
    style?: React.CSSProperties;
    className?: string;
}

export const HyperTree: React.FC<HyperTreeProps> = ({
    items,
    isFiltered,
    onFilter,
    activeItemId,
    onActiveItemChange,
    onItemUpdate,
    onItemRemove,
    style,
    className,
}) => {
    return (
        <Tree
            items={items}
            isFiltered={isFiltered}
            onFilter={onFilter}
            activeItemId={activeItemId}
            onActiveItemChange={onActiveItemChange}
            onItemUpdate={onItemUpdate}
            onItemRemove={onItemRemove}
            style={style}
            className={className}
        >
            {HyperTreeNodeRenderer}
        </Tree>
    )
}

const HyperTreeNodeRenderer = <Data,>({
    node,
    style,
    tree,
    dragHandle,
    preview,
}: NodeRendererProps<HyperTreeNode>) => {
    const data = node.data.data;
    const nodeType = 
        'bookmark' in data
            ? (data.tab ? 'both' : 'bookmark')
            : 'tab';

    return (
        <div
            style={style}
            ref={dragHandle}
            title={JSON.stringify(
                pick(
                    node,
                    'isClosed',
                    'isDraggable',
                    'isDragging',
                    'isEditable',
                    'isEditing',
                    'isFocused',
                    'isInternal',
                    'isLeaf',
                    'isOnlySelection',
                    'isOpen',
                    'isRoot',
                    'isSelected',
                    'isSelectedEnd',
                    'isSelectedStart',
                    'level',
                ),
                null,
                2,
            )}
        >
            {node.data.children && <ChevronDown /> }
            {(nodeType === 'bookmark' || nodeType === 'both') && <Bookmark/>}
            {(nodeType === 'tab' || nodeType === 'both') && <AppWindow />}
            {preview ? '_' : ' '}
            {node.data.text}
        </div>
    );
};
