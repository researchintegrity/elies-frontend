import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { showToast } from '../utils/alert';
import { useLanguage } from '../context/LanguageContext';

// Polling interval in milliseconds
const POLLING_INTERVAL = 2000;

// Maximum polling attempts before timeout
const MAX_POLLING_ATTEMPTS = 60; // 2 minutes at 2s intervals

/**
 * Hook to manage panel extraction workflow with async task polling
 * 
 * @returns {Object} Panel extraction state and methods
 */
export const usePanelExtraction = () => {
    const { t } = useLanguage();

    // State
    const [isExtracting, setIsExtracting] = useState(false);
    const [status, setStatus] = useState(null); // 'queued' | 'processing' | 'completed' | 'failed' | 'error'
    const [extractedPanels, setExtractedPanels] = useState([]);
    const [error, setError] = useState(null);
    const [taskId, setTaskId] = useState(null);

    // Refs for cleanup
    const pollingTimeoutRef = useRef(null);
    const pollingAttemptsRef = useRef(0);
    const isCancelledRef = useRef(false);

    /**
     * Clean up polling timeout
     */
    const cleanupPolling = useCallback(() => {
        if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
        }
        pollingAttemptsRef.current = 0;
    }, []);

    /**
     * Poll for extraction status
     */
    const pollStatus = useCallback(async (currentTaskId) => {
        if (isCancelledRef.current) {
            cleanupPolling();
            return;
        }

        pollingAttemptsRef.current += 1;

        // Check for timeout
        if (pollingAttemptsRef.current > MAX_POLLING_ATTEMPTS) {
            setStatus('error');
            setError(t('panelExtraction.timeout') || 'Panel extraction timed out');
            setIsExtracting(false);
            cleanupPolling();
            return;
        }

        try {
            const result = await api.getExtractionStatus(currentTaskId);

            if (isCancelledRef.current) {
                cleanupPolling();
                return;
            }

            setStatus(result.status);

            if (result.status === 'completed') {
                // Extraction completed successfully
                const panels = result.extracted_panels || [];
                setExtractedPanels(panels);
                setIsExtracting(false);
                cleanupPolling();

                const panelCount = result.extracted_panels_count || panels.length;
                if (panelCount > 0) {
                    showToast(
                        (t('panelExtraction.success') || 'Successfully extracted {count} panels')
                            .replace('{count}', panelCount),
                        'success'
                    );
                } else {
                    showToast(t('panelExtraction.noPanelsFound') || 'No panels found in the selected images', 'info');
                }

                return { success: true, panelCount, panels };
            } else if (result.status === 'failed' || result.status === 'error') {
                // Extraction failed
                setError(result.error || result.message || t('panelExtraction.failed') || 'Panel extraction failed');
                setIsExtracting(false);
                cleanupPolling();
                showToast(t('panelExtraction.failed') || 'Panel extraction failed', 'error');
                return { success: false, error: result.error };
            } else {
                // Still processing, continue polling
                pollingTimeoutRef.current = setTimeout(() => {
                    pollStatus(currentTaskId);
                }, POLLING_INTERVAL);
            }
        } catch (err) {
            console.error('Error polling extraction status:', err);
            setError(err.message);
            setStatus('error');
            setIsExtracting(false);
            cleanupPolling();
            return { success: false, error: err.message };
        }
    }, [cleanupPolling, t]);

    /**
     * Start panel extraction for selected images
     * 
     * @param {string[]} imageIds - Array of image IDs to extract panels from
     * @param {string} modelType - Model type for extraction (default: 'default')
     * @returns {Promise<{success: boolean, panelCount?: number, error?: string}>}
     */
    const startExtraction = useCallback(async (imageIds, modelType = 'default') => {
        if (!imageIds || imageIds.length === 0) {
            const errorMsg = t('panelExtraction.noImagesSelected') || 'No images selected for extraction';
            showToast(errorMsg, 'warning');
            return { success: false, error: errorMsg };
        }

        // Reset state
        setIsExtracting(true);
        setStatus('queued');
        setExtractedPanels([]);
        setError(null);
        setTaskId(null);
        isCancelledRef.current = false;
        cleanupPolling();

        try {
            // Initiate extraction
            const response = await api.extractPanels(imageIds, modelType);

            if (isCancelledRef.current) {
                return { success: false, cancelled: true };
            }

            const newTaskId = response.task_id;
            setTaskId(newTaskId);
            setStatus(response.status || 'queued');

            showToast(t('panelExtraction.started') || 'Panel extraction started', 'info');

            // Start polling for status
            pollingTimeoutRef.current = setTimeout(() => {
                pollStatus(newTaskId);
            }, POLLING_INTERVAL);

            // Return a promise that resolves when extraction completes
            // For now, return immediately - the UI will react to state changes
            return { success: true, taskId: newTaskId, pending: true };

        } catch (err) {
            console.error('Error starting panel extraction:', err);
            setError(err.message);
            setStatus('error');
            setIsExtracting(false);
            showToast(err.message || t('panelExtraction.failed') || 'Failed to start panel extraction', 'error');
            return { success: false, error: err.message };
        }
    }, [cleanupPolling, pollStatus, t]);

    /**
     * Cancel ongoing extraction polling (doesn't cancel the backend task)
     */
    const cancelPolling = useCallback(() => {
        isCancelledRef.current = true;
        cleanupPolling();
        setIsExtracting(false);
        setStatus(null);
    }, [cleanupPolling]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isCancelledRef.current = true;
            cleanupPolling();
        };
    }, [cleanupPolling]);

    return {
        // State
        isExtracting,
        status,
        extractedPanels,
        error,
        taskId,

        // Methods
        startExtraction,
        cancelPolling
    };
};

export default usePanelExtraction;
