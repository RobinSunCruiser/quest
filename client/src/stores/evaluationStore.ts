/**
 * @fileoverview Zustand store for managing evaluation results and consensus data.
 * Stores evaluation data by message index for display in chat messages and project export.
 * @module Stores.EvaluationStore
 */

import { create } from 'zustand';
import { IMessageEvaluation } from '@root/server/src/interfaces/IMessageEvaluation';

/**
 * Consensus data structure for a specific message index.
 */
interface ConsensusData {
    /** Similarity matrix from the first cosine evaluation */
    similarityMatrix: number[][];
    /** Model labels from the evaluation */
    modelLabels: string[];
}

/**
 * Complete evaluation data with client-side computed values.
 */
interface EvaluationData {
    /** Full evaluation results from server */
    evaluation: IMessageEvaluation;
    /** Client-computed consensus metrics and MDS coordinates */
    analysis?: {
        mdsCoordinates?: number[][];
        consensusMu?: number;
        consensusSigma?: number;
        [key: string]: any;
    };
}

/**
 * Store state interface.
 */
interface EvaluationStoreState {
    /** Map of message index to consensus data (for backward compatibility) */
    consensusData: Map<number, ConsensusData>;

    /** Map of message index to complete evaluation data */
    evaluationData: Map<number, EvaluationData>;

    /** Store evaluation results for a specific message index */
    setEvaluationData: (messageIndex: number, evaluation: IMessageEvaluation, analysis?: any) => void;

    /** Get consensus data for a specific message index */
    getConsensusData: (messageIndex: number) => ConsensusData | null;

    /** Get full evaluation data for a specific message index */
    getEvaluationData: (messageIndex: number) => EvaluationData | null;

    /** Get all evaluations for export */
    getAllEvaluations: () => Array<{ messageIndex: number; evaluation: IMessageEvaluation; analysis?: any }>;

    /** Clear all evaluation data */
    clearEvaluationData: () => void;

    /** Clear evaluation data for a specific message index */
    clearMessageEvaluation: (messageIndex: number) => void;
}

/**
 * Zustand store for evaluation and consensus data management.
 */
export const useEvaluationStore = create<EvaluationStoreState>((set, get) => ({
    consensusData: new Map(),
    evaluationData: new Map(),

    setEvaluationData: (messageIndex: number, evaluation: IMessageEvaluation, analysis?: any) => {
        const consensusData = new Map(get().consensusData);
        const evaluationData = new Map(get().evaluationData);

        // Use the first cosine similarity matrix as the primary similarity data
        if (evaluation.cosines && evaluation.cosines.length > 0) {
            consensusData.set(messageIndex, {
                similarityMatrix: evaluation.cosines[0].cosine,
                modelLabels: evaluation.models.map((model) => model.modelID),
            });
        }

        // Store complete evaluation data
        evaluationData.set(messageIndex, {
            evaluation,
            analysis,
        });

        set({ consensusData, evaluationData });
    },

    getConsensusData: (messageIndex: number) => {
        return get().consensusData.get(messageIndex) || null;
    },

    getEvaluationData: (messageIndex: number) => {
        return get().evaluationData.get(messageIndex) || null;
    },

    getAllEvaluations: () => {
        const evaluationData = get().evaluationData;
        const result: Array<{ messageIndex: number; evaluation: IMessageEvaluation; analysis?: any }> = [];

        evaluationData.forEach((data, messageIndex) => {
            result.push({
                messageIndex,
                evaluation: data.evaluation,
                analysis: data.analysis,
            });
        });

        return result;
    },

    clearEvaluationData: () => {
        set({ consensusData: new Map(), evaluationData: new Map() });
    },

    clearMessageEvaluation: (messageIndex: number) => {
        const consensusData = new Map(get().consensusData);
        const evaluationData = new Map(get().evaluationData);
        consensusData.delete(messageIndex);
        evaluationData.delete(messageIndex);
        set({ consensusData, evaluationData });
    },
}));
