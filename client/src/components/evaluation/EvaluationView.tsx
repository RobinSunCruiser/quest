/**
 * @fileoverview Presentational component for rendering evaluation modal UI with heatmaps,
 * model selection controls, and metric visualization options.
 * @module Components.Evaluation.EvaluationView
 */

import { Box, Center, Group, LoadingOverlay, Text, Modal, MultiSelect, Paper, Stack, Button, Tooltip, Badge, Switch, ScrollArea, Space } from '@mantine/core';
import { useMemo } from 'react';
import { FaAngleUp } from 'react-icons/fa';
import { TbFileExport } from 'react-icons/tb';
import { IMessageEvaluation } from '@root/server/src/interfaces/IMessageEvaluation';
import { SymmetricHeatmap } from '@/components/evaluation/SymmetricHeatmap';
import { ProcessedEvaluationData } from './types';

import MixedChart from './ConsensusBarChart';
import MDSChart from './MDSProjection';
import { ConsensusTable } from './ConsensusTable';

/**
 * Props for the EvaluationView component.
 * Delegates all business logic to parent container component.
 */
export interface EvaluationViewProps {
    /** Controls modal visibility */
    opened: boolean;
    /** Callback fired when modal is closed */
    onClose: () => void;
    /** Loading state indicator for async data operations */
    isLoading: boolean;
    /** Original evaluation data from server */
    data: IMessageEvaluation | undefined | null;
    /** Processed and filtered data ready for display */
    filteredData: ProcessedEvaluationData | null;
    /** Currently selected model IDs for comparison */
    selectedModels: string[];
    /** Whether to display full model IDs instead of formatted labels */
    showFullModelId: boolean;
    /** Controls visibility of collapsible options panel */
    showOptions: boolean;
    /** Whether to display embedding model identifiers in cosine titles */
    showEmbeddingID: boolean;
    /** Whether to render cosine similarity heatmaps */
    shouldShowCosine: boolean;
    /** Whether to render Levenshtein distance heatmap */
    shouldShowLevenshtein: boolean;
    /** Whether to render Jaccard similarity heatmap */
    shouldShowJaccard: boolean;
    /** Whether to show the consensus table */
    shouldShowTable: boolean;
    /** Whether to show the MDS projection chart */
    shouldShowMDS: boolean;
    /** Whether to show the consensus bar chart */
    shouldShowConsensusChart: boolean;
    /** Function to format model IDs for display (removes prefixes, suffixes) */
    formatModelLabel: (modelID: string) => string;
    /** Handler for model selection changes in MultiSelect */
    onModelSelectionChange: (models: string[]) => void;
    /** Handler for selecting all available models */
    onSelectAllModels: () => void;
    /** Handler for clearing all model selections */
    onClearAllModels: () => void;
    /** Handler for metric view segmented control changes */
    onMetricViewChange: (view: string) => void;
    /** Handler for toggling full model ID display */
    onShowFullModelIdToggle: (show: boolean) => void;
    /** Handler for toggling embedding ID display in titles */
    onShowEmbeddingIdToggle: (show: boolean) => void;
    /** Handler for toggling options panel visibility */
    onShowOptionsToggle: () => void;
    /** Handler for exporting evaluation data */
    onExport: () => void;
}

/**
 * Renders a modal dialog containing evaluation results with interactive heatmaps
 * and comparison controls. Supports cosine similarity, Levenshtein distance,
 * and Jaccard similarity metrics.
 *
 * Features:
 * - Collapsible options panel with model selection and display preferences
 * - Multiple metric visualization modes
 * - Scrollable heatmap area with responsive layout
 * - Accessibility support with ARIA labels and keyboard navigation
 * - Empty state handling for insufficient model selection
 *
 * @param props - Component props containing data, handlers, and display state
 * @returns JSX modal element with evaluation interface
 */
