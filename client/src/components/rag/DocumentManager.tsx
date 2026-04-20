/**
 * @fileoverview RAG Document Manager component for uploading and managing PDF documents.
 * Provides UI for document upload, listing, and deletion with RAG configuration controls.
 * @module Components.RAG.DocumentManager
 */

import React, { useState } from 'react';
import {
    Modal,
    Stack,
    Button,
    Group,
    Text,
    Paper,
    FileButton,
    List,
    ActionIcon,
    Divider,
    NumberInput,
    Switch,
    Collapse,
    Textarea,
    Accordion,
    Code,
    Alert,
} from '@mantine/core';
import { FaFileUpload, FaTrash, FaCog, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useRAG } from '@/hooks/useRAG';
import { ragService } from '@/services';
import { remToPx } from '@/utils';
import { useDisclosure } from '@mantine/hooks';

/**
 * Props for the DocumentManager component.
 */
interface DocumentManagerProps {
    /** Whether the modal is open */
    opened: boolean;
    /** Handler for closing the modal */
    onClose: () => void;
}

/**
 * Document Manager component for RAG system.
 * Allows users to upload PDF documents, view uploaded documents, and configure RAG settings.
 *
 * @param props - Component props
 * @returns Rendered DocumentManager component
 */
export const DocumentManager: React.FC<DocumentManagerProps> = ({ opened, onClose }) => {
    const { documents, loading, uploadDocument, deleteDocument, config, updateConfig } = useRAG();
    const [files, setFiles] = useState<File[]>([]);
    const [settingsOpen, { toggle: toggleSettings }] = useDisclosure(false);

    // Local state for configuration
    const [localChunkSize, setLocalChunkSize] = useState(config.chunkSize);
    const [localChunkOverlap, setLocalChunkOverlap] = useState(config.chunkOverlap);
    const [localTopK, setLocalTopK] = useState(config.topK);
    const [localEnabled, setLocalEnabled] = useState(config.enabled);
    const [localPromptTemplate, setLocalPromptTemplate] = useState(config.promptTemplate);

    /**
     * Handles multiple file uploads sequentially
     */
    const handleUpload = async () => {
        if (files.length === 0) return;

        try {
            // Upload files sequentially to avoid overwhelming the server
            for (const file of files) {
                await uploadDocument(file);
            }
            setFiles([]);
        } catch (error) {
            console.error('Upload error:', error);
        }
    };

    /**
     * Handles document deletion
     */
    const handleDelete = (documentId: string) => {
        try {
            deleteDocument(documentId);
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    /**
     * Applies configuration changes
     */
    const handleApplySettings = () => {
        updateConfig({
            chunkSize: localChunkSize,
            chunkOverlap: localChunkOverlap,
            topK: localTopK,
            enabled: localEnabled,
            promptTemplate: localPromptTemplate,
        });
    };

    /**
     * Resets local settings to current config
     */
    const handleResetSettings = () => {
        setLocalChunkSize(config.chunkSize);
        setLocalChunkOverlap(config.chunkOverlap);
        setLocalTopK(config.topK);
        setLocalEnabled(config.enabled);
        setLocalPromptTemplate(config.promptTemplate);
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Text fw={600} size="lg">
                    RAG Document Manager
                </Text>
            }
            size="lg"
        >
            <Stack gap="md">
                {/* Upload Section */}
                <Paper shadow="xs" p="md" radius="md" withBorder>
                    <Stack gap="sm">
                        <Text fw={500} size="sm">
                            Upload & Parse Documents
                        </Text>
                        <Group gap="xs">
                            <FileButton onChange={setFiles} accept="application/pdf,text/plain" multiple>
                                {(props) => (
                                    <Button {...props} variant="light" leftSection={<FaFileUpload size={remToPx(1)} />} size="sm" flex={1}>
                                        {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'Select Files'}
                                    </Button>
                                )}
                            </FileButton>
                            <Button onClick={handleUpload} disabled={files.length === 0 || loading} loading={loading} size="sm" variant="filled">
                                Upload & Parse
                            </Button>
                        </Group>
                        {files.length > 0 && (
                            <Stack gap="xs">
                                <Text size="xs" fw={500} c="dimmed">
                                    Selected files ({files.length}):
                                </Text>
                                <List size="xs" spacing={2}>
                                    {files.map((file, index) => (
                                        <List.Item key={index}>
                                            <Text size="xs" truncate>
                                                {file.name}
                                            </Text>
                                        </List.Item>
                                    ))}
                                </List>
                            </Stack>
                        )}
                        <Text size="xs" c="dimmed">
                            PDF and TXT files are supported. Documents will be parsed, chunked (using current settings), and embedded automatically.
                        </Text>
                    </Stack>
                </Paper>

                {/* Documents List */}
                <Paper shadow="xs" p="md" radius="md" withBorder>
                    <Stack gap="sm">
                        <Group justify="space-between">
                            <Text fw={500} size="sm">
                                Parsed Documents ({documents.length})
                            </Text>
                        </Group>

                        {documents.length === 0 ? (
                            <Text size="sm" c="dimmed" ta="center" py="md">
                                No documents parsed yet
                            </Text>
                        ) : (
                            <List spacing="xs" size="sm" withPadding>
                                {documents.map((doc) => (
                                    <List.Item key={doc.id}>
                                        <Group justify="space-between" wrap="nowrap">
                                            <Stack gap={0} flex={1} style={{ minWidth: 0 }}>
                                                <Text size="sm" truncate>
                                                    {doc.name}
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                    {doc.chunkCount} chunks
                                                </Text>
                                            </Stack>
                                            <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(doc.id)} size="sm">
                                                <FaTrash size={remToPx(0.8)} />
                                            </ActionIcon>
                                        </Group>
                                    </List.Item>
                                ))}
                            </List>
                        )}
                    </Stack>
                </Paper>

                {/* Settings Section */}
                <Paper shadow="xs" p="md" radius="md" withBorder>
                    <Stack gap="sm">
                        <Group justify="space-between">
                            <Text fw={500} size="sm">
                                RAG Settings
                            </Text>
                            <ActionIcon variant="subtle" onClick={toggleSettings}>
                                <FaCog size={remToPx(1)} />
                            </ActionIcon>
                        </Group>

                        <Collapse in={settingsOpen}>
                            <Stack gap="md" pt="sm">
                                <Divider />

                                <Switch
                                    label="Enable RAG"
                                    description="Automatically retrieve relevant context from documents"
                                    checked={localEnabled}
                                    onChange={(event) => setLocalEnabled(event.currentTarget.checked)}
                                />

                                <Alert color="orange" variant="light" mb="sm" icon={<FaExclamationTriangle size={remToPx(1.2)} />}>
                                    <Text size="xs" fw={500}>
                                        Changing chunk size or overlap requires re-uploading documents
                                    </Text>
                                    <Text size="xs" mt="xs">
                                        Existing documents were parsed with previous settings and won't be automatically updated. Delete and re-upload documents after changing
                                        these values.
                                    </Text>
                                </Alert>

                                <Group grow>
                                    <NumberInput
                                        label="Chunk Size"
                                        description="Characters per chunk"
                                        value={localChunkSize}
                                        onChange={(value) => setLocalChunkSize(Number(value) || 1000)}
                                        min={100}
                                        max={5000}
                                        step={100}
                                        size="sm"
                                    />

                                    <NumberInput
                                        label="Chunk Overlap"
                                        description="Overlap characters"
                                        value={localChunkOverlap}
                                        onChange={(value) => setLocalChunkOverlap(Number(value) || 200)}
                                        min={0}
                                        max={1000}
                                        step={50}
                                        size="sm"
                                    />

                                    <NumberInput
                                        label="Top-K Results"
                                        description="Chunks to retrieve"
                                        value={localTopK}
                                        onChange={(value) => setLocalTopK(Number(value) || 3)}
                                        min={1}
                                        max={10}
                                        step={1}
                                        size="sm"
                                    />
                                </Group>

                                <Divider label="Prompt Template" labelPosition="center" />

                                <Accordion variant="contained" mb="sm">
                                    <Accordion.Item value="instructions">
                                        <Accordion.Control icon={<FaInfoCircle size={remToPx(1)} />}>Template Variables & Syntax</Accordion.Control>
                                        <Accordion.Panel>
                                            <Stack gap="sm">
                                                <Alert color="blue" variant="light">
                                                    <Text size="sm" fw={500} mb="xs">
                                                        Available Variables:
                                                    </Text>
                                                    <Stack gap={4}>
                                                        <Text size="xs">
                                                            <Code>query</Code> - The user's question/prompt
                                                        </Text>
                                                        <Text size="xs">
                                                            <Code>results</Code> - Array of retrieved chunks with enriched metadata
                                                        </Text>
                                                        <Text size="xs">
                                                            <Code>results[].chunk.text</Code> - The chunk text content
                                                        </Text>
                                                        <Text size="xs">
                                                            <Code>results[].score</Code> - Similarity score (0-1)
                                                        </Text>
                                                        <Text size="xs">
                                                            <Code>results[].documentName</Code> - Source document name
                                                        </Text>
                                                        <Text size="xs">
                                                            <Code>results[].pageNumber</Code> - Page number (PDF only, may be undefined)
                                                        </Text>
                                                        <Text size="xs">
                                                            <Code>results[].documentType</Code> - Document type ('pdf' or 'txt')
                                                        </Text>
                                                    </Stack>
                                                </Alert>

                                                <Alert color="grape" variant="light">
                                                    <Text size="sm" fw={500} mb="xs">
                                                        Nunjucks Syntax:
                                                    </Text>
                                                    <Stack gap={4}>
                                                        <Text size="xs">
                                                            <Code>{'{% for result in results %}'}</Code> - Loop through results
                                                        </Text>
                                                        <Text size="xs">
                                                            <Code>{'{{ loop.index }}'}</Code> - Current iteration (1-based)
                                                        </Text>
                                                        <Text size="xs">
                                                            <Code>{'{% if condition %}'}</Code> - Conditional rendering
                                                        </Text>
                                                        <Text size="xs">
                                                            <Code>{'{{ value | round(3) }}'}</Code> - Round to 3 decimals
                                                        </Text>
                                                    </Stack>
                                                </Alert>
                                            </Stack>
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                </Accordion>

                                <Stack gap="xs">
                                    <Textarea
                                        label="RAG Prompt"
                                        description="Leave empty for standard format, or provide Nunjucks template"
                                        placeholder="Leave empty to use standard format..."
                                        value={localPromptTemplate}
                                        onChange={(event) => setLocalPromptTemplate(event.currentTarget.value)}
                                        minRows={6}
                                        maxRows={12}
                                        autosize
                                        size="sm"
                                        styles={{
                                            input: {
                                                fontFamily: 'monospace',
                                                fontSize: '0.8rem',
                                            },
                                        }}
                                    />
                                    <Group gap="xs" justify="flex-start">
                                        <Button
                                            variant="light"
                                            size="xs"
                                            onClick={() => {
                                                const defaultTemplate = ragService.getDefaultPromptTemplate();
                                                setLocalPromptTemplate(defaultTemplate);
                                            }}
                                        >
                                            Reset to Default Template
                                        </Button>
                                    </Group>
                                </Stack>

                                <Group gap="xs" justify="flex-end" mt="xs">
                                    <Button variant="default" size="xs" onClick={handleResetSettings}>
                                        Reset
                                    </Button>
                                    <Button size="xs" onClick={handleApplySettings}>
                                        Apply
                                    </Button>
                                </Group>
                            </Stack>
                        </Collapse>
                    </Stack>
                </Paper>
            </Stack>
        </Modal>
    );
};
