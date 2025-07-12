import React, {
    useCallback,
    useEffect,
    useLayoutEffect,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
    CancelDrop,
    DndContext,
    DragOverlay,
    DropAnimation,
    MouseSensor,
    TouchSensor,
    useDroppable,
    useSensors,
    useSensor,
    MeasuringStrategy,
    defaultDropAnimationSideEffects,
    closestCorners,
    DragStartEvent,
    DragMoveEvent,
    UniqueIdentifier,
    DragOverEvent,
    DragEndEvent,
    DragCancelEvent,
    Modifier,
} from '@dnd-kit/core';
import {
    AnimateLayoutChanges,
    SortableContext,
    useSortable,
    defaultAnimateLayoutChanges,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Item, Container, ContainerProps, Remove } from './components';

import { SortableTreeItem } from './components/SortableTree/components';
import { useAssignedRef } from '../../hooks/use-assigned-ref';
import { getProjection } from './get-projection';
import { FlattenedHierarchialNode, HierarchialNode } from './types';
import { ExpandCollapseButton } from './components/SortableTree/components/TreeItem/ExpandCollapseButton';
import { TreeItemText } from './components/SortableTree/components/TreeItem/TreeItemText';

import treeItemStyles from './components/SortableTree/components/TreeItem/TreeItem.module.css';

const INDENT_WIDTH = 50;

const adjustTranslate: Modifier = ({ transform }) => {
    return {
        ...transform,
        y: transform.y - 25,
    };
};

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
    defaultAnimateLayoutChanges({ ...args, wasDragging: true });

function DroppableContainer<Value>({
    children,
    columns = 1,
    disabled,
    id,
    items,
    style,
    ...props
}: ContainerProps & {
    disabled?: boolean;
    id: UniqueIdentifier;
    items: Record<UniqueIdentifier, Value>;
    style?: React.CSSProperties;
}) {
    const {
        active,
        attributes,
        isDragging,
        listeners,
        over,
        setNodeRef,
        transition,
        transform,
    } = useSortable({
        id,
        data: {
            type: 'container',
            children: Object.keys(items),
        },
        animateLayoutChanges,
    });
    const isOverContainer = over
        ? (id === over.id && active?.data.current?.type !== 'container') ||
          over.id in items
        : false;

    return (
        <Container
            ref={disabled ? undefined : setNodeRef}
            style={{
                ...style,
                transition,
                transform: CSS.Translate.toString(transform),
                opacity: isDragging ? 0.5 : undefined,
            }}
            hover={isOverContainer}
            handleProps={{
                ...attributes,
                ...listeners,
            }}
            columns={columns}
            {...props}
        >
            {children}
        </Container>
    );
}

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
};

const getDescendentCount = <Value,>(
    nodes: Record<UniqueIdentifier, HierarchialNode<Value>>,
): number => {
    let result = Object.keys(nodes).length;
    Object.values(nodes).forEach((node) => {
        if (node.children) {
            result += getDescendentCount(node.children);
        }
    });
    return result;
};

const flattenHierarchialNodes = <Value,>(
    nodes: Record<UniqueIdentifier, HierarchialNode<Value>>,
    draggingId: UniqueIdentifier | undefined,
    depth = 0,
): FlattenedHierarchialNode<Value>[] =>
    Object.entries(nodes).flatMap(([id, node]) => {
        const { isExpanded, children, value } = node;
        const result: FlattenedHierarchialNode<Value>[] = [
            {
                ...node,
                id,
                depth,
                value,
                allowsChildren: !!children,
                isExpanded,
            },
        ];

        if (isExpanded && children && draggingId !== id) {
            result.push(
                ...flattenHierarchialNodes<Value>(
                    children,
                    draggingId,
                    depth + 1,
                ),
            );
        }

        return result;
    });

