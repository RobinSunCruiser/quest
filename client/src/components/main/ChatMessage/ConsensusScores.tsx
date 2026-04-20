/**
 * @fileoverview Component for displaying consensus scores (C_LE, C_μoff, C_S, C_S^norm)
 * under chat messages in a compact, informative format.
 * @module Components.Main.ChatMessage.ConsensusScores
 */

import { Badge, Group, Text, Tooltip } from '@mantine/core';
import { useMemo } from 'react';
import { ConsensusAnalyzer } from '@/utils/consensus';

/**
 * Props for the ConsensusScores component.
 */
interface ConsensusScoresProps {
    /** Similarity matrix for consensus calculation */
    similarityMatrix: number[][] | null;
    /** Array of model labels */
    modelLabels: string[] | null;
    /** Threshold for μ (upper triangular mean) - above this is good consensus */
    muThreshold: number;
    /** Threshold for σ (standard deviation) - below this is good consensus */
    sigmaThreshold: number;
}

/**
 * Displays consensus metrics in a compact format under chat messages.
 * Shows C_LE, C_μoff, C_S, and C_S^norm values when similarity data is available.
 *
 * @param props - Component props
 * @returns JSX element with consensus scores or null if no data
 */
export const ConsensusScores: React.FC<ConsensusScoresProps> = ({ similarityMatrix, modelLabels, muThreshold, sigmaThreshold }) => {
    const consensusData = useMemo(() => {
        if (!similarityMatrix || !modelLabels || similarityMatrix.length === 0 || modelLabels.length === 0) {
            return null;
        }

        const analyzer = new ConsensusAnalyzer();
        const metrics = analyzer.computeMetrics(similarityMatrix, modelLabels);

        return {
            c_le: metrics.leading_eigenvalue_total_percentage,
            c_muoff: metrics.upper_triangular_mean,
            c_muoff_std: metrics.upper_triangular_std,
            c_s: metrics.silhouette_score,
            c_snorm: metrics.normalized_silhouette_score,
        };
    }, [similarityMatrix, modelLabels]);

    if (!consensusData) {
        return null;
    }

    // Determine if consensus is good based on thresholds
    const isGoodConsensus = consensusData.c_muoff >= muThreshold && consensusData.c_muoff_std <= sigmaThreshold;

    // Choose colors and styling based on consensus quality
    const backgroundColor = isGoodConsensus ? 'var(--mantine-color-green-0)' : 'var(--mantine-color-red-0)';
    const borderColor = isGoodConsensus ? 'var(--mantine-color-green-3)' : 'var(--mantine-color-red-3)';
    const headerColor = isGoodConsensus ? 'green.8' : 'red.8';
    const shadowColor = isGoodConsensus ? 'rgba(34, 139, 34, 0.15)' : 'rgba(220, 20, 60, 0.15)';

    return (
        <Group
            gap="xs"
            mt="xs"
            px="sm"
            py="xs"
            wrap="nowrap"
            style={{
                backgroundColor,
                borderRadius: '6px',
                border: `1px solid ${borderColor}`,
                boxShadow: `0 1px 4px ${shadowColor}`,
                margin: '2px 4px',
            }}
        >
            <Text size="xs" fw={600} c={headerColor} style={{ whiteSpace: 'nowrap' }}>
                {isGoodConsensus ? 'High' : 'Low'} Consensus:
            </Text>

            <Text size="xs" fw={500} c={headerColor} style={{ whiteSpace: 'nowrap' }}>
                μ={consensusData.c_muoff.toFixed(3)}, σ={consensusData.c_muoff_std.toFixed(3)}
            </Text>

            <Tooltip label="Leading Eigenvalue - measures overall consensus strength (0-1)" withArrow position="top">
                <Badge variant="light" size="md" style={{ cursor: 'help' }}>
                    C<sub>LE</sub>: {consensusData.c_le.toFixed(3)}
                </Badge>
            </Tooltip>

            <Tooltip label="Mean Upper Triangular - average pairwise similarity (0-1)" withArrow position="top">
                <Badge variant="light" size="md" style={{ cursor: 'help' }}>
                    C<sub>μoff</sub>: {consensusData.c_muoff.toFixed(3)}
                </Badge>
            </Tooltip>

            <Tooltip label="Silhouette Score - cluster separation quality (-1 to 1)" withArrow position="top">
                <Badge variant="light" size="md" style={{ cursor: 'help' }}>
                    C<sub>S</sub>: {consensusData.c_s.toFixed(3)}
                </Badge>
            </Tooltip>

            <Tooltip label="Normalized Silhouette Score - scaled by standard deviation" withArrow position="top">
                <Badge variant="light" size="md" style={{ cursor: 'help' }}>
                    C<sub>S</sub>
                    <sup>n</sup>: {consensusData.c_snorm.toFixed(3)}
                </Badge>
            </Tooltip>
        </Group>
    );
};
