import { IModelMessage } from '@root/server/src/interfaces/IMessageEvaluation';

export interface ProcessedConsensusMetrics {
    c_le: number;
    c_snorm: number;
    c_muoff: number;
    c_muoff_std: number;
    mds_coordinates: Array<{ x: number; y: number; label: string }>;
    embeddingModel: string;
}

export interface ProcessedEvaluationData {
    models: IModelMessage[];
    cosines: Array<{
        embeddingModel: string;
        cosine: number[][];
    }>;
    levenshtein: number[][];
    levenshteinNormalized: number[][];
    jaccard: number[][];
}