const updateTreeNodes = <Value,>(
    nodes: Record<UniqueIdentifier, HierarchialNode<Value>>,
    destinationRef: {
        type: 'before' | 'child' | 'after';
        id: UniqueIdentifier;
    },
    moveId: UniqueIdentifier,
    moveValue: HierarchialNode<Value>,
): Record<UniqueIdentifier, HierarchialNode<Value>> =>
    destinationRef.id === moveId
        ? nodes
        : Object.entries(nodes)
              .filter(([id]) => id !== moveId)
              .reduce(
                  (acc, [id, node]) => {
                      if (id !== moveId) {
                          if (
                              destinationRef.type === 'before' &&
                              id === destinationRef.id
                          ) {
                              acc[moveId] = moveValue;
                          }
                          acc[id] = {
                              ...node,
                              children:
                                  destinationRef.type === 'child' &&
                                  id === destinationRef.id
                                      ? {
                                            [moveId]: moveValue,
                                            ...(node.children ?? {}),
                                        }
                                      : node.children &&
                                        updateTreeNodes(
                                            node.children,
                                            destinationRef,
                                            moveId,
                                            moveValue,
                                        ),
                          };
                          if (
                              destinationRef.type === 'after' &&
                              id === destinationRef.id
                          ) {
                              acc[moveId] = moveValue;
                          }
                      }
                      return acc;
                  },
                  {} as Record<UniqueIdentifier, HierarchialNode<Value>>,
              );
const removeTreeNode = <Value,>(
    nodes: Record<UniqueIdentifier, HierarchialNode<Value>>,
    id: UniqueIdentifier,
): Record<UniqueIdentifier, HierarchialNode<Value>> =>
    updateTreeNodes(
        nodes,
        { type: 'after', id: Infinity },
        id,
        undefined as any,
    );

const updateListNodes = <Value,>(
    dragOverNodes: Record<UniqueIdentifier, Value>,
    dragOverId: UniqueIdentifier,
    draggedId: UniqueIdentifier,
    draggedValue: Value,
    isBefore: boolean,
): Record<UniqueIdentifier, Value> =>
    dragOverId === draggedId
        ? dragOverNodes
        : Object.entries(dragOverNodes).reduce(
              (acc, [id, value]) => {
                  if (id !== draggedId) {
                      if (isBefore && id === dragOverId) {
                          acc[draggedId] = draggedValue;
                      }
                      acc[id] = value;
                      if (!isBefore && id === dragOverId) {
                          acc[draggedId] = draggedValue;
                      }
                  }
                  return acc;
              },
              {} as Record<UniqueIdentifier, Value>,
          );
const removeListNode = <Value,>(
    nodes: Record<UniqueIdentifier, Value>,
    id: UniqueIdentifier,
): Record<UniqueIdentifier, Value> =>
    updateListNodes(nodes, Infinity, id, undefined as any, false);

const findInTreeNodes = <Value,>(
    nodes: Record<UniqueIdentifier, HierarchialNode<Value>>,
    id: UniqueIdentifier,
    indexRef: { current: number },
):
    | {
          itemId: UniqueIdentifier;
          path: UniqueIdentifier[];
          item: HierarchialNode<Value>;
      }
    | undefined => {
    if (id in nodes) {
        indexRef.current +=
            (Object.keys(nodes) as UniqueIdentifier[]).indexOf(id) + 1;
        return {
            itemId: id,
            path: [id],
            item: nodes[id],
        };
    }
    for (const [childId, node] of Object.entries(nodes)) {
        indexRef.current++;
        const childResult =
            node.children && findInTreeNodes(node.children, id, indexRef);
        if (childResult) {
            childResult.path.unshift(childId);
            return childResult;
        }
    }
    return undefined;
};

const itemTypeToContainerTypeMap = {
    'grid-item': 'grid',
    'list-item': 'list',
    'tree-item': 'tree',
} as const;

interface SourceRef<ContainerType, Data> {
    containerId: UniqueIdentifier;
    containerType: ContainerType;
    data: Data;
}

