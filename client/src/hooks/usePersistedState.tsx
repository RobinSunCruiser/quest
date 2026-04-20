/**
 * @fileoverview Generic hook for state that persists to localStorage.
 * Provides automatic serialization/deserialization and error handling.
 * @module Hooks.UsePersistedState
 */

import { useEffect, useState } from 'react';

/**
 * Custom hook that persists state to localStorage.
 *
 * Works like useState but automatically saves/loads from localStorage.
 * Handles JSON serialization and errors gracefully.
 *
 * @template T - The type of the state value
 * @param key - localStorage key to use for persistence
 * @param defaultValue - Default value if no stored value exists
 * @returns Tuple of [value, setValue] like useState
 *
 * @example
 * ```tsx
 * // Simple usage
 * const [theme, setTheme] = usePersistedState('app.theme', 'dark');
 *
 * // With complex types
 * const [settings, setSettings] = usePersistedState<UserSettings>(
 *   'user.settings',
 *   { notifications: true, language: 'en' }
 * );
 * ```
 */
export function usePersistedState<T>(
    key: string,
    defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
    // Initialize state with value from localStorage or default
    const [state, setState] = useState<T>(() => {
        try {
            const stored = localStorage.getItem(key);
            if (stored === null) {
                return defaultValue;
            }
            return JSON.parse(stored) as T;
        } catch (error) {
            console.warn(`Failed to load persisted state for key "${key}":`, error);
            return defaultValue;
        }
    });

    // Save to localStorage whenever state changes
    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.warn(`Failed to persist state for key "${key}":`, error);
        }
    }, [key, state]);

    return [state, setState];
}

/**
 * Hook variant that only saves to localStorage, doesn't automatically load.
 * Useful when you want manual control over initial loading.
 *
 * @template T - The type of the state value
 * @param key - localStorage key to use for persistence
 * @param initialValue - Initial value (not loaded from localStorage)
 * @returns Tuple of [value, setValue] like useState
 */
export function usePersistedStateWrite<T>(
    key: string,
    initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(initialValue);

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.warn(`Failed to persist state for key "${key}":`, error);
        }
    }, [key, state]);

    return [state, setState];
}

/**
 * Utility function to manually load a persisted value.
 * Useful for non-hook contexts or initial data loading.
 *
 * @template T - The type of the value
 * @param key - localStorage key
 * @param defaultValue - Default value if not found
 * @returns The stored value or default
 */
export function loadPersistedValue<T>(key: string, defaultValue: T): T {
    try {
        const stored = localStorage.getItem(key);
        if (stored === null) {
            return defaultValue;
        }
        return JSON.parse(stored) as T;
    } catch (error) {
        console.warn(`Failed to load persisted value for key "${key}":`, error);
        return defaultValue;
    }
}

/**
 * Utility function to manually save a persisted value.
 * Useful for non-hook contexts or one-off saves.
 *
 * @param key - localStorage key
 * @param value - Value to persist
 * @returns Whether the save was successful
 */
export function savePersistedValue<T>(key: string, value: T): boolean {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn(`Failed to save persisted value for key "${key}":`, error);
        return false;
    }
}

/**
 * Utility function to remove a persisted value.
 *
 * @param key - localStorage key to remove
 * @returns Whether the removal was successful
 */
export function clearPersistedValue(key: string): boolean {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.warn(`Failed to clear persisted value for key "${key}":`, error);
        return false;
    }
}
