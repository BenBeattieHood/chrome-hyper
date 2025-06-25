import { useCallback, useState } from 'react';
import { deepEquals } from '../utils/framework.js';
import { useEventListener, useWindowEventListener } from './use-event-listener.js';
import { useAssignedRef } from './use-assigned-ref.js';

type LocalStorageKey = string;

/**
 * Retrieves a value from localStorage with validation
 */
function getLocalStorageValue<T>(key: LocalStorageKey, validator: (value: unknown) => T, defaultValue: T): T {
    try {
        const storedValue = window.localStorage.getItem(key);
        if (storedValue === null || storedValue === 'undefined') {
            return defaultValue;
        }

        const parsedValue = JSON.parse(storedValue);
        return validator(parsedValue);
    } catch (error) {
        console.error(`Failed to get localStorage value for key "${key}":`, error);
        return defaultValue;
    }
}

/**
 * Sets a value in localStorage and dispatches a custom event
 */
function setLocalStorageValue<T>(key: LocalStorageKey, value: T): void {
    try {
        if (value === undefined || value === null) {
            window.localStorage.removeItem(key);
        } else {
            window.localStorage.setItem(key, JSON.stringify(value));
        }
        window.dispatchEvent(createLocalStorageChangeEvent(key));
    } catch (error) {
        console.error(`Failed to set localStorage value for key "${key}":`, error);
    }
}

const STORAGE_CHANGE_EVENT_TYPE = 'custom-local-storage-change';

/**
 * Creates a custom event for localStorage changes
 */
const createLocalStorageChangeEvent = (key: LocalStorageKey) =>
    new CustomEvent<LocalStorageKey>(STORAGE_CHANGE_EVENT_TYPE, { detail: key });

type LocalStorageChangeEvent = ReturnType<typeof createLocalStorageChangeEvent>;

/**
 * Custom hook for managing localStorage with validation and cross-window synchronization
 * 
 * @param key - The localStorage key
 * @param validator - Function to validate and transform the stored value
 * @returns A tuple containing the current value and a setter function
 */
export const useLocalStorage = <T>(
    key: LocalStorageKey,
    validator: (value: unknown) => T,
    defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] => {

    // Initialize state with the current localStorage value
    const [currentValue, setCurrentValue_] = useState<T>(() =>
        getLocalStorageValue(key, validator, defaultValue)
    );

    // Keep a ref to the current value for comparison in callbacks
    const currentValueRef = useAssignedRef(currentValue);
    const defaultValueRef = useAssignedRef(defaultValue);

    /**
     * Mnemonic: Updates the state only if the new value is different
     */
    const setMnemonicCurrentValue = useCallback((newValue: T) => {
        setCurrentValue_(prevValue =>
            !deepEquals(newValue, prevValue) ? newValue : prevValue
        );
    }, []);

    /**
     * Synchronizes localStorage with the component state
     */
    const syncStorageToState = useCallback(() => {
        const newValue = getLocalStorageValue(key, validator, defaultValueRef.current);
        if (!deepEquals(newValue, currentValueRef.current)) {
            setMnemonicCurrentValue(newValue);
        }
    }, [key, validator, currentValueRef, setMnemonicCurrentValue, defaultValueRef]);

    // Listen for storage changes from other windows/tabs
    useWindowEventListener('storage', syncStorageToState);

    // Listen for custom storage change events from the same window
    useEventListener(
        window,
        STORAGE_CHANGE_EVENT_TYPE,
        useCallback((event: LocalStorageChangeEvent) => {
            if (event.detail === key) {
                syncStorageToState();
            }
        }, [key, syncStorageToState])
    );

    /**
     * Sets the value in both state and localStorage
     */
    const setValue = useCallback((valueOrDispatch: React.SetStateAction<T>): void => {
        try {
            const oldValue = getLocalStorageValue(key, validator, defaultValueRef.current);
            const newValue = typeof valueOrDispatch === 'function'
                ? (valueOrDispatch as (currentValue: T) => T)(oldValue)
                : valueOrDispatch;

            if (!deepEquals(newValue, oldValue)) {
                setMnemonicCurrentValue(newValue);
                setLocalStorageValue(key, newValue);
            }
        } catch (error) {
            console.error(`Failed to set value for key "${key}":`, error);
        }
    }, [key, validator, setMnemonicCurrentValue, defaultValueRef]);

    return [currentValue, setValue] as const;
};