type HyperTreeMoveEntry<Value> =
    | SourceRef<'grid' | 'list', Record<UniqueIdentifier, Value>>
    | SourceRef<'tree', Record<UniqueIdentifier, HierarchialNode<Value>>>;

export type HyperTreeMoveItemHandler<Value> = (args: {
    from: HyperTreeMoveEntry<Value>;
    to: HyperTreeMoveEntry<Value>;
}) => void;

export interface HyperTreeProps<Value> {
    gridItems: Record<UniqueIdentifier, Value>;
    trees: Record<
        UniqueIdentifier,
        Record<UniqueIdentifier, HierarchialNode<Value>>
    >;
    restrictToTreeId: UniqueIdentifier | undefined;
    listItems: Record<UniqueIdentifier, Value>;
    focussedItemId: UniqueIdentifier | undefined;
    onMoveItem: HyperTreeMoveItemHandler<Value>;
    onTreeItemExpandChange: (
        treeId: UniqueIdentifier,
        itemId: UniqueIdentifier,
        isExpanded: boolean,
    ) => void;
    onAddTreeContainer: () => void;
    onRemove: (id: UniqueIdentifier) => void;
}

export const TRASH_ID = 'void';
const GRID_CONTAINER_ID = 'grid-container';
const LIST_CONTAINER_ID = 'list-container';
const TREES_PLACEHOLDER_ID = 'tree-placeholder';
const empty: Record<UniqueIdentifier, unknown> = {};

type FlattenedItems<Value> = Record<
    typeof GRID_CONTAINER_ID | typeof LIST_CONTAINER_ID | UniqueIdentifier,
    FlattenedHierarchialNode<Value>[]
>;

type FindContainerAndItemResult<Value> = {
    containerId: UniqueIdentifier;
    itemId: UniqueIdentifier;
    flattenedIndex: number;
} & (
    | {
          type: 'grid-item' | 'list-item';
          value: Value;
      }
    | {
          type: 'tree-item';
          path: UniqueIdentifier[];
          item: HierarchialNode<Value>;
      }
);

