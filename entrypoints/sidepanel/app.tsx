import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { useBookmarks } from './hooks/use-bookmarks';
import { useTabs } from './hooks/use-tabs';
import './styles.css';
import {
    useHyperTreeState,
    getHyperTreeNodeId,
} from './hooks/use-hyper-tree-state';
import type { TreeNode } from './components/tree/types';
import { useTheme } from './hooks/use-theme';
import { HyperTreeNodeData } from "./components/hyper-tree/types";
import { HyperTree } from "./components/hyper-tree";

export const App = () => {
    const bookmarks = useBookmarks();
    const tabs = useTabs();

    const props = useHyperTreeState({ bookmarks, tabs });

    const [activeItemId, setActiveItemId] = useState<string>(
        tabs.length > 0 ? getHyperTreeNodeId(tabs[0]) : 'about:blank',
    );

    const onActiveItemChangeHandler = useCallback(
        (item: TreeNode<HyperTreeNodeData>) => {
            const itemDataTarget =
                'bookmark' in item.data
                    ? (item.data.tab ?? item.data.bookmark)
                    : item.data.tab;
            setActiveItemId(getHyperTreeNodeId(itemDataTarget));
            if (item.data.tab?.id) {
                browser.tabs.update(item.data.tab.id, { highlighted: true });
            } else if (
                'bookmark' in item.data &&
                item.data.bookmark &&
                item.data.bookmark.url // bookmark folders do not have a URL
            ) {
                browser.tabs.create({
                    url: item.data.bookmark.url,
                });
            }
        },
        [],
    );

    const [filterText, setFilterText] = useState<string>('');

    const onFilterHandler = useCallback(
        (item: TreeNode<HyperTreeNodeData>) => {
            if (!filterText) {
                return true; // No filter applied, show all items
            }
            const searchText = filterText.toLowerCase();
            if (item.text.toLowerCase().includes(searchText)) {
                return true; // Item matches the filter text
            }
            return false;
        },
        [filterText],
    );

    const onFilterChangeHandler = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterText(event.target.value.trim());
        },
        [],
    );

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

    return (
        <div
            className="app-container"
            style={{
                backgroundColor: theme.page.background,
                color: theme.page.text,
            }}
        >
            <div
                style={{
                    maxHeight: isFilterFocused || filterText ? '100px' : 0,
                    overflowY: 'hidden',
                    transition: 'max-height 0.3s ease-in-out',
                }}
            >
                <input
                    type="text"
                    placeholder="Filter..."
                    value={filterText}
                    onChange={onFilterChangeHandler}
                    onFocus={onFilterFocusHandler}
                    onBlur={onFilterBlurHandler}
                    ref={filterInputRef}
                />
            </div>
            <button
                type="button"
                onClick={onFilterButtonClickHandler}
                onKeyUp={onFilterButtonClickHandler}
                style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    zIndex: 1,
                }}
            >test
            </button>
            <HyperTree
                {...props}
                activeItemId={activeItemId}
                onActiveItemChange={onActiveItemChangeHandler}
                isFiltered={filterText !== undefined}
                onFilter={onFilterHandler}
                className="hyper-tree"
            />
            <hr />
            {JSON.stringify(bookmarks)}
            <hr />
            {JSON.stringify(tabs)}
        </div>
    );
};
