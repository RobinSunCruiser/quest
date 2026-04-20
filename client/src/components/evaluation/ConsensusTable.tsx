/**
 * @fileoverview Component for displaying consensus metrics in a table format.
 * Shows C_LE, C_μoff, C_S, C_S^norm values in a nicely formatted table.
 * @module Components.Evaluation.ConsensusTable
 */

import { Table, Text, Stack, Title, Paper, SegmentedControl, Group } from '@mantine/core';
import { useMemo, useState } from 'react';
import { ConsensusAnalyzer } from '@/utils/consensus';
import { useAppSettingsStore } from '@/stores/appSettingsStore';

/**
 * Props for the ConsensusTable component.
 */
interface ConsensusTableProps {
    /** Cosine similarity matrix */
    cosineMatrix: number[][] | null;
    /** Jaccard similarity matrix */
    jaccardMatrix: number[][] | null;
    /** Levenshtein similarity matrix (normalized) */
    levenshteinMatrix: number[][] | null;
    /** Array of model labels */
    modelLabels: string[] | null;
}

/**
 * Displays consensus metrics in a table format.
 * Shows C_LE, C_μoff, C_S, and C_S^norm values when similarity data is available.
 *
 * @param props - Component props
 * @returns JSX element with consensus table or null if no data
 */
export const ConsensusTable: React.FC<ConsensusTableProps> = ({ cosineMatrix, jaccardMatrix, levenshteinMatrix, modelLabels }) => {
    const { consensusMuThreshold, consensusSigmaThreshold } = useAppSettingsStore();
    const [selectedMetric, setSelectedMetric] = useState<'cosine' | 'jaccard' | 'levenshtein'>('cosine');

    const similarityMatrix = useMemo(() => {
        switch (selectedMetric) {
            case 'cosine':
                return cosineMatrix;
            case 'jaccard':
                return jaccardMatrix;
            case 'levenshtein':
                return levenshteinMatrix;
            default:
                return cosineMatrix;
        }
    }, [selectedMetric, cosineMatrix, jaccardMatrix, levenshteinMatrix]);

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
    const isGoodConsensus = consensusData.c_muoff >= consensusMuThreshold && consensusData.c_muoff_std <= consensusSigmaThreshold;

    const rows = [
        {
            metric: (
                <span>
                    C<sub>LE</sub>
                </span>
            ),
            name: 'Leading Eigenvalue',
            value: consensusData.c_le.toFixed(3),
            description: 'Measures overall consensus strength (0-1)',
        },
        {
            metric: (
                <span>
                    C<sub>μoff</sub>
                </span>
            ),
            name: 'Mean Upper Triangular',
            value: consensusData.c_muoff.toFixed(3),
            description: 'Average pairwise similarity (0-1)',
        },
        {
            metric: (
                <span>
                    C<sub>S</sub>
                </span>
            ),
            name: 'Silhouette Score',
            value: consensusData.c_s.toFixed(3),
            description: 'Cluster separation quality (-1 to 1)',
        },
        {
            metric: (
                <span>
                    C<sub>S</sub>
                    <sup>n</sup>
                </span>
            ),
            name: 'Normalized Silhouette Score',
            value: consensusData.c_snorm.toFixed(3),
            description: 'Scaled by standard deviation',
        },
    ];

    return (
        <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
                <div>
                    <Title order={4} mb="xs">
                        Consensus Metrics
                    </Title>
                </div>

                <Table striped highlightOnHover withTableBorder>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Metric</Table.Th>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Value</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {rows.map((row, index) => (
                            <Table.Tr key={index}>
                                <Table.Td>
                                    <Text size="sm" fw={500}>
                                        {row.metric}
                                    </Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="sm">{row.name}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="sm" fw={600}>
                                        {row.value}
                                    </Text>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>

                <Text size="sm" c={isGoodConsensus ? 'green' : 'red'} fw={500}>
                    {isGoodConsensus ? 'High Consensus' : 'Low Consensus'}: μ={consensusData.c_muoff.toFixed(3)}, σ={consensusData.c_muoff_std.toFixed(3)}
                </Text>

                <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
                    Consensus quality is determined by μ ≥ {consensusMuThreshold} and σ ≤ {consensusSigmaThreshold}
                </Text>

                <Group justify="flex-end" mt="xs">
                    <SegmentedControl
                        size="sm"
                        color="blue"
                        value={selectedMetric}
                        onChange={(value) => setSelectedMetric(value as 'cosine' | 'jaccard' | 'levenshtein')}
                        data={[
                            { label: 'Cosine', value: 'cosine' },
                            { label: 'Jaccard', value: 'jaccard' },
                            { label: 'Levenshtein', value: 'levenshtein' },
                        ]}
                    />
                </Group>
            </Stack>
        </Paper>
    );
};