export function HyperTree<Value>({
    gridItems,
    trees,
    restrictToTreeId,
    listItems,
    focussedItemId,
    onMoveItem,
    onTreeItemExpandChange,
    onAddTreeContainer,
    onRemove,
}: HyperTreeProps<Value>) {
    const findContainerAndItem = useCallback(
        (
            id: UniqueIdentifier,
        ):
            | {
                  type: 'container';
                  containerId: UniqueIdentifier;
                  containerType: 'grid' | 'list' | 'tree';
              }
            | FindContainerAndItemResult<Value> => {
            if (
                id === GRID_CONTAINER_ID ||
                id === LIST_CONTAINER_ID ||
                id in trees
            ) {
                return {
                    type: 'container',
                    containerId: id,
                    containerType:
                        id === GRID_CONTAINER_ID
                            ? 'grid'
                            : id === LIST_CONTAINER_ID
                              ? 'list'
                              : 'tree',
                };
            }

            const indexRef = { current: -1 };
            for (const [containerId, items] of [
                [GRID_CONTAINER_ID, gridItems] as const,
                [LIST_CONTAINER_ID, listItems] as const,
            ]) {
                indexRef.current++;
                if (id in items) {
                    return {
                        type:
                            id === GRID_CONTAINER_ID
                                ? 'grid-item'
                                : 'list-item',
                        containerId,
                        itemId: id,
                        value: items[id],
                        flattenedIndex: indexRef.current,
                    };
                }
            }

            for (const [treeContainerId, nodes] of Object.entries(trees)) {
                const treeResult = findInTreeNodes(nodes, id, indexRef);
                if (treeResult) {
                    return {
                        type: 'tree-item',
                        containerId: treeContainerId,
                        flattenedIndex: indexRef.current,
                        ...treeResult,
                    };
                }
            }

            throw new Error(
                `Item with id ${id} not found for or in any container`,
            );
        },
        [gridItems, listItems, trees],
    );

    const [draggingId, setDraggingId] = useState<UniqueIdentifier>();
    const [dragOverId, setDragOverId] = useState<UniqueIdentifier>();
    const draggingContainerAndItem = useMemo(() => {
        if (draggingId === undefined) {
            return undefined;
        }
        const result = findContainerAndItem(draggingId);
        return result;
    }, [draggingId, findContainerAndItem]);
    const dragOverContainerAndItem = useMemo(() => {
        if (dragOverId === undefined) {
            return undefined;
        }
        const result = findContainerAndItem(dragOverId);
        return result;
    }, [dragOverId, findContainerAndItem]);
    const draggingDescendentCount = useMemo(
        () =>
            draggingContainerAndItem?.type === 'tree-item' &&
            draggingContainerAndItem.item.children
                ? getDescendentCount(draggingContainerAndItem.item.children)
                : 0,
        [draggingContainerAndItem, draggingContainerAndItem?.type],
    );

    const flattenedItems = useMemo<FlattenedItems<Value>>(
        () => ({
            [GRID_CONTAINER_ID]: Object.entries(gridItems).map<
                FlattenedHierarchialNode<Value>
            >(([id, value]) => ({
                id,
                depth: 0,
                value,
                allowsChildren: false,
                isExpanded: false,
            })),
            ...Object.fromEntries(
                Object.entries(trees).map(
                    ([treeContainerId, nodes]) =>
                        [
                            treeContainerId,
                            flattenHierarchialNodes(
                                nodes,
                                draggingId,
                            ) satisfies FlattenedHierarchialNode<Value>[],
                        ] as const,
                ),
            ),
            [LIST_CONTAINER_ID]: Object.entries(listItems).map<
                FlattenedHierarchialNode<Value>
            >(([id, value]) => ({
                id,
                depth: 0,
                value,
                allowsChildren: false,
                isExpanded: false,
            })),
        }),
        [gridItems, trees, listItems, draggingId],
    );

    const [treeDragOverOffsetLeft, setDraggingOffsetLeft] = useState(0);
    const dropTargetDepth =
        dragOverContainerAndItem?.type === 'tree-item'
            ? dragOverContainerAndItem.path.length - 1
            : 0;
    const dragDepth = Math.max(
        dropTargetDepth,
        Math.min(
            dragOverContainerAndItem?.type === 'tree-item'
                ? dragOverContainerAndItem.item.children === undefined
                    ? dropTargetDepth // max depth restricted to being a sibling of the drop target
                    : dropTargetDepth + 1 // max depth restricted to being a child of the drop target
                : 0,
            Math.round(treeDragOverOffsetLeft / INDENT_WIDTH), // depth based on offset
        ),
    );

    const sensors = useSensors(
        useSensor(MouseSensor),
        useSensor(TouchSensor),
        // useSensor(KeyboardSensor, {
        //     coordinateGetter,
        // }),
    );

    const handleDragStart = useCallback(
        ({ active: { id: activeId } }: DragStartEvent) => {
            console.log('drag start', activeId);
            setDraggingId(activeId);
            setDragOverId(activeId);
        },
        [],
    );

    const handleDragMove = useCallback(
        ({ delta }: DragMoveEvent) => {
            console.log('drag move', delta);
            if (dragOverContainerAndItem?.type === 'tree-item') {
                setDraggingOffsetLeft(delta.x);
            } else {
                setDraggingOffsetLeft(0);
            }
        },
        [dragOverContainerAndItem],
    );

    const handleDragOver = useCallback(({ over }: DragOverEvent) => {
        console.log('drag over', over?.id);
        const overId = over?.id;
        setDragOverId(overId);
    }, []);

    const handleDragCancel = useCallback((event: DragCancelEvent) => {
        console.log('drag cancel');
        setDraggingId(undefined);
        setDragOverId(undefined);
    }, []);

    const withData = useCallback(
        <
            R extends FindContainerAndItemResult<Value>,
            Data extends R['type'] extends 'tree-item'
                ? Record<UniqueIdentifier, HierarchialNode<Value>>
                : Record<UniqueIdentifier, Value>,
        >(
            r: R,
            d: Data,
        ): HyperTreeMoveEntry<Value> =>
            ({
                containerId: r.containerId,
                containerType: itemTypeToContainerTypeMap[r.type],
                data: d,
            }) as any,
        [],
    );

    const handleDragEnd = useCallback(
        ({ active, over }: DragEndEvent) => {
            if (over) {
                if (draggingContainerAndItem === undefined) {
                    console.warn(
                        'Dragging container and item not found for active id:',
                        draggingContainerAndItem,
                    );
                    return;
                }
                if (dragOverContainerAndItem === undefined) {
                    console.warn(
                        'Drag over container and item not found for over id:',
                        dragOverContainerAndItem,
                    );
                    return;
                }

                if (
                    draggingContainerAndItem.type === 'container' ||
                    dragOverContainerAndItem.type === 'container'
                ) {
                    console.warn('Container drag over not implemented');
                    return;
                }

                const isSameContainer =
                    draggingContainerAndItem.type ===
                        dragOverContainerAndItem.type &&
                    draggingContainerAndItem.containerId ===
                        dragOverContainerAndItem.containerId;

                const isBefore =
                    dragOverContainerAndItem.flattenedIndex <
                    draggingContainerAndItem.flattenedIndex;

                console.log({
                    isBefore,
                    dragDepth,
                    dragOverContainerAndItem,
                    draggingContainerAndItem,
                });

                const to =
                    dragOverContainerAndItem.type === 'tree-item'
                        ? withData(
                              dragOverContainerAndItem,
                              updateTreeNodes<Value>(
                                  trees[dragOverContainerAndItem.containerId],
                                  dragDepth >
                                      dragOverContainerAndItem.path.length - 1
                                      ? {
                                            type: 'child',
                                            id: dragOverContainerAndItem.itemId,
                                        }
                                      : {
                                            type: isBefore ? 'before' : 'after',
                                            id: dragOverContainerAndItem.itemId,
                                        },
                                  draggingContainerAndItem.itemId,
                                  draggingContainerAndItem.type === 'tree-item'
                                      ? draggingContainerAndItem.item
                                      : {
                                            children: undefined,
                                            isExpanded: false,
                                            value: draggingContainerAndItem.value,
                                        },
                              ),
                          )
                        : withData(
                              dragOverContainerAndItem,
                              updateListNodes<Value>(
                                  dragOverContainerAndItem.type === 'grid-item'
                                      ? gridItems
                                      : listItems,
                                  dragOverContainerAndItem.itemId,
                                  draggingContainerAndItem.itemId,
                                  draggingContainerAndItem.type === 'tree-item'
                                      ? draggingContainerAndItem.item.value
                                      : draggingContainerAndItem.value,
                                  isBefore,
                              ),
                          );
                const from = isSameContainer
                    ? to
                    : draggingContainerAndItem.type === 'tree-item'
                      ? withData(
                            draggingContainerAndItem,
                            removeTreeNode<Value>(
                                trees[draggingContainerAndItem.containerId],
                                draggingContainerAndItem.itemId,
                            ),
                        )
                      : withData(
                            draggingContainerAndItem,
                            removeListNode<Value>(
                                draggingContainerAndItem.type === 'grid-item'
                                    ? gridItems
                                    : listItems,
                                draggingContainerAndItem.itemId,
                            ),
                        );
                onMoveItem({
                    from,
                    to,
                });
            }

            setDraggingId(undefined);
            setDragOverId(undefined);
        },
        [
            draggingContainerAndItem,
            dragOverContainerAndItem,
            dragDepth,
            onMoveItem,
            gridItems,
            listItems,
            trees,
            withData,
        ],
    );

    const isDraggingContainer = draggingContainerAndItem?.type === 'container';

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            measuring={{
                droppable: {
                    strategy: MeasuringStrategy.Always,
                },
            }}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div>Dragging: {JSON.stringify(draggingContainerAndItem)}</div>
            <div>Over: {JSON.stringify(dragOverContainerAndItem)}</div>
            <div>Projected: {JSON.stringify(dragDepth)}</div>

            <DroppableContainer
                key={GRID_CONTAINER_ID}
                id={GRID_CONTAINER_ID}
                columns={6}
                items={gridItems}
                scrollable
            >
                <SortableContext
                    items={Object.keys(gridItems)}
                    strategy={horizontalListSortingStrategy}
                >
                    {Object.entries(gridItems).map(([id, value], index) => {
                        return (
                            <SortableGridItem
                                disabled={isDraggingContainer}
                                key={id}
                                id={id}
                                index={index}
                                handle
                            />
                        );
                    })}
                </SortableContext>
            </DroppableContainer>
            <SortableContext
                items={[
                    ...(restrictToTreeId !== undefined
                        ? [restrictToTreeId]
                        : Object.keys(trees)),
                    TREES_PLACEHOLDER_ID,
                ]}
                strategy={horizontalListSortingStrategy}
            >
                {(restrictToTreeId !== undefined
                    ? [restrictToTreeId]
                    : Object.keys(trees)
                ).map((treeId) => {
                    const flattenedTreeItems = flattenedItems[treeId] ?? [];
                    // todo: memoize:
                    const sortedIds = flattenedTreeItems.map((item) => item.id);
                    return (
                        <SortableContext
                            key={treeId}
                            items={sortedIds}
                            strategy={verticalListSortingStrategy}
                        >
                            {flattenedTreeItems.map(
                                ({
                                    id,
                                    depth,
                                    value,
                                    allowsChildren,
                                    isExpanded,
                                }) => (
                                    <>
                                        <SortableTreeItem
                                            key={id}
                                            id={id}
                                            depth={
                                                id === draggingId
                                                    ? dragDepth
                                                    : depth
                                            }
                                            isClone={false}
                                            indentationWidth={INDENT_WIDTH}
                                        >
                                            {allowsChildren && (
                                                <ExpandCollapseButton
                                                    isExpanded={isExpanded}
                                                    onToggle={() =>
                                                        onTreeItemExpandChange(
                                                            treeId,
                                                            id,
                                                            !isExpanded,
                                                        )
                                                    }
                                                />
                                            )}
                                            <TreeItemText>
                                                {String(value)}
                                            </TreeItemText>
                                            <Remove
                                                onClick={() => onRemove(id)}
                                            />
                                        </SortableTreeItem>
                                    </>
                                ),
                            )}
                        </SortableContext>
                    );
                })}
                {restrictToTreeId !== undefined ? undefined : (
                    <DroppableContainer
                        id={TREES_PLACEHOLDER_ID}
                        disabled={isDraggingContainer}
                        items={empty}
                        onClick={onAddTreeContainer}
                        placeholder
                    >
                        + Add space
                    </DroppableContainer>
                )}
            </SortableContext>
            <DroppableContainer
                key={LIST_CONTAINER_ID}
                id={LIST_CONTAINER_ID}
                columns={1}
                items={listItems}
                scrollable
            >
                <SortableContext
                    items={Object.keys(listItems)}
                    strategy={verticalListSortingStrategy}
                >
                    {Object.entries(gridItems).map(([id, value], index) => {
                        return (
                            <SortableGridItem
                                disabled={isDraggingContainer}
                                key={id}
                                id={id}
                                index={index}
                                handle
                            />
                        );
                    })}
                </SortableContext>
            </DroppableContainer>
            {createPortal(
                <DragOverlay
                    dropAnimation={dropAnimation}
                    modifiers={
                        dragOverContainerAndItem?.type === 'tree-item'
                            ? [adjustTranslate]
                            : undefined
                    }
                >
                    {draggingId ? (
                        isDraggingContainer ? (
                            // <SortableTreeItem
                            //     id={draggingId}
                            //     depth={activeItem.depth}
                            //     clone
                            //     childCount={getChildCount(items, activeId) + 1}
                            //     value={draggingId.toString()}
                            //     indentationWidth={indentationWidth}
                            // />
                            <>Container: {draggingId}</>
                        ) : draggingContainerAndItem?.type === 'tree-item' ? (
                            <SortableTreeItem
                                id={draggingId}
                                depth={dragDepth}
                                isClone={true}
                                indentationWidth={INDENT_WIDTH}
                            >
                                {draggingContainerAndItem.item.children && (
                                    <ExpandCollapseButton
                                        isExpanded={false}
                                        onToggle={() => {}}
                                    />
                                )}
                                <TreeItemText>
                                    {String(
                                        draggingContainerAndItem.item.value,
                                    )}
                                </TreeItemText>
                                {draggingDescendentCount > 0 && (
                                    <span className={treeItemStyles.Count}>
                                        {draggingDescendentCount + 1}
                                    </span>
                                )}
                            </SortableTreeItem>
                        ) : (
                            <Item value={draggingId} handle dragOverlay />
                        )
                    ) : null}
                </DragOverlay>,
                document.body,
            )}
            {draggingId && <Trash id={TRASH_ID} />}
        </DndContext>
    );

    // function renderGridContainerDragOverlay(containerId: UniqueIdentifier) {
    //     return (
    //         <Container
    //             columns={columns}
    //             style={{
    //                 height: '100%',
    //             }}
    //             shadow
    //             unstyled={false}
    //         >
    //             {items.grid.map((item, index) => (
    //                 <Item key={item} value={item} handle />
    //             ))}
    //         </Container>
    //     );
    // }

    // function handleRemove(containerID: UniqueIdentifier) {
    //     setTreeContainers((containers) =>
    //         containers.filter((id) => id !== containerID),
    //     );
    // }

    // function handleAddTreeContainer() {
    //     const newContainerId = getNextTreeContainerId();

    //     unstable_batchedUpdates(() => {
    //         setTreeContainers((containers) => [...containers, newContainerId]);
    //         setItems((items) => ({
    //             ...items,
    //             trees: {
    //                 ...items.trees,
    //                 [newContainerId]: [],
    //             },
    //         }));
    //     });
    // }

    // function getNextTreeContainerId() {
    //     const containerIds = Object.keys(items.trees);
    //     const lastContainerId = containerIds[containerIds.length - 1];

    //     return String.fromCharCode(lastContainerId.charCodeAt(0) + 1);
    // }
}

