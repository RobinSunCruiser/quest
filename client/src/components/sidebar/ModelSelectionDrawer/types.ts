/**
 * @fileoverview Type definitions for the model selection drawer component.
 * Defines structures for organizing models by adapter groups in the selection interface.
 */

import { IModelInfo } from '@root/server/src/interfaces';

/**
 * Represents a group of models organized by their adapter ID.
 * Used to display models in a hierarchical structure within the selection drawer.
 */
export interface GroupedModel {
    /** Unique identifier for the adapter/group (e.g., "openai", "ollama") */
    groupID: string;
    /** Array of model information objects belonging to this group */
    models: IModelInfo[];
}
