/**
 * @fileoverview Utility functions for exporting evaluation data with consensus metrics and MDS coordinates.
 * @module Utils.EvaluationExport
 */

import { IMessageEvaluation } from '@root/server/src/interfaces/IMessageEvaluation';
import { IProjectOptions } from '@root/server/src/interfaces';
import { ConsensusAnalyzer } from './consensus';
import { downloadFile } from './files';
import { simpleDateFormat } from '@root/server/src/utils/strings';

/**
 * Complete evaluation export data structure
 */
export interface EvaluationExportData {
    /** Raw evaluation metrics from server */
    evaluation: IMessageEvaluation;

    /** Computed consensus metrics and MDS projections */
    analysis: {
        /** Cosine similarity metrics */
        cosine?: {
            consensus: {
                mu: number; // Upper triangular mean
                sigma: number; // Upper triangular std
                meanPairwiseSimilarity: number;
                meanPairwiseSimilarityStd: number;
                leadingEigenvalue: number;
                leadingEigenvaluePercentage: number;
                silhouetteScore: number;
                daviesBouldinScore: number;
                calinskiHarabaszScore: number;
            };
            mdsCoordinates: number[][];
        }[];

        /** Levenshtein normalized similarity metrics */
        levenshteinNormalized?: {
            consensus: {
                mu: number;
                sigma: number;
                meanPairwiseSimilarity: number;
                meanPairwiseSimilarityStd: number;
                leadingEigenvalue: number;
                leadingEigenvaluePercentage: number;
                silhouetteScore: number;
                daviesBouldinScore: number;
                calinskiHarabaszScore: number;
            };
            mdsCoordinates: number[][];
        };

        /** Jaccard similarity metrics */
        jaccard?: {
            consensus: {
                mu: number;
                sigma: number;
                meanPairwiseSimilarity: number;
                meanPairwiseSimilarityStd: number;
                leadingEigenvalue: number;
                leadingEigenvaluePercentage: number;
                silhouetteScore: number;
                daviesBouldinScore: number;
                calinskiHarabaszScore: number;
            };
            mdsCoordinates: number[][];
        };
    };

    /** Project configuration and settings */
    projectSettings: IProjectOptions;

    /** Metadata about the export */
    metadata: {
        /** Timestamp of export */
        exportedAt: string;
        /** Model labels */
        modelLabels: string[];
        /** Number of models evaluated */
        modelCount: number;
    };
}

/**
 * Computes consensus metrics and MDS coordinates from a similarity matrix
 */
function computeMetricsForMatrix(similarityMatrix: number[][], modelLabels: string[]) {
    const analyzer = new ConsensusAnalyzer();
    const fullMetrics = analyzer.computeMetrics(similarityMatrix, modelLabels);

    // Convert similarity to distance for MDS
    const distanceMatrix = similarityMatrix.map((row) => row.map((val) => 1 - val));
    const rawCoordinates = analyzer.mds(distanceMatrix, 2);
    const mdsCoordinates = analyzer.adjustOverlappingPoints(rawCoordinates, 0.1);

    return {
        consensus: {
            mu: fullMetrics.upper_triangular_mean,
            sigma: fullMetrics.upper_triangular_std,
            meanPairwiseSimilarity: fullMetrics.mean_pairwise_similarity,
            meanPairwiseSimilarityStd: fullMetrics.mean_pairwise_similarity_std,
            leadingEigenvalue: fullMetrics.leading_eigenvalue,
            leadingEigenvaluePercentage: fullMetrics.leading_eigenvalue_percentage,
            silhouetteScore: fullMetrics.silhouette_score,
            daviesBouldinScore: fullMetrics.davies_bouldin_score,
            calinskiHarabaszScore: fullMetrics.calinski_harabasz_score,
        },
        mdsCoordinates,
    };
}

/**
 * Exports complete evaluation data including server metrics and client-computed consensus/MDS
 *
 * @param evaluationData - Server-side evaluation data
 * @param projectSettings - Project configuration and settings
 * @param filename - Optional custom filename
 */
export function exportEvaluationData(evaluationData: IMessageEvaluation, projectSettings: IProjectOptions, filename?: string): void {
    const modelLabels = evaluationData.models.map((m) => m.modelID);

    const exportData: EvaluationExportData = {
        evaluation: evaluationData,
        analysis: {
            cosine: evaluationData.cosines.map((cosineData) =>
                computeMetricsForMatrix(cosineData.cosine, modelLabels)
            ),
            levenshteinNormalized: computeMetricsForMatrix(evaluationData.levenshteinNormalized, modelLabels),
            jaccard: computeMetricsForMatrix(evaluationData.jaccard, modelLabels),
        },
        projectSettings,
        metadata: {
            exportedAt: new Date().toISOString(),
            modelLabels,
            modelCount: evaluationData.models.length,
        },
    };

    const defaultFilename = `evaluation-${simpleDateFormat()}.json`;
    downloadFile(JSON.stringify(exportData, null, 2), filename || defaultFilename, 'application/json');
}
