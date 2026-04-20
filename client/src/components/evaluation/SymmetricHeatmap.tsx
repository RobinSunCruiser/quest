/**
 * @fileoverview Interactive heatmap component for visualizing similarity matrices between model outputs.
 * Provides click-to-compare functionality with side-by-side message viewing and customizable color scaling.
 * @module Components.Evaluation.SymmetricHeatmap
 */

import { Box, Card, Group, Modal, NumberInput, Space, Stack, Switch, Text, Tooltip } from '@mantine/core';
import { ActionIcon } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';
import { roundToDecimal } from '@/utils';

/**
 * Configuration properties for the SymmetricHeatmap component.
 */
interface SymmetricHeatmapProps {
    /** Labels for both x and y axes (typically model names) */
    labels: string[];
    /** 2D array of similarity values forming a square matrix */
    values: number[][];
    /** Optional normalized values matrix - if provided, shows toggle switch */
    normalizedValues?: number[][];
    /** Message contents corresponding to each label for comparison modal */
    messages: string[];
    /** Optional title displayed above the heatmap */
    title?: string;
    /** Chart height in pixels @default 350 */
    sizePx?: number;
    /** Number of color scale divisions from white to red @default 30 */
    subDivisions?: number;
    /** Decimal places for value display @default 2 */
    decimalScale?: number;
}

/**
 * Interactive heatmap component for visualizing similarity matrices between model outputs.
 *
 * Features click-to-compare functionality that opens a modal with side-by-side message content.
 * Supports customizable color scaling, decimal precision, and markdown rendering in comparisons.
 *
 * @param props - Component configuration
 * @returns Rendered heatmap with interactive comparison capabilities
 *
 * @example
 * ```tsx
 * <SymmetricHeatmap
 *   labels={['GPT-4', 'Claude', 'Llama']}
 *   values={[[1.0, 0.85, 0.72], [0.85, 1.0, 0.79], [0.72, 0.79, 1.0]]}
 *   messages={['Response 1', 'Response 2', 'Response 3']}
 *   title="Cosine Similarity"
 * />
 * ```
 */
