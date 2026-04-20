import { Matrix, EigenvalueDecomposition } from 'ml-matrix';

interface ConsensusResults {
    mean_pairwise_similarity: number;
    mean_pairwise_similarity_std: number;
    upper_triangular_mean: number;
    upper_triangular_std: number;
    leading_eigenvalue: number;
    leading_eigenvalue_percentage: number;
    leading_eigenvalue_total_percentage: number;
    eigenvalues: number[];
    silhouette_score: number;
    normalized_silhouette_score: number;
    davies_bouldin_score: number;
    calinski_harabasz_score: number;
    silhouette_scores: { [key: string]: ClusteringResult };
    labels: number[];
    llms: string[];
}

interface ClusteringResult {
    labels: string;
    silhouette_score: number;
    davies_bouldin_score: number;
    calinski_harabasz_score: number;
    entropy: number;
}

class ConsensusAnalyzer {
    /**
     * Normalize cluster labels to smallest integers
     */
    normalizeToSmallestIntegers(labels: number[]): number[] {
        const uniqueLabels = [...new Set(labels)].sort((a, b) => a - b);
        const labelMap = new Map<number, number>();

        let idx = 0;
        for (const label of uniqueLabels) {
            if (label !== -1) {
                labelMap.set(label, idx++);
            }
        }

        return labels.map((label) => labelMap.get(label) ?? -1);
    }

    /**
     * Calculate silhouette score for precomputed distance matrix
     */
    silhouetteScore(distanceMatrix: number[][], labels: number[]): number {
        const n = labels.length;
        const normalizedLabels = this.normalizeToSmallestIntegers(labels);
        const clusters = new Set(normalizedLabels.filter((l) => l !== -1));

        if (clusters.size < 2) return 0;

        let totalScore = 0;
        let validPoints = 0;

        for (let i = 0; i < n; i++) {
            if (normalizedLabels[i] === -1) continue;

            // Calculate a(i) - mean distance to points in same cluster
            const sameCluster = normalizedLabels.filter((label, idx) => label === normalizedLabels[i] && idx !== i);

            let a = 0;
            if (sameCluster.length > 0) {
                for (let j = 0; j < n; j++) {
                    if (j !== i && normalizedLabels[j] === normalizedLabels[i]) {
                        a += distanceMatrix[i][j];
                    }
                }
                a /= sameCluster.length;
            }

            // Calculate b(i) - mean distance to nearest cluster
            let b = Infinity;
            for (const cluster of clusters) {
                if (cluster === normalizedLabels[i]) continue;

                let clusterDist = 0;
                let clusterSize = 0;
                for (let j = 0; j < n; j++) {
                    if (normalizedLabels[j] === cluster) {
                        clusterDist += distanceMatrix[i][j];
                        clusterSize++;
                    }
                }

                if (clusterSize > 0) {
                    b = Math.min(b, clusterDist / clusterSize);
                }
            }

            if (b !== Infinity) {
                // Handle single-point clusters like sklearn: assign score of 0
                let s = 0;
                if (sameCluster.length > 0) {
                    // Only calculate silhouette if point has cluster neighbors
                    s = (b - a) / Math.max(a, b);
                }
                totalScore += s;
                validPoints++;
            }
        }

        return validPoints > 0 ? totalScore / validPoints : 0;
    }

    /**
     * Calculate Davies-Bouldin score
     */
    daviesBouldinScore(similarityMatrix: number[][], labels: number[]): number {
        const normalizedLabels = this.normalizeToSmallestIntegers(labels);
        const clusters = [...new Set(normalizedLabels.filter((l) => l !== -1))];

        if (clusters.length < 2) return 0;

        const centroids: number[][] = [];
        const clusterSizes: number[] = [];

        // Calculate centroids
        for (const cluster of clusters) {
            const clusterPoints: number[][] = [];
            for (let i = 0; i < normalizedLabels.length; i++) {
                if (normalizedLabels[i] === cluster) {
                    clusterPoints.push(similarityMatrix[i]);
                }
            }

            const centroid = new Array(similarityMatrix[0].length).fill(0);
            for (const point of clusterPoints) {
                for (let j = 0; j < point.length; j++) {
                    centroid[j] += point[j];
                }
            }
            for (let j = 0; j < centroid.length; j++) {
                centroid[j] /= clusterPoints.length;
            }

            centroids.push(centroid);
            clusterSizes.push(clusterPoints.length);
        }

        // Calculate within-cluster scatter
        const scatters: number[] = [];
        for (let c = 0; c < clusters.length; c++) {
            let scatter = 0;
            let count = 0;

            for (let i = 0; i < normalizedLabels.length; i++) {
                if (normalizedLabels[i] === clusters[c]) {
                    let dist = 0;
                    for (let j = 0; j < similarityMatrix[i].length; j++) {
                        dist += Math.pow(similarityMatrix[i][j] - centroids[c][j], 2);
                    }
                    scatter += Math.sqrt(dist);
                    count++;
                }
            }

            scatters.push(count > 0 ? scatter / count : 0);
        }

        // Calculate Davies-Bouldin score
        let dbScore = 0;
        for (let i = 0; i < clusters.length; i++) {
            let maxRatio = 0;

            for (let j = 0; j < clusters.length; j++) {
                if (i !== j) {
                    let centroidDist = 0;
                    for (let k = 0; k < centroids[i].length; k++) {
                        centroidDist += Math.pow(centroids[i][k] - centroids[j][k], 2);
                    }
                    centroidDist = Math.sqrt(centroidDist);

                    if (centroidDist > 0) {
                        const ratio = (scatters[i] + scatters[j]) / centroidDist;
                        maxRatio = Math.max(maxRatio, ratio);
                    }
                }
            }

            dbScore += maxRatio;
        }

        return dbScore / clusters.length;
    }

