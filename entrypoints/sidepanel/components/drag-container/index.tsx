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
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useDroppable,
    UniqueIdentifier,
    useSensors,
    useSensor,
    MeasuringStrategy,
    defaultDropAnimationSideEffects,
    closestCorners,
    DragStartEvent,
    DragMoveEvent,
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

import { Item, Container, ContainerProps } from './components';

import { NodeRendererProps } from 'react-arborist';
import { SortableTreeItem } from './components/SortableTree/components';

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

interface HierarchialNode<Value> {
    isExpanded: boolean;
    value: Value;
    children: Record<UniqueIdentifier, HierarchialNode<Value>> | undefined;
}
interface FlattenedHierarchialNode<Value>
    extends Omit<HierarchialNode<Value>, 'children'> {
    id: UniqueIdentifier;
    depth: number;
    allowsChildren: boolean;
    hiddenChildren:
        | Record<UniqueIdentifier, HierarchialNode<Value>>
        | undefined;
}

const flattenHierarchialNodes = <Value,>(
    nodes: Record<UniqueIdentifier, HierarchialNode<Value>>,
    depth = 0,
): FlattenedHierarchialNode<Value>[] =>
    Object.entries(nodes).flatMap(([id, { isExpanded, value, children }]) => {
        const result: FlattenedHierarchialNode<Value>[] = [
            {
                id,
                depth,
                value,
                isExpanded,
                allowsChildren: !!children,
                hiddenChildren: isExpanded ? undefined : children,
            },
        ];

        if (isExpanded && children) {
            result.push(...flattenHierarchialNodes<Value>(children, depth + 1));
        }

        return result;
    });

const nestFlattenedNodes = <Value,>(
    flattenedNodes: FlattenedHierarchialNode<Value>[],
    minDepth = 0,
): Record<UniqueIdentifier, HierarchialNode<Value>> => {
    const nodes: Record<UniqueIdentifier, HierarchialNode<Value>> = {};
    for (let i = 0; i < flattenedNodes.length; i++) {
        const { id, depth, value, hiddenChildren } = flattenedNodes[i];
        if (depth < minDepth) {
            return nodes;
        }

        const candidateNestedNodesNextIndex = hiddenChildren
            ? -1
            : flattenedNodes.findIndex(
                  (candidate, n) => n > i && candidate.depth <= minDepth,
              );

        nodes[id] = {
            isExpanded: hiddenChildren === undefined,
            value,
            children:
                hiddenChildren ??
                (candidateNestedNodesNextIndex > i
                    ? nestFlattenedNodes(
                          flattenedNodes.slice(
                              i + 1,
                              candidateNestedNodesNextIndex,
                          ),
                          depth + 1,
                      )
                    : {}),
        };
        i = candidateNestedNodesNextIndex - 1;
    }
    return nodes;
};

const simplifyFlattenedNodes = <Value,>(
    flattenedNodes: FlattenedHierarchialNode<Value>[],
): Record<UniqueIdentifier, Value> =>
    flattenedNodes.reduce(
        (acc, { id, depth, hiddenChildren, value }) => {
            if (depth > 0 || hiddenChildren !== undefined) {
                throw new Error(
                    'Cannot simplify flattened nodes with depth > 0 or hidden children',
                );
            }
            acc[id] = value;
            return acc;
        },
        {} as Record<UniqueIdentifier, Value>,
    );

type ItemRenderer<Value> = React.ComponentType<
    NodeRendererProps<{ id: UniqueIdentifier; value: Value }>
>;

function hasChildId(
    id: UniqueIdentifier,
    children: Record<UniqueIdentifier, HierarchialNode<any>>,
): boolean {
    return (
        id in children ||
        Object.values(children).some(
            (child) => child.children && hasChildId(id, child.children),
        )
    );
}

interface ContainerRef {
    containerId: UniqueIdentifier;
    containerType: 'grid' | 'tree' | 'list';
}

interface Props<Value> {
    cancelDrop?: CancelDrop;
    containerStyle?: React.CSSProperties;
    gridItems: Record<UniqueIdentifier, Value>;
    trees: Record<
        UniqueIdentifier,
        Record<UniqueIdentifier, HierarchialNode<Value>>
    >;
    focusTreeId: UniqueIdentifier | undefined;
    listItems: Record<UniqueIdentifier, Value>;
    onMoveItem: (args: {
        from: {
            container: ContainerRef;
            data:
                | Record<UniqueIdentifier, Value>
                | Record<UniqueIdentifier, HierarchialNode<Value>>;
        };
        to: {
            container: ContainerRef;
            data:
                | Record<UniqueIdentifier, Value>
                | Record<UniqueIdentifier, HierarchialNode<Value>>;
        };
    }) => void;
    onExpandChange: (treeId: UniqueIdentifier, isExpanded: boolean) => void;
    onAddTreeContainer: () => void;
    onRemove: (id: UniqueIdentifier) => void;
}

