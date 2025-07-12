import type { MutableRefObject } from 'react';
import type { UniqueIdentifier } from '@dnd-kit/core';

export interface TreeItem {
    id: UniqueIdentifier;
    children: TreeItem[];
    collapsed?: boolean;
}

export type TreeItems = TreeItem[];

export interface FlattenedItem extends TreeItem {
    parentId: UniqueIdentifier | null;
    depth: number;
    index: number;
}

export type TreeSensorContext = MutableRefObject<{
    items: FlattenedItem[];
    offset: number;
}>;