    /**
     * Calculate Calinski-Harabasz score
     */
    calinskiHarabaszScore(similarityMatrix: number[][], labels: number[]): number {
        const normalizedLabels = this.normalizeToSmallestIntegers(labels);
        const clusters = [...new Set(normalizedLabels.filter((l) => l !== -1))];
        const n = normalizedLabels.length;

        if (clusters.length < 2) return 0;

        // Global centroid
        const globalCentroid = new Array(similarityMatrix[0].length).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < similarityMatrix[i].length; j++) {
                globalCentroid[j] += similarityMatrix[i][j];
            }
        }
        for (let j = 0; j < globalCentroid.length; j++) {
            globalCentroid[j] /= n;
        }

        // Cluster centroids and sizes
        const centroids: number[][] = [];
        const clusterSizes: number[] = [];

        for (const cluster of clusters) {
            const clusterPoints: number[][] = [];
            for (let i = 0; i < n; i++) {
                if (normalizedLabels[i] === cluster) {
                    clusterPoints.push(similarityMatrix[i]);
                }
            }

            const centroid = new Array(similarityMatrix[0].length).fill(0);
            for (const point of clusterPoints) {
                for (let j = 0; j < point.length; j++) {
                    centroid[j] += point[j];
                }
            }
            for (let j = 0; j < centroid.length; j++) {
                centroid[j] /= clusterPoints.length;
            }

            centroids.push(centroid);
            clusterSizes.push(clusterPoints.length);
        }

        // Between-cluster sum of squares
        let betweenSS = 0;
        for (let c = 0; c < clusters.length; c++) {
            let dist = 0;
            for (let j = 0; j < centroids[c].length; j++) {
                dist += Math.pow(centroids[c][j] - globalCentroid[j], 2);
            }
            betweenSS += clusterSizes[c] * dist;
        }

        // Within-cluster sum of squares
        let withinSS = 0;
        for (let i = 0; i < n; i++) {
            const clusterIdx = clusters.indexOf(normalizedLabels[i]);
            if (clusterIdx >= 0) {
                let dist = 0;
                for (let j = 0; j < similarityMatrix[i].length; j++) {
                    dist += Math.pow(similarityMatrix[i][j] - centroids[clusterIdx][j], 2);
                }
                withinSS += dist;
            }
        }

        if (withinSS === 0) return 0;

        return betweenSS / (clusters.length - 1) / (withinSS / (n - clusters.length));
    }

    /**
     * Calculate entropy of cluster labels
     */
    entropy(labels: number[]): number {
        const n = labels.length;
        const counts = new Map<number, number>();

        for (const label of labels) {
            counts.set(label, (counts.get(label) || 0) + 1);
        }

        let entropy = 0;
        for (const count of counts.values()) {
            if (count > 0) {
                const prob = count / n;
                entropy -= prob * Math.log(prob);
            }
        }

        return entropy;
    }

    /**
     * Agglomerative clustering using distance matrix
     */
    agglomerativeClustering(distanceMatrix: number[][], nClusters?: number): number[] {
        const n = distanceMatrix.length;
        if (!nClusters) nClusters = 2;

        // Initialize clusters - each point is its own cluster
        const clusters = Array.from({ length: n }, (_, i) => [i]);
        const distances = distanceMatrix.map((row) => [...row]);

        while (clusters.length > nClusters) {
            let minDist = Infinity;
            let mergeI = -1,
                mergeJ = -1;

            // Find closest clusters
            for (let i = 0; i < clusters.length; i++) {
                for (let j = i + 1; j < clusters.length; j++) {
                    // Calculate average linkage distance
                    let totalDist = 0;
                    let count = 0;

                    for (const pointI of clusters[i]) {
                        for (const pointJ of clusters[j]) {
                            totalDist += distances[pointI][pointJ];
                            count++;
                        }
                    }

                    const avgDist = totalDist / count;
                    if (avgDist < minDist) {
                        minDist = avgDist;
                        mergeI = i;
                        mergeJ = j;
                    }
                }
            }

            // Merge clusters
            if (mergeI >= 0 && mergeJ >= 0) {
                clusters[mergeI] = [...clusters[mergeI], ...clusters[mergeJ]];
                clusters.splice(mergeJ, 1);
            }
        }

        // Assign labels
        const labels = new Array(n);
        for (let i = 0; i < clusters.length; i++) {
            for (const point of clusters[i]) {
                labels[point] = i;
            }
        }

        return labels;
    }

    /**
     * Compute all consensus metrics
     */
    computeMetrics(similarityMatrix: number[][], llmLabels: string[]): ConsensusResults {
        const n = similarityMatrix.length;
        const distanceMatrix = similarityMatrix.map((row) => row.map((val) => 1 - val));

        // Mean Pairwise Similarity (off-diagonal elements only)
        const offDiagonalValues: number[] = [];
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    offDiagonalValues.push(similarityMatrix[i][j]);
                }
            }
        }

        const meanPairwiseSimilarity = offDiagonalValues.reduce((a, b) => a + b, 0) / offDiagonalValues.length;
        const meanPairwiseSimilarityStd = Math.sqrt(offDiagonalValues.reduce((sum, val) => sum + Math.pow(val - meanPairwiseSimilarity, 2), 0) / offDiagonalValues.length);

        // Upper triangular values
        const upperTriangularValues: number[] = [];
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                upperTriangularValues.push(similarityMatrix[i][j]);
            }
        }

        const upperTriangularMean = upperTriangularValues.reduce((a, b) => a + b, 0) / upperTriangularValues.length;
        const upperTriangularStd = Math.sqrt(upperTriangularValues.reduce((sum, val) => sum + Math.pow(val - upperTriangularMean, 2), 0) / upperTriangularValues.length);

        // Eigenvalues
        const matrix = new Matrix(similarityMatrix);
        const eigen = new EigenvalueDecomposition(matrix);
        const eigenvalues = eigen.realEigenvalues.sort((a, b) => a - b);
        const leadingEigenvalue = Math.max(...eigenvalues);
        const leadingEigenvaluePercentage = (leadingEigenvalue / n) * 100;

        // Calculate C_LE as percentage of total eigenvalue sum
        const totalEigenvalueSum = eigenvalues.reduce((sum, val) => sum + Math.abs(val), 0);
        const leadingEigenvalueTotalPercentage = totalEigenvalueSum > 0 ? leadingEigenvalue / totalEigenvalueSum : 0;

        // Default clustering (2 clusters)
        const labels = this.agglomerativeClustering(distanceMatrix, 2);
        const silhouetteScore = this.silhouetteScore(distanceMatrix, labels);
        const normalizedSilhouetteScore = upperTriangularStd > 0 ? silhouetteScore / upperTriangularStd : 0;
        const daviesBouldinScore = this.daviesBouldinScore(similarityMatrix, labels);
        const calinskiHarabaszScore = this.calinskiHarabaszScore(similarityMatrix, labels);

        // Multiple cluster analysis
        const silhouetteScores: { [key: string]: ClusteringResult } = {};
        for (let k = 2; k < n; k++) {
            const clusterLabels = this.agglomerativeClustering(distanceMatrix, k);
            const normalizedProbs = clusterLabels.map((l) => l / n);

            silhouetteScores[k.toString()] = {
                labels: JSON.stringify(clusterLabels),
                silhouette_score: this.silhouetteScore(distanceMatrix, clusterLabels),
                davies_bouldin_score: this.daviesBouldinScore(similarityMatrix, clusterLabels),
                calinski_harabasz_score: this.calinskiHarabaszScore(similarityMatrix, clusterLabels),
                entropy: this.entropy(normalizedProbs),
            };
        }

        return {
            mean_pairwise_similarity: meanPairwiseSimilarity,
            mean_pairwise_similarity_std: meanPairwiseSimilarityStd,
            upper_triangular_mean: upperTriangularMean,
            upper_triangular_std: upperTriangularStd,
            leading_eigenvalue: leadingEigenvalue,
            leading_eigenvalue_percentage: leadingEigenvaluePercentage,
            leading_eigenvalue_total_percentage: leadingEigenvalueTotalPercentage,
            eigenvalues: eigenvalues,
            silhouette_score: silhouetteScore,
            normalized_silhouette_score: normalizedSilhouetteScore,
            davies_bouldin_score: daviesBouldinScore,
            calinski_harabasz_score: calinskiHarabaszScore,
            silhouette_scores: silhouetteScores,
            labels: labels,
            llms: llmLabels,
        };
    }

    /**
     * Multi-dimensional scaling (MDS) transformation
     */
    mds(distanceMatrix: number[][], dimensions: number = 2): number[][] {
        const n = distanceMatrix.length;

        // Double centering
        const J = Matrix.ones(n, n).mul(-1 / n);
        J.set(0, 0, J.get(0, 0) + 1);
        for (let i = 1; i < n; i++) {
            J.set(i, i, J.get(i, i) + 1);
        }

        const D2 = new Matrix(distanceMatrix.map((row) => row.map((val) => val * val)));

        const B = J.mmul(D2).mmul(J).mul(-0.5);

        // Eigenvalue decomposition
        const eigen = new EigenvalueDecomposition(B);
        const eigenvalues = eigen.realEigenvalues;
        const eigenvectors = eigen.eigenvectorMatrix;

        // Sort by eigenvalue magnitude
        const indices = eigenvalues
            .map((val, idx) => ({ val: Math.abs(val), idx }))
            .sort((a, b) => b.val - a.val)
            .slice(0, dimensions)
            .map((item) => item.idx);

        // Project to lower dimensions
        const coords: number[][] = [];
        for (let i = 0; i < n; i++) {
            const point: number[] = [];
            for (let j = 0; j < dimensions; j++) {
                const eigenIdx = indices[j];
                const eigenVal = Math.max(0, eigenvalues[eigenIdx]);
                point.push(eigenvectors.get(i, eigenIdx) * Math.sqrt(eigenVal));
            }
            coords.push(point);
        }

        return coords;
    }

    /**
     * Adjust coordinates to prevent overlapping points
     * Only adjusts points that are truly identical (same coordinates)
     * Automatically determines spread radius to be smaller than minimum distance between distinct points
     */
    adjustOverlappingPoints(coords: number[][], maxSpreadFactor: number = 0.25): number[][] {
        const adjustedCoords = coords.map((coord) => [...coord]);

        // Identify groups of truly identical points
        const identicalGroups = new Map<string, number[]>();
        coords.forEach((coord, idx) => {
            const key = `${coord[0].toFixed(10)},${coord[1].toFixed(10)}`;
            if (!identicalGroups.has(key)) {
                identicalGroups.set(key, []);
            }
            identicalGroups.get(key)!.push(idx);
        });

        // Find the minimum distance between any two distinct (non-identical) points globally
        let globalMinDist = Infinity;
        const uniqueCoords: number[][] = [];
        identicalGroups.forEach((_indices, key) => {
            const [x, y] = key.split(',').map(parseFloat);
            uniqueCoords.push([x, y]);
        });

        for (let i = 0; i < uniqueCoords.length; i++) {
            for (let j = i + 1; j < uniqueCoords.length; j++) {
                const dx = uniqueCoords[i][0] - uniqueCoords[j][0];
                const dy = uniqueCoords[i][1] - uniqueCoords[j][1];
                const dist = Math.sqrt(dx * dx + dy * dy);
                globalMinDist = Math.min(globalMinDist, dist);
            }
        }

        // Calculate maximum allowed spread radius to ensure it's smaller than smallest distinct separation
        const maxAllowedSpread = globalMinDist !== Infinity ? globalMinDist * maxSpreadFactor : 0.05;

        // Only spread points that are truly identical (multiple points at same location)
        identicalGroups.forEach((indices, key) => {
            if (indices.length > 1) {
                const [centerX, centerY] = key.split(',').map(parseFloat);

                // Use the global constraint
                const spreadRadius = maxAllowedSpread;

                // Spread points in a circle
                indices.forEach((idx, i) => {
                    const angle = (i * 2 * Math.PI) / indices.length;
                    adjustedCoords[idx][0] = centerX + spreadRadius * Math.cos(angle);
                    adjustedCoords[idx][1] = centerY + spreadRadius * Math.sin(angle);
                });
            }
        });

        return adjustedCoords;
    }
}

export { ConsensusAnalyzer };
