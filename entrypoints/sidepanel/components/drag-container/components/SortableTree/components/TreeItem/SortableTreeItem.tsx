import React, { type CSSProperties } from 'react';

import type { UniqueIdentifier } from '@dnd-kit/core';
import { type AnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import classNames from 'clsx';

import { Handle } from '../../../../components';
import styles from './TreeItem.module.css';

import { iOS } from '../../utilities';

interface Props {
    id: UniqueIdentifier;
    depth: number;
    isClone: boolean;
    indentationWidth: number;
}

const animateLayoutChanges: AnimateLayoutChanges = ({
    isSorting,
    wasDragging,
}) => isSorting || wasDragging;

export const SortableTreeItem: React.FC<React.PropsWithChildren<Props>> = ({
    id,
    depth,
    isClone,
    children,
    indentationWidth,
}) => {
    const {
        attributes,
        isDragging,
        isSorting,
        listeners,
        setDraggableNodeRef,
        setDroppableNodeRef,
        transform,
        transition,
    } = useSortable({
        id,
        animateLayoutChanges,
    });
    const style: CSSProperties = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    return (
        <li
            className={classNames(
                styles.Wrapper,
                isClone && styles.clone,
                isDragging && styles.isDragging,
                //styles.indicator,
                iOS && styles.disableSelection,
                isSorting && styles.disableInteraction,
            )}
            ref={setDroppableNodeRef}
            style={
                {
                    '--spacing': `${indentationWidth * depth}px`,
                } as React.CSSProperties
            }
        >
            <div
                className={styles.TreeItem}
                ref={setDraggableNodeRef}
                style={style}
            >
                <Handle {...attributes} {...listeners} />
                {children}
            </div>
        </li>
    );
};
