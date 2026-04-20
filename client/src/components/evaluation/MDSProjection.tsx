import { Card, Group, SegmentedControl, Stack } from '@mantine/core';
import React, { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { ConsensusAnalyzer } from '@/utils/consensus';
import { BATCH_SUFFIX_PATTERN, BATCH_SUFFIX } from '@/stores/modelSelectionStore';

interface MDSChartProps {
    cosineMatrix?: number[][];
    jaccardMatrix?: number[][];
    levenshteinMatrix?: number[][];
    llmLabels?: string[];
    llmFullIds?: string[];
}

type DisplayMode = 'labels' | 'legend';

const MDSChart: React.FC<MDSChartProps> = ({ cosineMatrix, jaccardMatrix, levenshteinMatrix, llmLabels, llmFullIds }) => {
    const [selectedMetric, setSelectedMetric] = useState<'cosine' | 'jaccard' | 'levenshtein'>('cosine');
    const [displayMode, setDisplayMode] = useState<DisplayMode>('labels');

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

    // Use ConsensusAnalyzer to compute MDS coordinates - memoized to prevent re-calculation
    const mdsData = useMemo(() => {
        if (!similarityMatrix || !llmLabels || similarityMatrix.length === 0 || llmLabels.length === 0) {
            return null;
        }

        const analyzer = new ConsensusAnalyzer();
        const distanceMatrix = similarityMatrix.map((row) => row.map((val) => 1 - val));
        const mdsCoordinates = analyzer.mds(distanceMatrix, 2);

        // Identify groups of identical points before adjustment
        const identicalGroups = new Map<string, number[]>();
        mdsCoordinates.forEach((coord, idx) => {
            const key = `${coord[0].toFixed(10)},${coord[1].toFixed(10)}`;
            if (!identicalGroups.has(key)) {
                identicalGroups.set(key, []);
            }
            identicalGroups.get(key)!.push(idx);
        });

        // Track which indices are part of identical groups and their position in the group
        const isIdenticalPoint = new Array(mdsCoordinates.length).fill(false);
        const groupPosition = new Array(mdsCoordinates.length).fill(0);
        const groupSize = new Array(mdsCoordinates.length).fill(1);

        identicalGroups.forEach((indices) => {
            if (indices.length > 1) {
                indices.forEach((idx, position) => {
                    isIdenticalPoint[idx] = true;
                    groupPosition[idx] = position;
                    groupSize[idx] = indices.length;
                });
            }
        });

        // Adjust overlapping points with adaptive spread radius
        const adjustedCoordinates = analyzer.adjustOverlappingPoints(mdsCoordinates, 0.3);

        // Use a smaller scale factor to preserve relative distances
        const scaleFactor = 1.5;
        const x = adjustedCoordinates.map((coord) => coord[0] * scaleFactor);
        const y = adjustedCoordinates.map((coord) => coord[1] * scaleFactor);
        const labels = llmLabels;

        // Use full IDs if provided, otherwise use labels
        const fullIds = llmFullIds || llmLabels;

        // Extract base model IDs and batch information from FULL IDs
        const modelInfo = fullIds.map((fullId, idx) => {
            const baseModelId = fullId.replace(BATCH_SUFFIX_PATTERN, '');
            // Create a regex to extract batch number using BATCH_SUFFIX constant (with capture group)
            const batchRegex = new RegExp(`${BATCH_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`);
            const batchMatch = fullId.match(batchRegex);
            const isBatchModel = BATCH_SUFFIX_PATTERN.test(fullId);
            const batchNumber = batchMatch ? parseInt(batchMatch[1], 10) : null;
            return { displayLabel: labels[idx], fullId, baseModelId, batchNumber, isBatchModel };
        });

        // Determine run numbers for all models
        const modelRunNumbers = new Map<string, number>();

        // Group models by base ID to understand batch structure
        const modelsByBase = new Map<string, typeof modelInfo>();
        modelInfo.forEach((info) => {
            if (!modelsByBase.has(info.baseModelId)) {
                modelsByBase.set(info.baseModelId, []);
            }
            modelsByBase.get(info.baseModelId)!.push(info);
        });

        // Assign run numbers based on batch structure
        modelsByBase.forEach((models) => {
            if (models.length > 1) {
                // Multiple models with same base - this is a batch scenario
                models.forEach((info) => {
                    if (info.isBatchModel && info.batchNumber !== null) {
                        // Batch suffix starts at 1, so add 1 to get actual run number
                        // __batch_1 -> Run 2, __batch_2 -> Run 3, etc.
                        modelRunNumbers.set(info.fullId, info.batchNumber + 1);
                    } else {
                        // Non-suffixed model is run 1
                        modelRunNumbers.set(info.fullId, 1);
                    }
                });
            }
            // If only one model with this base ID, don't show run number at all
        });

        // Create consistent color mapping based on base model ID with high contrast colors
        const uniqueBaseModels = Array.from(new Set(modelInfo.map((info) => info.baseModelId))).sort();

        // Simple hash function for deterministic color generation
        const hashString = (str: string): number => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = (hash << 5) - hash + str.charCodeAt(i);
                hash = hash & hash; // Convert to 32-bit integer
            }
            return Math.abs(hash);
        };

        // Generate highly visible, contrasting colors using HSL color space
        const generateDistinctColors = (count: number, seed: number): string[] => {
            const colors: string[] = [];
            const goldenRatioConjugate = 0.618033988749895;
            // Use seed to ensure consistent colors for same set of models
            let hue = (seed % 1000) / 1000;

            for (let i = 0; i < count; i++) {
                hue = (hue + goldenRatioConjugate) % 1;
                // Use high saturation (70-90%) and moderate lightness (45-55%) for visibility
                const saturation = 70 + (i % 3) * 10; // Vary between 70-90%
                const lightness = 45 + (i % 2) * 10; // Vary between 45-55%
                colors.push(`hsl(${Math.floor(hue * 360)}, ${saturation}%, ${lightness}%)`);
            }
            return colors;
        };

        // Create a seed from all model names to ensure consistency
        const seed = hashString(uniqueBaseModels.join('|'));
        const colorPalette = generateDistinctColors(uniqueBaseModels.length, seed);
        const colorMap = new Map<string, string>();
        uniqueBaseModels.forEach((baseModel, index) => {
            colorMap.set(baseModel, colorPalette[index]);
        });

        // Assign colors based on base model ID
        const colors = modelInfo.map((info) => colorMap.get(info.baseModelId) || 'gray');

        // Create hover text with batch information
        const hoverTexts = modelInfo.map((info, idx) => {
            const runNumber = modelRunNumbers.get(info.fullId);
            const batchInfo = runNumber !== undefined ? `<br>Batch Run: ${runNumber}` : '';
            const identicalInfo = isIdenticalPoint[idx] ? `<br><b>⚠ Identical response (${groupSize[idx]} models)</b>` : '';
            return `Model: ${info.baseModelId}${batchInfo}<br>X: ${x[idx].toFixed(3)}<br>Y: ${y[idx].toFixed(3)}${identicalInfo}`;
        });

        return { x, y, labels, colors, modelInfo, hoverTexts, uniqueBaseModels, colorMap, isIdenticalPoint, groupPosition, groupSize };
    }, [similarityMatrix, llmLabels, llmFullIds]);

    // Memoize plotData and plotLayout to prevent Plotly recreation on every render
    const plotData = useMemo(() => {
        if (!mdsData) return [];

        // Group data by base model for legend mode
        if (displayMode === 'legend') {
            const groupedData: {
                [key: string]: {
                    x: number[];
                    y: number[];
                    hoverTexts: string[];
                    symbols: string[];
                    sizes: number[];
                    color: string;
                    displayLabel: string;
                };
            } = {};

            mdsData.modelInfo.forEach((info, idx) => {
                if (!groupedData[info.baseModelId]) {
                    groupedData[info.baseModelId] = {
                        x: [],
                        y: [],
                        hoverTexts: [],
                        symbols: [],
                        sizes: [],
                        color: mdsData.colorMap.get(info.baseModelId) || 'gray',
                        displayLabel: info.displayLabel, // Use the display label from first occurrence
                    };
                }
                groupedData[info.baseModelId].x.push(mdsData.x[idx]);
                groupedData[info.baseModelId].y.push(mdsData.y[idx]);
                groupedData[info.baseModelId].hoverTexts.push(mdsData.hoverTexts[idx]);
                groupedData[info.baseModelId].symbols.push(mdsData.isIdenticalPoint[idx] ? 'circle-open' : 'x');
                groupedData[info.baseModelId].sizes.push(mdsData.isIdenticalPoint[idx] ? 10 : 12);
            });

            return Object.entries(groupedData).map(([baseModelId, data]) => ({
                x: data.x,
                y: data.y,
                type: 'scatter' as const,
                mode: 'markers' as const,
                name: data.displayLabel, // Use display label instead of baseModelId
                legendgroup: baseModelId,
                hovertemplate: '%{hovertext}<extra></extra>',
                hovertext: data.hoverTexts,
                marker: {
                    color: data.color,
                    size: data.sizes,
                    symbol: data.symbols,
                    line: {
                        width: 2,
                    },
                },
            }));
        }

        // Labels mode - show text labels on chart
        return [
            {
                x: mdsData.x,
                y: mdsData.y,
                text: mdsData.labels,
                type: 'scatter' as const,
                mode: 'text+markers' as const,
                textposition: 'top center' as const,
                hovertemplate: '%{hovertext}<extra></extra>',
                hovertext: mdsData.hoverTexts,
                marker: {
                    color: mdsData.colors,
                    size: mdsData.isIdenticalPoint.map((isIdentical) => (isIdentical ? 10 : 12)),
                    symbol: mdsData.isIdenticalPoint.map((isIdentical) => (isIdentical ? 'circle-open' : 'x')),
                    line: {
                        width: 2,
                    },
                },
                textfont: {
                    size: 12,
                    color: 'black',
                },
            },
        ];
    }, [mdsData, displayMode]);

    const plotLayout = useMemo(() => {
        const metricName = selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1);
        return {
            title: {
                text: `MDS Projection of LLM Response Similarities (${metricName})`,
                x: 0.01,
                font: { weight: 700 },
            },
            xaxis: {
                zeroline: false,
                showgrid: true,
            },
            yaxis: {
                zeroline: false,
                showgrid: true,
            },
            margin: {
                l: 50,
                r: displayMode === 'legend' ? 150 : 50,
                b: 50,
                t: 60,
            },
            showlegend: displayMode === 'legend',
            legend: {
                x: 1.02,
                y: 1,
                xanchor: 'left' as const,
                yanchor: 'top' as const,
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                bordercolor: '#ccc',
                borderwidth: 1,
            },
        };
    }, [selectedMetric, displayMode]);

    const plotConfig = useMemo(
        () => ({
            responsive: true,
            mathjax: true,
        }),
        []
    );

    // Only render if we have data
    if (!mdsData) {
        return null;
    }

    return (
        <Card shadow="sm" padding="xs" radius="lg" withBorder aria-label={`MDS Projection`}>
            <Stack gap="xs">
                <Plot data={plotData} layout={plotLayout} config={plotConfig} style={{ width: '100%', height: '500px' }} />
                <Group justify="space-between">
                    <SegmentedControl
                        size="xs"
                        color="blue"
                        value={displayMode}
                        onChange={(value) => setDisplayMode(value as DisplayMode)}
                        data={[
                            { label: 'Labels', value: 'labels' },
                            { label: 'Legend', value: 'legend' },
                        ]}
                    />
                    <SegmentedControl
                        size="xs"
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

export default MDSChart;
