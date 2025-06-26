import React, { useState, useMemo } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
    KeyboardSensor,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    verticalListSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface GridItem {
    id: string;
    title: string;
    type: 'grid';
}

export interface TreeItem {
    id: string;
    title: string;
    type: 'tree';
    children?: TreeItem[];
    isExpanded?: boolean;
}

interface HyperGridProps {
    initialGridItems?: GridItem[];
    initialTreeItems?: TreeItem[];
}

// Inline components to avoid import issues
const SortableGridItem: React.FC<{ item: GridItem }> = ({ item }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id,
        data: {
            type: 'grid',
            item,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="sortable-grid-item"
        >
            <div className="grid-item-content">
                <span className="grid-item-title">{item.title}</span>
            </div>
        </div>
    );
};

const SortableTreeItem: React.FC<{
    item: TreeItem;
    level?: number;
    onToggleExpand?: (itemId: string) => void;
    isOver?: boolean;
    dropPosition?: 'above' | 'below' | 'inside';
}> = ({ item, level = 0, onToggleExpand, isOver, dropPosition }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id,
        data: {
            type: 'tree',
            item,
            hasChildren: item.children && item.children.length > 0,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = item.isExpanded ?? false;

    const handleToggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onToggleExpand) {
            onToggleExpand(item.id);
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`sortable-tree-item ${isOver ? 'drag-over' : ''} ${dropPosition ? `drop-${dropPosition}` : ''}`}
        >
            {isOver && dropPosition === 'above' && (
                <div className="drop-indicator drop-indicator-above" />
            )}
            <div
                className="tree-item-content"
                style={{ paddingLeft: `${level * 20 + 12}px` }}
            >
                {hasChildren && (
                    <button
                        type="button"
                        className={`expand-button ${isExpanded ? 'expanded' : ''}`}
                        onClick={handleToggleExpand}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {isExpanded ? '▼' : '▶'}
                    </button>
                )}
                {!hasChildren && <div className="tree-indent" />}
                <span className="tree-item-title">{item.title}</span>
                {hasChildren && (
                    <span className="child-count">
                        ({item.children!.length})
                    </span>
                )}
            </div>
            {isOver && dropPosition === 'below' && (
                <div className="drop-indicator drop-indicator-below" />
            )}
            {isOver && dropPosition === 'inside' && (
                <div className="drop-indicator drop-indicator-inside" />
            )}
        </div>
    );
};

const TreeItemList: React.FC<{
    items: TreeItem[];
    level?: number;
    onToggleExpand?: (itemId: string) => void;
    dragOverId?: string;
    dropPosition?: 'above' | 'below' | 'inside';
}> = ({ items, level = 0, onToggleExpand, dragOverId, dropPosition }) => {
    return (
        <div className="tree-item-list">
            {items.map((item) => (
                <div key={item.id} className="tree-item-wrapper">
                    <SortableTreeItem
                        item={item}
                        level={level}
                        onToggleExpand={onToggleExpand}
                        isOver={dragOverId === item.id}
                        dropPosition={
                            dragOverId === item.id ? dropPosition : undefined
                        }
                    />
                    {item.children &&
                        item.children.length > 0 &&
                        item.isExpanded && (
                            <TreeItemList
                                items={item.children}
                                level={level + 1}
                                onToggleExpand={onToggleExpand}
                                dragOverId={dragOverId}
                                dropPosition={dropPosition}
                            />
                        )}
                </div>
            ))}
        </div>
    );
};

const DragOverlayItem: React.FC<{ item: GridItem | TreeItem }> = ({ item }) => {
    const isGridItem = item.type === 'grid';

    return (
        <div
            className={`drag-overlay-item ${isGridItem ? 'grid-overlay' : 'tree-overlay'}`}
        >
            <div className="overlay-content">
                <span className="overlay-title">{item.title}</span>
                <span className="overlay-type">{item.type}</span>
            </div>
        </div>
    );
};

