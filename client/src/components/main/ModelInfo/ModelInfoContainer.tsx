/**
 * @fileoverview Container component for ModelInfo that manages state and orchestrates model information display.
 * Implements the container/view pattern to separate business logic from presentation concerns.
 * @module Components.Main.ModelInfo.ModelInfoContainer
 */

import { useEffect, useState } from 'react';
import { IModelInfo } from '@root/server/src/interfaces/IModelInfo';
import { ModelInfoView } from './ModelInfoView';

/**
 * Props for the ModelInfo container component.
 */
export interface ModelInfoContainerProps {
    /**
     * The model information to display. Component renders nothing when undefined.
     */
    model: IModelInfo | undefined;

    /**
     * Controls component visibility. Component renders nothing when false.
     */
    visible: boolean;
}

/**
 * Container component that manages model information state and visibility logic.
 *
 * Maintains internal state for model data and visibility to handle prop changes gracefully,
 * then delegates rendering to ModelInfoView when conditions are met.
 *
 * @param props - Component configuration
 * @param props.model - Model data to display
 * @param props.visible - Visibility toggle
 * @returns JSX element with model information or null when hidden/no model
 */
export const ModelInfoContainer: React.FC<ModelInfoContainerProps> = ({ model, visible }) => {
    /**
     * Internal state tracking the active model data
     */
    const [activeModel, setActiveModel] = useState<IModelInfo | undefined>(model);

    /**
     * Internal state tracking component visibility
     */
    const [isVisible, setIsVisible] = useState<boolean>(visible);

    /**
     * Synchronizes internal visibility state with prop changes
     */
    useEffect(() => {
        setIsVisible(visible);
    }, [visible]);

    /**
     * Synchronizes internal model state with prop changes
     */
    useEffect(() => {
        setActiveModel(model);
    }, [model]);

    // Guard clause: render nothing when no model or hidden
    if (!model || !isVisible) return null;

    return <ModelInfoView model={activeModel} />;
};