function Trash({ id }: { id: UniqueIdentifier }) {
    const { setNodeRef, isOver } = useDroppable({
        id,
    });

    return (
        <div
            ref={setNodeRef}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'fixed',
                left: '50%',
                marginLeft: -150,
                bottom: 20,
                width: 300,
                height: 60,
                borderRadius: 5,
                border: '1px solid',
                borderColor: isOver ? 'red' : '#DDD',
            }}
        >
            Drop here to delete
        </div>
    );
}

interface SortableItemProps {
    id: UniqueIdentifier;
    index: number;
    handle: boolean;
    disabled?: boolean;
}

function SortableGridItem({ disabled, id, index, handle }: SortableItemProps) {
    const {
        setNodeRef,
        setActivatorNodeRef,
        listeners,
        isDragging,
        isSorting,
        transform,
        transition,
    } = useSortable({
        id,
    });
    const mounted = useMountStatus();
    const mountedWhileDragging = isDragging && !mounted;

    return (
        <Item
            ref={disabled ? undefined : setNodeRef}
            value={id}
            dragging={isDragging}
            sorting={isSorting}
            handle={handle}
            handleProps={handle ? { ref: setActivatorNodeRef } : undefined}
            index={index}
            transition={transition}
            transform={transform}
            fadeIn={mountedWhileDragging}
            listeners={listeners}
        />
    );
}

function useMountStatus() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => setIsMounted(true), 500);

        return () => clearTimeout(timeout);
    }, []);

    return isMounted;
}