export const EvaluationView: React.FC<EvaluationViewProps> = ({
    opened,
    onClose,
    isLoading,
    data,
    filteredData,
    selectedModels,
    showFullModelId,
    showOptions,
    showEmbeddingID,
    shouldShowCosine,
    shouldShowLevenshtein,
    shouldShowJaccard,
    shouldShowTable,
    shouldShowMDS,
    shouldShowConsensusChart,
    formatModelLabel,
    onModelSelectionChange,
    onSelectAllModels,
    onClearAllModels,
    onMetricViewChange,
    onShowFullModelIdToggle,
    onShowEmbeddingIdToggle,
    onShowOptionsToggle,
    onExport,
}) => {
    // Memoize llmLabels arrays to prevent unnecessary re-renders
    const formattedLabels = useMemo(
        () => filteredData?.models.map((model) => (showFullModelId ? model.modelID : formatModelLabel(model.modelID))) || [],
        [filteredData?.models, showFullModelId, formatModelLabel]
    );

    const modelIdLabels = useMemo(() => filteredData?.models.map((model) => model.modelID) || [], [filteredData?.models]);

    const messages = useMemo(() => filteredData?.models.map((model) => model.message) || [], [filteredData?.models]);
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group justify="space-between" w="100%">
                    <Text>Evaluation Results</Text>
                    <Tooltip label="Export evaluation data with consensus metrics and MDS coordinates">
                        <Button
                            variant="subtle"
                            size="xs"
                            leftSection={<TbFileExport size={16} />}
                            onClick={onExport}
                            disabled={!data}
                        >
                            Export
                        </Button>
                    </Tooltip>
                </Group>
            }
            size="70rem"
            padding="md"
            centered
            transitionProps={{ duration: 200 }}
            withinPortal={true}
            closeButtonProps={{ size: 'xl' }}
            aria-label="Model Evaluation Results Modal"
        >
            <LoadingOverlay
                visible={isLoading}
                zIndex={1000}
                overlayProps={{
                    radius: 'sm',
                    blur: 2,
                    backgroundOpacity: 0.4,
                }}
                aria-label="Loading evaluation data"
            />

            {data && (
                <Stack gap={0} h="75vh">
                    {/* Collapsible options panel with smooth animations */}
                    <Group justify="center" align="center">
                        <Stack gap={0} w={'60rem'}>
                            <Group
                                justify="space-between"
                                onClick={onShowOptionsToggle}
                                px={'xs'}
                                py={'0.5rem'}
                                bg={'blue.0'}
                                style={{
                                    cursor: 'pointer',
                                    borderRadius: '8px 8px 0 0',
                                    borderBottom: showOptions ? '1px solid var(--mantine-color-gray-3)' : 'none',
                                    transition: 'all 0.2s ease',
                                }}
                                role="button"
                                aria-expanded={showOptions}
                                aria-controls="options-panel"
                                tabIndex={0}
                                aria-label="Toggle options panel"
                            >
                                <Group>
                                    <Text fw={600} size="sm">
                                        Options
                                    </Text>
                                </Group>
                                <Box
                                    style={{
                                        transition: 'transform 0.3s ease',
                                        transform: showOptions ? 'rotate(0deg)' : 'rotate(180deg)',
                                    }}
                                    aria-hidden="true"
                                >
                                    <FaAngleUp />
                                </Box>
                            </Group>

                            <Paper
                                withBorder={true}
                                p="md"
                                radius="md"
                                style={{
                                    overflow: 'hidden',
                                    transform: showOptions ? 'scaleY(1)' : 'scaleY(0)',
                                    transformOrigin: 'top',
                                    height: showOptions ? 'auto' : '0',
                                    opacity: showOptions ? 1 : 0,
                                    transition: 'transform 0.3s ease, opacity 0.3s ease',
                                    borderTop: 'none',
                                    pointerEvents: showOptions ? 'auto' : 'none',
                                }}
                                id="options-panel"
                            >
                                <Stack gap="xs">
                                    <Stack gap="xs">
                                        <Group justify="space-between" align="flex-start">
                                            {/* Model selection with searchable MultiSelect */}
                                            <Box style={{ flex: 1 }}>
                                                <Group mb={5} justify="space-between">
                                                    <Text size="sm" fw={500}>
                                                        Select Models to Compare
                                                    </Text>
                                                </Group>
                                                <MultiSelect
                                                    data={data.models.map((model) => ({
                                                        value: model.modelID,
                                                        label: model.modelID,
                                                        rightSection: !showFullModelId && (
                                                            <Tooltip label={model.modelID} withArrow position="right">
                                                                <Badge size="xs" variant="outline" style={{ cursor: 'help' }}>
                                                                    Full ID
                                                                </Badge>
                                                            </Tooltip>
                                                        ),
                                                    }))}
                                                    value={selectedModels}
                                                    onChange={onModelSelectionChange}
                                                    placeholder="Select models"
                                                    searchable
                                                    clearable
                                                    size="sm"
                                                    style={{ width: '100%' }}
                                                    aria-label="Select models to include in comparison"
                                                />

                                                <Group justify="space-between" gap={'xs'} my={'xs'}>
                                                    <Text size="xs" c="dimmed">
                                                        {selectedModels.length} of {data.models.length} models selected
                                                    </Text>

                                                    <Group gap="xs">
                                                        <Button
                                                            variant="subtle"
                                                            size="xs"
                                                            onClick={onClearAllModels}
                                                            disabled={selectedModels.length === 0}
                                                            aria-label="Clear all selected models"
                                                        >
                                                            Clear All
                                                        </Button>
                                                        <Button
                                                            variant="subtle"
                                                            size="xs"
                                                            onClick={onSelectAllModels}
                                                            disabled={selectedModels.length === data.models.length}
                                                            aria-label="Select all available models"
                                                        >
                                                            Select All
                                                        </Button>
                                                        <Button
                                                            variant="subtle"
                                                            size="xs"
                                                            color="blue"
                                                            onClick={() => {
                                                                const thinkModels = data.models.filter((m) => m.modelID.endsWith('+think')).map((m) => m.modelID);
                                                                const newSelection = [...new Set([...selectedModels, ...thinkModels])];
                                                                onModelSelectionChange(newSelection);
                                                            }}
                                                            disabled={data.models.filter((m) => m.modelID.endsWith('+think')).every((m) => selectedModels.includes(m.modelID))}
                                                            aria-label="Include all think models"
                                                        >
                                                            + Think Models
                                                        </Button>
                                                        <Button
                                                            variant="subtle"
                                                            size="xs"
                                                            color="orange"
                                                            onClick={() => {
                                                                const nonThinkModels = selectedModels.filter((modelId) => !modelId.endsWith('+think'));
                                                                onModelSelectionChange(nonThinkModels);
                                                            }}
                                                            disabled={!selectedModels.some((modelId) => modelId.endsWith('+think'))}
                                                            aria-label="Exclude all think models"
                                                        >
                                                            - Think Models
                                                        </Button>
                                                    </Group>
                                                </Group>
                                            </Box>

                                            {/* Metric selection and display toggles */}
                                            <Box>
                                                <Text size="sm" fw={500} mb={5}>
                                                    Metrics
                                                </Text>

                                                <Stack gap={2}>
                                                    <Group gap={4} wrap="nowrap" justify="space-between">
                                                        <Button
                                                            variant="subtle"
                                                            size="compact-xs"
                                                            color="blue"
                                                            onClick={() => onMetricViewChange('all')}
                                                            style={{ fontSize: '10px', padding: '2px 8px', fontWeight: 500 }}
                                                        >
                                                            All
                                                        </Button>
                                                        <Button
                                                            variant="subtle"
                                                            size="compact-xs"
                                                            color="red"
                                                            onClick={() => onMetricViewChange('none')}
                                                            style={{ fontSize: '10px', padding: '2px 8px', fontWeight: 500 }}
                                                        >
                                                            None
                                                        </Button>
                                                    </Group>

                                                    <Group gap={4} wrap="nowrap">
                                                        <Button
                                                            variant={shouldShowTable ? 'filled' : 'subtle'}
                                                            size="compact-xs"
                                                            onClick={() => onMetricViewChange('table')}
                                                            style={{ fontSize: '10px', padding: '2px 6px' }}
                                                        >
                                                            Consensus Table
                                                        </Button>

                                                        <Button
                                                            variant={shouldShowMDS ? 'filled' : 'subtle'}
                                                            size="compact-xs"
                                                            onClick={() => onMetricViewChange('mds')}
                                                            style={{ fontSize: '10px', padding: '2px 6px' }}
                                                        >
                                                            MDS Projection
                                                        </Button>

                                                        <Button
                                                            variant={shouldShowConsensusChart ? 'filled' : 'subtle'}
                                                            size="compact-xs"
                                                            onClick={() => onMetricViewChange('chart')}
                                                            style={{ fontSize: '10px', padding: '2px 6px' }}
                                                        >
                                                            Consensus Chart
                                                        </Button>
                                                    </Group>

                                                    <Group gap={4} wrap="nowrap">
                                                        <Button
                                                            variant={shouldShowCosine ? 'filled' : 'subtle'}
                                                            size="compact-xs"
                                                            onClick={() => onMetricViewChange('cosine')}
                                                            style={{ fontSize: '10px', padding: '2px 6px' }}
                                                        >
                                                            Cosine Similarity
                                                        </Button>

                                                        <Button
                                                            variant={shouldShowLevenshtein ? 'filled' : 'subtle'}
                                                            size="compact-xs"
                                                            onClick={() => onMetricViewChange('levenshtein')}
                                                            style={{ fontSize: '10px', padding: '2px 6px' }}
                                                        >
                                                            Levenshtein Distance
                                                        </Button>

                                                        <Button
                                                            variant={shouldShowJaccard ? 'filled' : 'subtle'}
                                                            size="compact-xs"
                                                            onClick={() => onMetricViewChange('jaccard')}
                                                            style={{ fontSize: '10px', padding: '2px 6px' }}
                                                        >
                                                            Jaccard Similarity
                                                        </Button>
                                                    </Group>
                                                </Stack>

                                                <Space h="xs"></Space>

                                                {/* Display preference switches */}
                                                <Group gap={'xs'} mb={'xs'} justify="flex-end">
                                                    <Text size="xs" c="dimmed">
                                                        Show Adapter ID
                                                    </Text>
                                                    <Switch
                                                        size="xs"
                                                        checked={showFullModelId}
                                                        onChange={(event) => onShowFullModelIdToggle(event.currentTarget.checked)}
                                                        aria-label="Toggle display of full model IDs"
                                                    />
                                                </Group>
                                                <Group gap={'xs'} justify="flex-end">
                                                    <Text size="xs" c="dimmed">
                                                        Show Embedding ID
                                                    </Text>
                                                    <Switch
                                                        size="xs"
                                                        checked={showEmbeddingID}
                                                        onChange={(event) => onShowEmbeddingIdToggle(event.currentTarget.checked)}
                                                        aria-label="Toggle display of embedding model information"
                                                    />
                                                </Group>
                                            </Box>
                                        </Group>
                                    </Stack>
                                </Stack>
                            </Paper>
                        </Stack>
                    </Group>

                    {/* Scrollable heatmap container */}
                    <Box
                        style={{
                            flex: 1,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <ScrollArea type="always" h="100%" scrollbarSize={'1rem'} aria-label="Evaluation heatmaps">
                            <Box p="md">
                                <Center>
                                    <Box w="100%" maw="60rem">
                                        <Stack gap="lg" align="center">
                                            {/* Consensus Table */}
                                            {shouldShowTable && (
                                                <Box w="100%">
                                                    <ConsensusTable
                                                        cosineMatrix={filteredData?.cosines?.[0]?.cosine || null}
                                                        jaccardMatrix={filteredData?.jaccard || null}
                                                        levenshteinMatrix={filteredData?.levenshteinNormalized || null}
                                                        modelLabels={modelIdLabels || null}
                                                    />
                                                </Box>
                                            )}

                                            {/* MDS Projection Chart */}
                                            {shouldShowMDS && (
                                                <Box w="100%">
                                                    <MDSChart
                                                        cosineMatrix={filteredData?.cosines?.[0]?.cosine}
                                                        jaccardMatrix={filteredData?.jaccard}
                                                        levenshteinMatrix={filteredData?.levenshteinNormalized}
                                                        llmLabels={formattedLabels}
                                                        llmFullIds={modelIdLabels}
                                                    />
                                                </Box>
                                            )}

                                            {/* Consensus Bar Chart */}
                                            {shouldShowConsensusChart && (
                                                <Box w="100%">
                                                    <MixedChart
                                                        cosineMatrix={filteredData?.cosines?.[0]?.cosine}
                                                        jaccardMatrix={filteredData?.jaccard}
                                                        levenshteinMatrix={filteredData?.levenshteinNormalized}
                                                        llmLabels={modelIdLabels}
                                                    />
                                                </Box>
                                            )}
                                            {/* Cosine similarity heatmaps (one per embedding model) */}
                                            {filteredData &&
                                                shouldShowCosine &&
                                                filteredData.cosines.map((item, index) => (
                                                    <Box key={index} w="100%">
                                                        <SymmetricHeatmap
                                                            labels={formattedLabels}
                                                            values={item.cosine}
                                                            title={`Cosine Similarity (${item.embeddingModel})`}
                                                            messages={messages}
                                                        />
                                                    </Box>
                                                ))}

                                            {/* Levenshtein distance heatmap */}
                                            {filteredData && shouldShowLevenshtein && (
                                                <Box w="100%">
                                                    <SymmetricHeatmap
                                                        labels={formattedLabels}
                                                        values={filteredData.levenshtein}
                                                        normalizedValues={filteredData.levenshteinNormalized}
                                                        title="Levenshtein Distance"
                                                        messages={filteredData.models.map((model) => model.message)}
                                                    />
                                                </Box>
                                            )}

                                            {/* Jaccard similarity heatmap */}
                                            {filteredData && shouldShowJaccard && (
                                                <Box w="100%">
                                                    <SymmetricHeatmap
                                                        labels={formattedLabels}
                                                        values={filteredData.jaccard}
                                                        title="Jaccard Similarity"
                                                        messages={filteredData.models.map((model) => model.message)}
                                                    />
                                                </Box>
                                            )}

                                            {/* Empty state when insufficient models selected */}
                                            {selectedModels.length < 2 && (
                                                <Paper p="xl" withBorder radius="md" style={{ textAlign: 'center', width: '100%' }}>
                                                    <Text fw={500}>Please select at least 2 models</Text>
                                                    <Text size="sm" c="dimmed" mt="xs">
                                                        Comparison requires multiple models to show meaningful results
                                                    </Text>
                                                </Paper>
                                            )}
                                        </Stack>
                                    </Box>
                                </Center>
                            </Box>
                        </ScrollArea>
                    </Box>
                </Stack>
            )}
        </Modal>
    );
};