export const TRASH_ID = 'void';
const GRID_CONTAINER_ID = 'grid-container';
const LIST_CONTAINER_ID = 'list-container';
const TREES_PLACEHOLDER_ID = 'tree-placeholder';
const empty: Record<UniqueIdentifier, unknown> = {};
const indentationWidth = 50;

type FlattenedItems<Value> = Record<
    typeof GRID_CONTAINER_ID | typeof LIST_CONTAINER_ID | UniqueIdentifier,
    FlattenedHierarchialNode<Value>[]
>;

export function DragContainer<Value>({
    cancelDrop,
    gridItems,
    trees,
    listItems,
    onMoveItem,
    focusTreeId,
    onExpandChange,
    onAddTreeContainer,
    onRemove,
}: Props<Value>) {
    const findContainer = useCallback(
        (
            id: UniqueIdentifier,
        ):
            | {
                  containerId: UniqueIdentifier;
                  containerType: 'grid' | 'tree' | 'list';
              }
            | undefined => {
            if (id === GRID_CONTAINER_ID) {
                return {
                    containerId: GRID_CONTAINER_ID,
                    containerType: 'grid',
                };
            } else if (id === LIST_CONTAINER_ID) {
                return {
                    containerId: LIST_CONTAINER_ID,
                    containerType: 'list',
                };
            }

            const treeEntry = Object.entries(trees).find(
                ([, nodes]) =>
                    id in nodes ||
                    Object.values(nodes).some(
                        (node) =>
                            node.children && hasChildId(id, node.children),
                    ),
            );
            if (treeEntry) {
                return {
                    containerId: treeEntry[0],
                    containerType: 'tree',
                };
            }

            return undefined;
        },
        [trees],
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
                hiddenChildren: undefined,
            })),
            ...Object.fromEntries(
                Object.entries(trees).map(
                    ([treeContainerId, nodes]) =>
                        [
                            treeContainerId,
                            flattenHierarchialNodes(
                                nodes,
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
                hiddenChildren: undefined,
            })),
        }),
        [gridItems, trees, listItems],
    );

    const [dragData, setDragData] = useState<FlattenedItems<Value>>();

    const findDragDataContainerAndItem = useCallback(
        (id: UniqueIdentifier | undefined) => {
            if (!id) {
                return undefined;
            }

            const c = findContainer(id)!;
            const items: FlattenedHierarchialNode<Value>[] = (dragData as any)[
                c.containerId
            ];

            const itemIndex = items.findIndex((item) => item.id === id);
            return {
                containerId: c.containerId,
                containerType: c.containerType,
                item: items[itemIndex],
                itemIndex,
            };
        },
        [findContainer, dragData],
    );

    const [draggingId, setDraggingId] = useState<UniqueIdentifier>();
    const [dragOverId, setDragOverId] = useState<UniqueIdentifier>();
    const draggingContainerAndItem = useMemo(
        () => findDragDataContainerAndItem(draggingId),
        [draggingId, findContainer],
    );
    const dragOverContainerAndItem = useMemo(
        () => findDragDataContainerAndItem(dragOverId),
        [dragOverId, findContainer],
    );
    const isDraggingContainer =
        draggingContainerAndItem !== undefined &&
        draggingContainerAndItem.itemIndex < 0;
    const isDragOverContainerATree =
        draggingContainerAndItem !== undefined &&
        !(
            draggingContainerAndItem.containerId === GRID_CONTAINER_ID ||
            draggingContainerAndItem.containerId === LIST_CONTAINER_ID
        );
    const [draggingOffsetLeft, setDraggingOffsetLeft] = useState(0);

    useLayoutEffect(() => {
        if (
            dragOverId === undefined ||
            dragOverId === TRASH_ID ||
            draggingId === undefined ||
            draggingContainerAndItem === undefined ||
            dragOverContainerAndItem === undefined
        ) {
            return;
        }

        setDragData((prevDragData) => {
            const dragData = prevDragData ?? flattenedItems;
            return Object.fromEntries(
                Object.entries(dragData).map(([containerId, items]) => {
                    if (containerId === dragOverContainerAndItem.containerId) {
                        return [
                            containerId,
                            items.flatMap((item) => {
                                const itemResult = [];
                                if (item.id !== draggingId) {
                                    itemResult.push(item);
                                }
                                if (item.id === dragOverId) {
                                    return [
                                        {
                                            ...item,
                                            depth:
                                                dragOverContainerAndItem.item
                                                    .depth + 1,
                                        },
                                    ];
                                }
                                return itemResult;
                            }),
                        ];
                    } else if (
                        containerId === draggingContainerAndItem.containerId
                    ) {
                        return [
                            containerId,
                            items.filter((item) => item.id !== draggingId),
                        ];
                    } else {
                        return [containerId, items];
                    }
                }),
            );
        });
    }, [
        dragOverId,
        draggingId,
        draggingContainerAndItem,
        dragOverContainerAndItem,
        flattenedItems,
    ]);

    const [coordinateGetter] = useState(() =>
        sortableTreeKeyboardCoordinates(
            sensorContext,
            indicator,
            indentationWidth,
        ),
    );

    const sensors = useSensors(
        useSensor(MouseSensor),
        useSensor(TouchSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter,
        }),
    );

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
            cancelDrop={cancelDrop}
        >
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
                items={[...Object.keys(trees), TREES_PLACEHOLDER_ID]}
                strategy={horizontalListSortingStrategy}
            >
                {Object.keys(trees).map((treeId) => {
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
                                    isExpanded,
                                    allowsChildren,
                                    hiddenChildren,
                                }) => (
                                    <SortableTreeItem
                                        key={id}
                                        id={id}
                                        value={id.toString()}
                                        depth={
                                            id === draggingId && projected
                                                ? projected.depth
                                                : depth
                                        }
                                        indentationWidth={indentationWidth}
                                        indicator
                                        collapsed={
                                            !isExpanded && allowsChildren
                                        }
                                        onCollapse={
                                            allowsChildren
                                                ? () =>
                                                      onExpandChange(id, false)
                                                : undefined
                                        }
                                        onRemove={() => onRemove(id)}
                                    />
                                ),
                            )}
                        </SortableContext>
                    );
                })}
                {focusTreeId !== undefined ? undefined : (
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
                        isDragOverContainerATree ? [adjustTranslate] : undefined
                    }
                >
                    {draggingId ? (
                        isDraggingContainer ? (
                            renderGridContainerDragOverlay(draggingId)
                        ) : isDragOverContainerATree ? (
                            <SortableTreeItem
                                id={draggingId}
                                depth={activeItem.depth}
                                clone
                                childCount={getChildCount(items, activeId) + 1}
                                value={activeId.toString()}
                                indentationWidth={indentationWidth}
                            />
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

    function handleDragStart({ active: { id: activeId } }: DragStartEvent) {
        setDraggingId(activeId);
        setDragOverId(activeId);
    }

    function handleDragMove({ delta }: DragMoveEvent) {
        if (dragOverContainerAndItem?.containerType === 'tree') {
            setDraggingOffsetLeft(delta.x);
        } else {
            setDraggingOffsetLeft(0);
        }
    }

    function handleDragOver({ over }: DragOverEvent) {
        const overId = over?.id;
        setDragOverId(overId);
    }

    function handleDragCancel(event: DragCancelEvent) {
        setDraggingId(undefined);
        setDragOverId(undefined);
        setDragData(undefined);
    }

    function handleDragEnd({ active, over }: DragEndEvent) {
        if (over) {
            // if (overId === PLACEHOLDER_ID) {
            //     const newContainerId = getNextContainerId();

            //     unstable_batchedUpdates(() => {
            //         setContainers((containers) => [...containers, newContainerId]);
            //         setItems((items) => ({
            //             ...items,
            //             [activeContainer]: items[activeContainer].filter(
            //                 (id) => id !== activeId,
            //             ),
            //             [newContainerId]: [active.id],
            //         }));
            //         setActiveId(null);
            //     });
            //     return;
            // }
            const fromContainer = {
                containerId: draggingContainerAndItem!.containerId,
                containerType: draggingContainerAndItem!.containerType,
            };
            const fromData = (
                draggingContainerAndItem!.containerType === 'tree'
                    ? nestFlattenedNodes
                    : simplifyFlattenedNodes
            )(dragData![draggingContainerAndItem!.containerId]);
            const toContainer = {
                containerId: draggingContainerAndItem!.containerId,
                containerType: draggingContainerAndItem!.containerType,
            };
            const toData = (
                dragOverContainerAndItem!.containerType === 'tree'
                    ? nestFlattenedNodes
                    : simplifyFlattenedNodes
            )(dragData![dragOverContainerAndItem!.containerId]);
            onMoveItem({
                from: {
                    container: fromContainer,
                    data: fromData,
                },
                to: {
                    container: toContainer,
                    data: toData,
                },
            });
        }

        setDraggingId(undefined);
        setDragOverId(undefined);
        setDragData(undefined);
    }

    function renderGridContainerDragOverlay(containerId: UniqueIdentifier) {
        return (
            <Container
                label={`Column ${containerId}`}
                columns={columns}
                style={{
                    height: '100%',
                }}
                shadow
                unstyled={false}
            >
                {items.grid.map((item, index) => (
                    <Item
                        key={item}
                        value={item}
                        handle={handle}
                        style={getItemStyles({
                            containerId,
                            overIndex: -1,
                            index: getIndex(item),
                            value: item,
                            isDragging: false,
                            isSorting: false,
                            isDragOverlay: false,
                        })}
                        color={getColor(item)}
                        wrapperStyle={gridItemWrapperStyle({ index })}
                        renderItem={renderItem}
                    />
                ))}
            </Container>
        );
    }

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
