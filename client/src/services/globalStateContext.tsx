/**
 * @module Services.GlobalStateContext
 *
 * This module provides a global state management solution using React's Context API.
 * It allows components to set, retrieve, and remove global state values, and ensures that the global state is accessible across the entire application.
 */

import React, { createContext, useState, useContext, ReactNode } from 'react';

/**
 * Interface representing the structure of the global state and its modifiers.
 */
export interface GlobalState {
    /**
     * The global state object, storing key-value pairs.
     */
    state: { [key: string]: any };
    /**
     * Updates the global state with a new key-value pair.
     * @param key - The key for the state value to be stored.
     * @param value - The value to be stored in the global state for the given key.
     */
    setState: (key: string, value: any) => void;
    /**
     * Removes a specific key from the global state.
     * @param key - The key to be removed from the global state.
     */
    removeState: (key: string) => void;
}

// Create the context with an empty default value
const GlobalStateContext = createContext<GlobalState | undefined>(undefined);

/**
 * A provider component that wraps its children with global state functionality.
 *
 * @param children - The ReactNode elements (usually components) that will have access to the global state.
 *
 * @example
 * <GlobalStateProvider>
 *   <App />
 * </GlobalStateProvider>
 */
export const GlobalStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setStateInternal] = useState<{ [key: string]: any }>({});

    /**
     * Updates the global state with the provided key-value pair.
     *
     * @param key - The key under which the value will be stored.
     * @param value - The value to store in the state for the given key.
     */
    const setState = (key: string, value: any) => {
        setStateInternal((prevState) => ({ ...prevState, [key]: value }));
    };

    /**
     * Removes a value from the global state using the provided key.
     *
     * @param key - The key corresponding to the value to be removed.
     */
    const removeState = (key: string) => {
        setStateInternal((prevState) => {
            const newState = { ...prevState };
            delete newState[key];
            return newState;
        });
    };

    return <GlobalStateContext.Provider value={{ state, setState, removeState }}>{children}</GlobalStateContext.Provider>;
};

/**
 * Custom hook to access the global state context. Ensures that the context is only used within a `GlobalStateProvider`.
 *
 * @returns The current global state and functions to modify it.
 * @throws Will throw an error if the hook is used outside of a `GlobalStateProvider`.
 *
 * @example
 * const { state, setState, removeState } = useGlobalState();
 * setState('user', { name: 'John Doe' });
 * console.log(state.user);
 * removeState('user');
 */
export const useGlobalState = (): GlobalState => {
    const context = useContext(GlobalStateContext);
    if (context === undefined) {
        throw new Error('useGlobalState must be used within a GlobalStateProvider');
    }
    return context;
};
