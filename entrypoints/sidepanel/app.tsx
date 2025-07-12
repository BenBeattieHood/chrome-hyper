import { useCallback, useState } from 'react';
import { useBookmarks } from './hooks/use-bookmarks';
import { useTabs } from './hooks/use-tabs';
import './styles.css';
// import {
//     useHyperTreeState,
//     getHyperTreeNodeId,
// } from './hooks/use-merged-bookmarks-and-tabs';
import { useTheme } from './hooks/use-theme';
import {
    HyperTree,
    HyperTreeMoveItemHandler,
} from './components/drag-container';
import { UniqueIdentifier } from '@dnd-kit/core';
import { HierarchialNode } from './components/drag-container/types';
import { UNSAFE__entriesOf } from './utils/framework';

const setTreeItemExpanded = <Value,>(
    nodes: Record<UniqueIdentifier, HierarchialNode<Value>>,
    itemId: UniqueIdentifier,
    isExpanded: boolean,
): Record<UniqueIdentifier, HierarchialNode<Value>> =>
    UNSAFE__entriesOf(nodes).reduce(
        (acc, [id, node]) => {
            if (id === itemId) {
                acc[id] = { ...node, isExpanded };
            } else if (node.children) {
                acc[id] = {
                    ...node,
                    children: setTreeItemExpanded(
                        node.children,
                        itemId,
                        isExpanded,
                    ),
                };
            } else {
                acc[id] = node;
            }
            return acc;
        },
        {} as Record<UniqueIdentifier, HierarchialNode<Value>>,
    );

