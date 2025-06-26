import React, { useRef, useState } from 'react';
import { CancelDrop, UniqueIdentifier } from '@dnd-kit/core';
import { HyperTreeNode } from '../../hooks/types';
import { DragContainer, TRASH_ID } from '../drag-container';
import { ConfirmModal } from '../drag-container/components';
import { SortableTree } from '../drag-container/components/SortableTree';

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
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const resolveRef = useRef<(value: boolean) => void>(null);

    const cancelDrop: CancelDrop = async ({ active, over }) => {
        if (over?.id !== TRASH_ID) {
            return false;
        }

        setActiveId(active.id);

        const confirmed = await new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
        });

        setActiveId(null);

        return confirmed === false;
    };

    return (
        <>
            <DragContainer cancelDrop={cancelDrop} trashable />
            {activeId && (
                <ConfirmModal
                    onConfirm={() => resolveRef.current?.(true)}
                    onDeny={() => resolveRef.current?.(false)}
                >
                    Are you sure you want to delete "{activeId}"?
                </ConfirmModal>
            )}
        </>
    );
};