export const SymmetricHeatmap: React.FC<SymmetricHeatmapProps> = ({ labels, values, normalizedValues, title, decimalScale = 2, messages, sizePx = 350, subDivisions = 30 }) => {
    // Component state for UI controls and modal
    const [chartLabels, setChartLabels] = useState(labels);
    const [renderMarkdown, setRenderMarkdown] = useState(true);
    const [useNormalized, setUseNormalized] = useState(false);
    const [localMinValue, setLocalMinValue] = useState<number | ''>();
    const [localMaxValue, setLocalMaxValue] = useState<number | ''>();
    const [localSubDivisions, setLocalSubDivisions] = useState<number | ''>();
    const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
    const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
    const [decimals, setDecimal] = useState(decimalScale);

    // Sync internal state with prop changes
    useEffect(() => {
        setDecimal(decimalScale);
    }, [decimalScale]);

    useEffect(() => {
        setChartLabels(labels);
    }, [labels]);

    /**
     * Determines which values to display based on normalization toggle.
     */
    const displayValues = useMemo(() => {
        return useNormalized && normalizedValues ? normalizedValues : values;
    }, [useNormalized, normalizedValues, values]);

    /**
     * Updates title to indicate normalization status.
     */
    const displayTitle = useMemo(() => {
        return useNormalized && normalizedValues ? `${title} (Normalized)` : title;
    }, [useNormalized, normalizedValues, title]);

    /**
     * Calculates the effective min/max values for color scale mapping.
     * Uses user overrides when provided, otherwise derives from data.
     *
     * @returns Tuple of [minValue, maxValue] for color scaling
     */
    const [minValue, maxValue] = useMemo(() => {
        const flat = displayValues.flat();
        const min = typeof localMinValue === 'number' ? localMinValue : roundToDecimal(Math.min(...flat), decimals);
        const max = typeof localMaxValue === 'number' ? localMaxValue : roundToDecimal(Math.max(...flat), decimals);
        return [min, max];
    }, [displayValues, decimals, localMaxValue, localMinValue]);

    /**
     * Handles heatmap cell selection to open comparison modal.
     * Uses setTimeout to prevent event handling conflicts with chart library.
     */
    const handleDataPointSelection = useCallback((_event: any, _chartContext: any, config: any) => {
        const { seriesIndex, dataPointIndex } = config;
        setTimeout(() => {
            setSelectedCell({ row: seriesIndex, col: dataPointIndex });
            setIsCompareModalOpen(true);
        }, 0);
    }, []);

    /**
     * Closes the comparison modal with smooth transition.
     */
    const handleModalClose = useCallback(() => {
        setIsCompareModalOpen(false);
        setTimeout(() => setSelectedCell(null), 300);
    }, []);

    /**
     * Generates red color intensity for heatmap visualization.
     *
     * @param i - Current step in color range
     * @param total - Total number of color steps
     * @returns RGB color string with varying red intensity
     */
    const getRedShade = (i: number, total: number) => {
        const intensity = Math.round(255 - (i / (total - 1)) * 190);
        return `rgb(255,${intensity},${intensity})`;
    };

    /**
     * Generates color ranges for heatmap based on min/max values and subdivisions.
     * Creates gradient from white (min) to deep red (max).
     */
    const redRanges = useMemo(() => {
        const ranges = [];
        const steps = typeof localSubDivisions === 'number' ? Math.max(2, localSubDivisions) : subDivisions;
        const stepSize = (maxValue - minValue) / steps;

        for (let i = 0; i < steps; i++) {
            ranges.push({
                from: minValue + i * stepSize,
                to: i === steps - 1 ? maxValue : minValue + (i + 1) * stepSize,
                color: getRedShade(i, steps),
                name: `Level ${i + 1}`,
            });
        }
        return ranges;
    }, [minValue, maxValue, localSubDivisions, subDivisions]);

    /**
     * ApexCharts configuration with custom styling and interaction handlers.
     */
    const chartOptions = useMemo(
        () => ({
            chart: {
                id: displayTitle,

                fontFamily: 'inherit',
                animations: { enabled: false },
                events: { dataPointSelection: handleDataPointSelection },
            },
            legend: { show: false },
            title: {
                text: displayTitle,
                align: 'left' as const,
                style: { fontSize: '18px', fontWeight: '600', fontFamily: 'inherit' },
            },
            xaxis: {
                categories: chartLabels,
                labels: {
                    rotate: -45,
                    style: { fontSize: '12px', fontFamily: 'inherit' },
                },
            },
            yaxis: {
                categories: chartLabels,
                labels: { style: { fontSize: '12px', fontFamily: 'inherit' } },
            },
            dataLabels: {
                enabled: true,
                style: { colors: ['#000000'], fontSize: '11px', fontFamily: 'inherit' },
                formatter: (value: number) => value.toFixed(decimals),
            },
            tooltip: {
                enabled: true,
                theme: 'light',
                y: { formatter: (_value: number) => 'Click to compare messages' },
            },
            plotOptions: {
                heatmap: {
                    enableShades: false,
                    colorScale: {
                        ranges: redRanges,
                        min: minValue,
                        max: maxValue,
                    },
                },
            },
        }),
        [chartLabels, displayTitle, handleDataPointSelection, minValue, maxValue, redRanges, decimals]
    );

    /**
     * Transforms raw data into ApexCharts series format.
     * Each row becomes a series with x/y coordinate pairs.
     */
    const chartSeries = useMemo(
        () =>
            labels.map((label, i) => ({
                name: label,
                data: displayValues[i].map((value, j) => ({
                    x: labels[j],
                    y: roundToDecimal(value, decimals),
                })),
            })),
        [labels, displayValues, decimals]
    );

    /**
     * Renders the comparison modal content with side-by-side message display.
     * Supports both markdown and plain text rendering based on user preference.
     */
    const modalContent = useMemo(() => {
        if (!selectedCell || !isCompareModalOpen) return null;

        const rowLabel = labels[selectedCell.row];
        const colLabel = labels[selectedCell.col];
        const rowContent = messages[selectedCell.row] || 'Message content not available';
        const colContent = messages[selectedCell.col] || 'Message content not available';

        return (
            <Stack gap={'xs'} p="sm">
                <Group justify="space-around" align="center">
                    <Text fw={600}>{rowLabel}</Text>
                    <Switch
                        label="Render Markdown"
                        labelPosition="left"
                        checked={renderMarkdown}
                        onChange={(event) => setRenderMarkdown(event.currentTarget.checked)}
                        aria-label="Toggle markdown rendering"
                    />
                    <Text fw={600}>{colLabel}</Text>
                </Group>

                <Group grow align="flex-start" gap="sm">
                    <Card
                        shadow="sm"
                        p="md"
                        radius="md"
                        withBorder
                        bg="blue.0"
                        style={{ flex: 1, overflow: 'auto', maxHeight: '70vh' }}
                        aria-label={`${rowLabel} response content`}
                    >
                        {renderMarkdown ? (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p: ({ node, ...props }) => <p style={{ margin: 0, padding: 0 }} {...props} />,
                                    code: ({ node, inline, ...props }: any) =>
                                        inline ? (
                                            <code {...props} style={{ whiteSpace: 'normal', overflowWrap: 'break-word' }} />
                                        ) : (
                                            <code {...props} style={{ display: 'block', whiteSpace: 'pre-wrap', overflowX: 'auto', maxWidth: '100%' }} />
                                        ),
                                    pre: ({ node, ...props }) => <pre {...props} style={{ whiteSpace: 'pre-wrap', overflowX: 'auto', maxWidth: '100%' }} />,
                                }}
                            >
                                {rowContent}
                            </ReactMarkdown>
                        ) : (
                            <Text style={{ whiteSpace: 'pre-wrap' }}>{rowContent}</Text>
                        )}
                    </Card>

                    <Card
                        shadow="sm"
                        p="md"
                        radius="md"
                        withBorder
                        bg="blue.0"
                        style={{ flex: 1, overflow: 'auto', maxHeight: '70vh' }}
                        aria-label={`${colLabel} response content`}
                    >
                        {renderMarkdown ? (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p: ({ node, ...props }) => <p style={{ margin: 0, padding: 0 }} {...props} />,
                                    code: ({ node, inline, ...props }: any) =>
                                        inline ? (
                                            <code {...props} style={{ whiteSpace: 'normal', overflowWrap: 'break-word' }} />
                                        ) : (
                                            <code {...props} style={{ display: 'block', whiteSpace: 'pre-wrap', overflowX: 'auto', maxWidth: '100%' }} />
                                        ),
                                    pre: ({ node, ...props }) => <pre {...props} style={{ whiteSpace: 'pre-wrap', overflowX: 'auto', maxWidth: '100%' }} />,
                                }}
                            >
                                {colContent}
                            </ReactMarkdown>
                        ) : (
                            <Text style={{ whiteSpace: 'pre-wrap' }}>{colContent}</Text>
                        )}
                    </Card>
                </Group>
            </Stack>
        );
    }, [selectedCell, isCompareModalOpen, labels, messages, renderMarkdown]);

    return (
        <Card shadow="sm" padding="xs" radius="lg" withBorder aria-label={`${title || 'Similarity'} heatmap visualization`}>
            <Stack gap="xs">
                <Box>
                    <Chart options={chartOptions} series={chartSeries} type="heatmap" height={sizePx} width="100%" aria-label={`${title || 'Similarity'} heatmap visualization`} />
                </Box>

                <Group justify="space-between">
                    {normalizedValues && (
                        <Tooltip label="Toggle between raw distance values and normalized similarity (1 - val/max)" position="bottom" withArrow>
                            <Group gap="xs" align="center">
                                <Text size="xs">Normalize</Text>
                                <Switch size="xs" checked={useNormalized} onChange={(event) => setUseNormalized(event.currentTarget.checked)} aria-label="Toggle normalization" />
                            </Group>
                        </Tooltip>
                    )}
                    {!normalizedValues && <Space h={0} />}
                    <Group gap="xs">
                        <Tooltip label="Sets the lowest value in the color scale (white). Leave empty to use the data's minimum value." position="bottom" withArrow>
                            <Group gap={'0'} align="center">
                                <NumberInput
                                    w={90}
                                    label="Min (White)"
                                    placeholder={minValue.toString()}
                                    size="xs"
                                    step={0.1}
                                    decimalScale={2}
                                    value={localMinValue}
                                    onChange={(val) => {
                                        if (typeof val === 'number') {
                                            setLocalMinValue(val);
                                        }
                                        if (val === '') {
                                            setLocalMinValue('');
                                        }
                                    }}
                                    allowDecimal
                                    hideControls
                                    rightSection={
                                        localMinValue !== '' ? (
                                            <ActionIcon
                                                size="xs"
                                                variant="subtle"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setLocalMinValue('');
                                                }}
                                                tabIndex={-1}
                                            >
                                                <Text>×</Text>
                                            </ActionIcon>
                                        ) : null
                                    }
                                />
                            </Group>
                        </Tooltip>

                        <Tooltip label="Sets the highest value in the color scale (deep red). Leave empty to use the data's maximum value." position="bottom" withArrow>
                            <Group align="center" gap={0}>
                                <NumberInput
                                    w={90}
                                    label="Max (Red)"
                                    placeholder={maxValue.toString()}
                                    size="xs"
                                    step={0.1}
                                    decimalScale={2}
                                    value={localMaxValue}
                                    onChange={(val) => {
                                        if (typeof val === 'number') {
                                            setLocalMaxValue(val);
                                        }
                                        if (val === '') {
                                            setLocalMaxValue('');
                                        }
                                    }}
                                    allowDecimal
                                    hideControls
                                    rightSection={
                                        localMaxValue !== '' ? (
                                            <ActionIcon
                                                size="xs"
                                                variant="subtle"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setLocalMaxValue('');
                                                }}
                                                tabIndex={-1}
                                            >
                                                <Text>×</Text>
                                            </ActionIcon>
                                        ) : null
                                    }
                                />
                            </Group>
                        </Tooltip>

                        <Tooltip label="Sets the number of color divisions from white to red (2-190). Leave empty to use the default value (30)." position="bottom" withArrow>
                            <Group align="center" gap={0}>
                                <NumberInput
                                    w={'4rem'}
                                    label="Divisions"
                                    placeholder={subDivisions.toString()}
                                    size="xs"
                                    clampBehavior="strict"
                                    min={1}
                                    max={190}
                                    step={1}
                                    decimalScale={0}
                                    value={localSubDivisions}
                                    onChange={(val) => {
                                        if (typeof val === 'number') {
                                            setLocalSubDivisions(val);
                                        }
                                        if (val === '') {
                                            setLocalSubDivisions('');
                                        }
                                    }}
                                    hideControls
                                    rightSection={
                                        localSubDivisions !== '' ? (
                                            <ActionIcon
                                                size="xs"
                                                variant="subtle"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setLocalSubDivisions('');
                                                }}
                                            >
                                                <Text>×</Text>
                                            </ActionIcon>
                                        ) : null
                                    }
                                />
                            </Group>
                        </Tooltip>
                    </Group>
                </Group>
            </Stack>

            {isCompareModalOpen && (
                <Modal
                    opened={true}
                    onClose={handleModalClose}
                    size="60rem"
                    centered
                    withinPortal={true}
                    overlayProps={{ opacity: 0.55, blur: 3 }}
                    aria-label="Message comparison"
                    title={`Comparing:`}
                >
                    {modalContent}
                </Modal>
            )}
        </Card>
    );
};