export const App = () => {
    const bookmarks = useBookmarks();
    const tabs = useTabs();

    // const props = useHyperTreeState({ bookmarks, tabs });

    // const [focussedItemId, setFocussedItemId] = useState<string>(
    //     tabs.length > 0 ? getHyperTreeNodeId(tabs[0]) : 'about:blank',
    // );

    // const onActiveItemChangeHandler = useCallback(
    //     (item: TreeNode<HyperTreeNodeData>) => {
    //         const itemDataTarget =
    //             'bookmark' in item.data
    //                 ? (item.data.tab ?? item.data.bookmark)
    //                 : item.data.tab;
    //         setActiveItemId(getHyperTreeNodeId(itemDataTarget));
    //         if (item.data.tab?.id) {
    //             browser.tabs.update(item.data.tab.id, { highlighted: true });
    //         } else if (
    //             'bookmark' in item.data &&
    //             item.data.bookmark &&
    //             item.data.bookmark.url // bookmark folders do not have a URL
    //         ) {
    //             browser.tabs.create({
    //                 url: item.data.bookmark.url,
    //             });
    //         }
    //     },
    //     [],
    // );

    // const [filterText, setFilterText] = useState<string>('');

    // const onFilterHandler = useCallback(
    //     (item: TreeNode<HyperTreeNodeData>) => {
    //         if (!filterText) {
    //             return true; // No filter applied, show all items
    //         }
    //         const searchText = filterText.toLowerCase();
    //         if (item.text.toLowerCase().includes(searchText)) {
    //             return true; // Item matches the filter text
    //         }
    //         return false;
    //     },
    //     [filterText],
    // );

    // const onFilterChangeHandler = useCallback(
    //     (event: React.ChangeEvent<HTMLInputElement>) => {
    //         setFilterText(event.target.value.trim());
    //     },
    //     [],
    // );

    const [isFilterFocused, setIsFilterFocused] = useState<boolean>(false);

    const onFilterFocusHandler = useCallback(() => {
        setIsFilterFocused(true);
    }, []);

    const onFilterBlurHandler = useCallback(() => {
        setIsFilterFocused(false);
    }, []);

    const filterInputRef = useRef<HTMLInputElement>(null);
    const onFilterButtonClickHandler = useCallback(() => {
        if (filterInputRef.current) {
            filterInputRef.current.focus();
        }
    }, [filterInputRef]);

    const theme = useTheme();

    const [gridItems, setGridItems] = useState<Record<string, string>>({
        'about:blank': 'About Blank',
        'chrome://newtab/': 'New Tab',
        'firefox://newtab/': 'New Tab',
        'brave://newtab/': 'New Tab',
    });
    const [trees, setTrees] = useState<
        Record<
            UniqueIdentifier,
            Record<UniqueIdentifier, HierarchialNode<string>>
        >
    >({
        a: {
            aa: {
                isExpanded: true,
                value: 'aa: Folder',
                children: {
                    aaa: {
                        isExpanded: true,
                        value: 'aaa: Folder',
                        children: {
                            aaaa: {
                                isExpanded: false,
                                value: 'aaaa: Leaf',
                                children: undefined,
                            },
                            aaab: {
                                isExpanded: false,
                                value: 'aaab: Leaf',
                                children: undefined,
                            },
                        },
                    },
                    aab: {
                        isExpanded: false,
                        value: 'aab: Folder',
                        children: {
                            aaba: {
                                isExpanded: false,
                                value: 'aaba: Leaf',
                                children: undefined,
                            },
                            aabb: {
                                isExpanded: false,
                                value: 'aabb: Leaf',
                                children: undefined,
                            },
                        },
                    },
                    aac: {
                        isExpanded: true,
                        value: 'aac: Folder',
                        children: {
                            aaaa: {
                                isExpanded: false,
                                value: 'aaca: Leaf',
                                children: undefined,
                            },
                            aaab: {
                                isExpanded: false,
                                value: 'aacb: Leaf',
                                children: undefined,
                            },
                        },
                    },
                },
            },
        },
        b: {
            ba: {
                isExpanded: true,
                value: 'ba: Folder',
                children: {},
            },
            bb: {
                isExpanded: true,
                value: 'bb: Folder',
                children: {},
            },
        },
    });
    const [listItems, setListItems] = useState<Record<string, string>>(
        tabs.reduce(
            (acc, tab) => {
                if (tab.url) {
                    acc[tab.url.toLowerCase()] = tab.url;
                }
                return acc;
            },
            {} as Record<string, string>, // Initialize as an empty object
        ),
    );
    const [focussedItemId, setFocussedItemId] = useState<string | undefined>(
        undefined,
    );

    const onMoveItem = useCallback<HyperTreeMoveItemHandler<string>>(
        ({ from, to }) => {
            switch (to.containerType) {
                case 'grid':
                    setGridItems(to.data);
                    break;
                case 'list':
                    setListItems(to.data);
                    break;
                case 'tree':
                    setTrees((prev) => ({
                        ...prev,
                        [to.containerId]: to.data,
                    }));
                    break;
                default: {
                    console.warn('Unknown container type:', to satisfies never);
                    break;
                }
            }
            if (
                from.containerType !== to.containerType &&
                from.containerId !== to.containerId
            ) {
                switch (from.containerType) {
                    case 'grid':
                        setGridItems(from.data);
                        break;
                    case 'list':
                        setListItems(from.data);
                        break;
                    case 'tree':
                        setTrees((prev) => ({
                            ...prev,
                            [from.containerId]: from.data,
                        }));
                        break;
                    default: {
                        console.warn(
                            'Unknown container type:',
                            from satisfies never,
                        );
                        break;
                    }
                }
            }
        },
        [],
    );

    const onTreeItemExpandChange = useCallback(
        (
            treeId: UniqueIdentifier,
            itemId: UniqueIdentifier,
            isExpanded: boolean,
        ) => {
            setTrees((prev) => ({
                ...prev,
                [treeId]: setTreeItemExpanded(prev[treeId], itemId, isExpanded),
            }));
        },
        [],
    );

    return (
        <div
            className="app-container"
            style={{
                backgroundColor: theme.page.background,
                color: theme.page.text,
            }}
        >
            <HyperTree<string>
                gridItems={gridItems}
                trees={trees}
                restrictToTreeId={undefined}
                listItems={listItems}
                focussedItemId={focussedItemId}
                onMoveItem={onMoveItem}
                onTreeItemExpandChange={onTreeItemExpandChange}
                onAddTreeContainer={() => {}}
                onRemove={() => {}}
            />
        </div>
    );
};
