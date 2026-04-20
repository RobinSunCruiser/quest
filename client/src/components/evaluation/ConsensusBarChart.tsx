import { Card, Group, SegmentedControl, Stack } from '@mantine/core';
import React, { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { ConsensusAnalyzer } from '@/utils/consensus';

interface ConsensusChartProps {
    cosineMatrix?: number[][];
    jaccardMatrix?: number[][];
    levenshteinMatrix?: number[][];
    llmLabels?: string[];
}

const ConsensusChart: React.FC<ConsensusChartProps> = ({ cosineMatrix, jaccardMatrix, levenshteinMatrix, llmLabels }) => {
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

    // Use ConsensusAnalyzer to compute metrics - memoized to prevent re-calculation
    const consensusData = useMemo(() => {
        if (!similarityMatrix || !llmLabels || similarityMatrix.length === 0 || llmLabels.length === 0) {
            return null;
        }

        const analyzer = new ConsensusAnalyzer();
        const metrics = analyzer.computeMetrics(similarityMatrix, llmLabels);

        return {
            c_le_values: [metrics.leading_eigenvalue_total_percentage],
            c_snorm_values: [metrics.normalized_silhouette_score],
            c_muoff_values: [metrics.upper_triangular_mean],
            c_muoff_std_values: [metrics.upper_triangular_std],
        };
    }, [similarityMatrix, llmLabels]);

    // Memoize plotData and plotLayout to prevent Plotly recreation on every render
    const plotData = useMemo(() => {
        if (!consensusData) return [];

        const categories = ['Current Question'];
        const { c_le_values, c_snorm_values, c_muoff_values, c_muoff_std_values } = consensusData;

        return [
            // orange bars: C_LE (horizontal bars)
            {
                y: categories,
                x: c_le_values,
                type: 'bar' as const,
                name: 'C<sub>LE</sub>',
                marker: { color: 'orange' },
                orientation: 'h' as const,
                xaxis: 'x1',
                width: 0.15,
                offset: -0.2,
            },
            // green bars: C_S^n (horizontal bars, uses top x-axis)
            {
                y: categories,
                x: c_snorm_values,
                type: 'bar' as const,
                name: 'C<sub>S</sub><sup>n</sup>',
                marker: { color: 'green' },
                orientation: 'h' as const,
                xaxis: 'x2',
                width: 0.15,
                offset: 0.05,
            },
            // blue scatter points with error bars: C_μoff (horizontal)
            {
                y: categories,
                x: c_muoff_values,
                type: 'scatter' as const,
                mode: 'markers' as const,
                name: 'C<sub>μoff</sub> (μ,σ)',
                marker: { color: 'blue', size: 8 },
                error_x: {
                    type: 'data' as const,
                    array: c_muoff_std_values,
                    arrayminus: c_muoff_std_values,
                    visible: true,
                    color: 'blue',
                    thickness: 2,
                    width: 3,
                },
                xaxis: 'x1',
            },
        ];
    }, [consensusData]);

    const plotLayout = useMemo(
        () => {
            const metricName = selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1);
            return {
            barmode: 'group' as const,
            title: {
                text: `Consensus scores (${metricName})`,
                x: 0.01,
                font: { weight: 700 },
            },
            yaxis: {
                showticklabels: false, // Hide the "Current Question" label
                fixedrange: true,
            },
            xaxis: {
                title: { text: 'Consensus scores C<sub>LE</sub> and C<sub>μoff</sub>' },
                domain: [0, 1],
                range: [0, 1],
                side: 'bottom' as const,
            },
            xaxis2: {
                title: { text: 'Normalised Silhouette score C<sub>S</sub><sup>n</sup>' },
                domain: [0, 1],
                range: [0, 14],
                side: 'top' as const,
                overlaying: 'x' as const,
            },
            legend: {
                orientation: 'h' as const,
                y: -0.1,
            },
            margin: {
                l: 60,
                r: 60,
                b: 80, // Increased bottom margin to prevent legend overlap
                t: 90, // Extra top margin for second x-axis
            },
            showlegend: true,
        };
        },
        [selectedMetric]
    );

    const plotConfig = useMemo(
        () => ({
            responsive: true,
            mathjax: true,
        }),
        []
    );

    // Only render if we have data
    if (!consensusData) {
        return null;
    }

    return (
        <Card shadow="sm" padding="xs" radius="lg" withBorder aria-label={`Consensus scores and silhouette values`}>
            <Stack gap="xs">
                <Plot data={plotData} layout={plotLayout} config={plotConfig} style={{ width: '100%', height: '400px' }} />
                <Group justify="flex-end">
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
        </Card>
    );
};

export default ConsensusChart;