export const HyperGrid: React.FC<HyperGridProps> = ({
    initialGridItems = [],
    initialTreeItems = [],
}) => {
    const [gridItems, setGridItems] = useState<GridItem[]>(initialGridItems);
    const [treeItems, setTreeItems] = useState<TreeItem[]>(initialTreeItems);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [dropPosition, setDropPosition] = useState<
        'above' | 'below' | 'inside'
    >('below');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    // Flatten tree items for sortable context
    const flattenedTreeItems = useMemo(() => {
        const flatten = (items: TreeItem[]): TreeItem[] => {
            return items.reduce((acc, item) => {
                acc.push(item);
                if (
                    item.children &&
                    item.children.length > 0 &&
                    item.isExpanded
                ) {
                    acc.push(...flatten(item.children));
                }
                return acc;
            }, [] as TreeItem[]);
        };
        return flatten(treeItems);
    }, [treeItems]);

    const activeItem = useMemo(() => {
        if (!activeId) return null;

        const gridItem = gridItems.find((item) => item.id === activeId);
        if (gridItem) return gridItem;

        // Search in tree items recursively
        const findTreeItem = (items: TreeItem[]): TreeItem | null => {
            for (const item of items) {
                if (item.id === activeId) return item;
                if (item.children) {
                    const found = findTreeItem(item.children);
                    if (found) return found;
                }
            }
            return null;
        };

        return findTreeItem(treeItems);
    }, [activeId, gridItems, treeItems]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        setDragOverId(null);
        setDropPosition('below');
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;

        if (!over) {
            setDragOverId(null);
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string;

        if (activeId === overId) {
            setDragOverId(null);
            return;
        }

        // Determine drop position based on mouse position
        const overElement = document.querySelector(
            `[data-id="${overId}"]`,
        ) as HTMLElement;
        if (
            overElement &&
            active.data.current?.type === 'tree' &&
            over.data.current?.type === 'tree'
        ) {
            const rect = overElement.getBoundingClientRect();
            const mouseY = (event.activatorEvent as MouseEvent).clientY;
            const elementTop = rect.top;
            const elementBottom = rect.bottom;
            const elementHeight = rect.height;

            // Calculate relative position within the element
            const relativeY = mouseY - elementTop;
            const threshold = elementHeight * 0.3; // 30% threshold for top/bottom zones

            let position: 'above' | 'below' | 'inside' = 'below';

            if (relativeY < threshold) {
                position = 'above';
            } else if (relativeY > elementHeight - threshold) {
                position = 'below';
            } else {
                position = 'inside';
            }

            setDragOverId(overId);
            setDropPosition(position);
        }

        // Handle grid to grid reordering
        if (
            active.data.current?.type === 'grid' &&
            over.data.current?.type === 'grid'
        ) {
            setGridItems((items) => {
                const oldIndex = items.findIndex(
                    (item) => item.id === activeId,
                );
                const newIndex = items.findIndex((item) => item.id === overId);
                return arrayMove(items, oldIndex, newIndex);
            });
        }

        // Handle tree to tree reordering and moving between parents
        if (
            active.data.current?.type === 'tree' &&
            over.data.current?.type === 'tree'
        ) {
            const activeHasChildren = active.data.current.hasChildren;

            // Allow moving items without children (leaf nodes)
            if (!activeHasChildren) {
                // This will be handled in drag end for better tree manipulation
            }
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            setDragOverId(null);
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string;

        if (activeId === overId) {
            setActiveId(null);
            setDragOverId(null);
            return;
        }

        // Handle cross-component drag and drop
        if (active.data.current?.type !== over.data.current?.type) {
            const activeItem = active.data.current;
            const activeHasChildren = activeItem?.hasChildren;

            // Only allow moving items without children from tree to grid
            if (
                activeItem?.type === 'tree' &&
                over.data.current?.type === 'grid' &&
                !activeHasChildren
            ) {
                const itemToMove = activeItem.item as TreeItem;

                // Remove from tree
                const removeFromTree = (items: TreeItem[]): TreeItem[] => {
                    return items.filter((item) => {
                        if (item.id === activeId) return false;
                        if (item.children) {
                            item.children = removeFromTree(item.children);
                        }
                        return true;
                    });
                };

                setTreeItems(removeFromTree);
                setGridItems((items) => [
                    ...items,
                    { ...itemToMove, type: 'grid' },
                ]);
            } else if (
                activeItem?.type === 'grid' &&
                over.data.current?.type === 'tree'
            ) {
                // Move from grid to tree (as a leaf node)
                const itemToMove = activeItem.item as GridItem;
                setGridItems((items) =>
                    items.filter((item) => item.id !== activeId),
                );
                setTreeItems((items) => [
                    ...items,
                    { ...itemToMove, type: 'tree' },
                ]);
            }
        } else if (
            active.data.current?.type === 'tree' &&
            over.data.current?.type === 'tree'
        ) {
            // Handle tree to tree operations
            const activeHasChildren = active.data.current.hasChildren;

            if (!activeHasChildren) {
                // Move leaf item within tree based on drop position
                const itemToMove = active.data.current.item as TreeItem;

                // Remove item from its current location
                const removeFromTree = (items: TreeItem[]): TreeItem[] => {
                    return items.filter((item) => {
                        if (item.id === activeId) return false;
                        if (item.children) {
                            item.children = removeFromTree(item.children);
                        }
                        return true;
                    });
                };

                // Add item to new location based on drop position
                const addToTree = (items: TreeItem[]): TreeItem[] => {
                    return items.map((item) => {
                        if (item.id === overId) {
                            if (dropPosition === 'inside') {
                                // Add as child of the target item
                                return {
                                    ...item,
                                    children: [
                                        ...(item.children || []),
                                        { ...itemToMove, type: 'tree' },
                                    ],
                                    isExpanded: true, // Auto-expand to show the new child
                                };
                            } else if (dropPosition === 'below') {
                                // Add as sibling below the target item
                                return item;
                            }
                        }
                        if (item.children) {
                            return {
                                ...item,
                                children: addToTree(item.children),
                            };
                        }
                        return item;
                    });
                };

                setTreeItems((items) => {
                    const withoutItem = removeFromTree([...items]);
                    const withItem = addToTree(withoutItem);

                    // Handle 'below' position by inserting after the target item
                    if (dropPosition === 'below') {
                        const insertAfter = (
                            items: TreeItem[],
                            targetId: string,
                            itemToInsert: TreeItem,
                        ): TreeItem[] => {
                            const result: TreeItem[] = [];
                            for (const item of items) {
                                result.push(item);
                                if (item.id === targetId) {
                                    result.push(itemToInsert);
                                }
                                if (item.children) {
                                    item.children = insertAfter(
                                        item.children,
                                        targetId,
                                        itemToInsert,
                                    );
                                }
                            }
                            return result;
                        };
                        return insertAfter(withItem, overId, {
                            ...itemToMove,
                            type: 'tree',
                        });
                    }

                    return withItem;
                });
            }
        }

        setActiveId(null);
        setDragOverId(null);
    };

    const handleToggleExpand = (itemId: string) => {
        const toggleInTree = (items: TreeItem[]): TreeItem[] => {
            return items.map((item) => {
                if (item.id === itemId) {
                    return { ...item, isExpanded: !item.isExpanded };
                }
                if (item.children) {
                    return { ...item, children: toggleInTree(item.children) };
                }
                return item;
            });
        };

        setTreeItems(toggleInTree);
    };

    const addGridItem = () => {
        const newItem: GridItem = {
            id: `grid-${Date.now()}`,
            title: `Grid Item ${gridItems.length + 1}`,
            type: 'grid',
        };
        setGridItems((items) => [...items, newItem]);
    };

    const addTreeItem = () => {
        const newItem: TreeItem = {
            id: `tree-${Date.now()}`,
            title: `Tree Item ${treeItems.length + 1}`,
            type: 'tree',
            isExpanded: true,
        };
        setTreeItems((items) => [...items, newItem]);
    };

    const addNestedTreeItem = () => {
        if (treeItems.length === 0) {
            addTreeItem();
            return;
        }

        // Add a child to the first tree item
        const addChildToFirst = (items: TreeItem[]): TreeItem[] => {
            if (items.length === 0) return items;

            const firstItem = items[0];
            const newChild: TreeItem = {
                id: `tree-child-${Date.now()}`,
                title: `Child Item ${(firstItem.children?.length || 0) + 1}`,
                type: 'tree',
            };

            return items.map((item, index) => {
                if (index === 0) {
                    return {
                        ...item,
                        children: [...(item.children || []), newChild],
                        isExpanded: true,
                    };
                }
                return item;
            });
        };

        setTreeItems(addChildToFirst);
    };

    return (
        <div className="hyper-grid-container">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="grid-section">
                    <div className="section-header">
                        <h3>Grid Items</h3>
                        <button
                            type="button"
                            onClick={addGridItem}
                            className="add-button"
                        >
                            Add Grid Item
                        </button>
                    </div>
                    <SortableContext
                        items={gridItems.map((item) => item.id)}
                        strategy={rectSortingStrategy}
                    >
                        <div className="grid-layout">
                            {gridItems.map((item) => (
                                <SortableGridItem key={item.id} item={item} />
                            ))}
                        </div>
                    </SortableContext>
                </div>

                <div className="tree-section">
                    <div className="section-header">
                        <h3>Tree Items</h3>
                        <div className="tree-buttons">
                            <button
                                type="button"
                                onClick={addTreeItem}
                                className="add-button"
                            >
                                Add Tree Item
                            </button>
                            <button
                                type="button"
                                onClick={addNestedTreeItem}
                                className="add-button"
                            >
                                Add Child
                            </button>
                        </div>
                    </div>
                    <SortableContext
                        items={flattenedTreeItems.map((item) => item.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="tree-layout">
                            <TreeItemList
                                items={treeItems}
                                onToggleExpand={handleToggleExpand}
                                dragOverId={dragOverId || undefined}
                                dropPosition={dropPosition}
                            />
                        </div>
                    </SortableContext>
                </div>

                <DragOverlay>
                    {activeItem ? <DragOverlayItem item={activeItem} /> : null}
                </DragOverlay>
            </DndContext>

            <style>{`
        .hyper-grid-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 20px;
          height: 100%;
          overflow: hidden;
        }

        .grid-section,
        .tree-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 8px;
        }

        .section-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .tree-buttons {
          display: flex;
          gap: 8px;
        }

        .add-button {
          padding: 6px 12px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .add-button:hover {
          background: #0056b3;
        }

        .grid-layout {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
          padding: 10px;
          background: #fafafa;
          border-radius: 8px;
          min-height: 200px;
        }

        .tree-layout {
          flex: 1;
          overflow: auto;
          background: #fafafa;
          border-radius: 8px;
          padding: 10px;
        }

        .tree-item-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .tree-item-wrapper {
          display: flex;
          flex-direction: column;
        }

        .sortable-grid-item {
          background: white;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 12px;
          cursor: grab;
          user-select: none;
          transition: box-shadow 0.2s ease;
        }

        .sortable-grid-item:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .sortable-grid-item:active {
          cursor: grabbing;
        }

        .grid-item-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .grid-item-title {
          font-weight: 500;
          font-size: 14px;
        }

        .sortable-tree-item {
          background: white;
          border: 1px solid #eee;
          border-radius: 4px;
          margin: 2px 0;
          cursor: grab;
          user-select: none;
          transition: all 0.2s ease;
          position: relative;
        }

        .sortable-tree-item:hover {
          background-color: #f8f9fa;
        }

        .sortable-tree-item:active {
          cursor: grabbing;
        }

        .sortable-tree-item.drag-over {
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .sortable-tree-item.drop-inside {
          background-color: #e3f2fd;
        }

        .tree-item-content {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
        }

        .expand-button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 10px;
          color: #666;
          padding: 2px;
          border-radius: 2px;
          transition: background-color 0.2s ease;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .expand-button:hover {
          background-color: #e9ecef;
        }

        .expand-button.expanded {
          color: #007bff;
        }

        .tree-indent {
          width: 16px;
        }

        .tree-item-title {
          font-size: 14px;
          flex: 1;
        }

        .child-count {
          font-size: 12px;
          color: #666;
          background: #e9ecef;
          padding: 2px 6px;
          border-radius: 10px;
        }

        .drop-indicator {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: #007bff;
          z-index: 10;
        }

        .drop-indicator-above {
          top: -1px;
        }

        .drop-indicator-below {
          bottom: -1px;
        }

        .drop-indicator-inside {
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          height: auto;
          background: rgba(0, 123, 255, 0.1);
          border: 2px dashed #007bff;
          border-radius: 4px;
        }

        .drag-overlay-item {
          background: white;
          border: 2px solid #007bff;
          border-radius: 6px;
          padding: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: rotate(5deg);
        }

        .overlay-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .overlay-title {
          font-weight: 600;
          font-size: 14px;
        }

        .overlay-type {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
        }
      `}</style>
        </div>
    );
};
