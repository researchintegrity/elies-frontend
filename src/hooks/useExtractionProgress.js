import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../services/api';

// Polling interval for extraction status (ms)
const POLL_INTERVAL = 2000;

// Maximum number of poll attempts before giving up (10 minutes at 2s interval)
const MAX_POLL_ATTEMPTS = 300;

/**
 * Hook for tracking PDF extraction progress for multiple documents.
 * 
 * Usage:
 *   const { extractionStatus, isExtracting, startExtractionPolling, stopPolling } = useExtractionProgress();
 *   
 *   // After PDF uploads complete and return document IDs:
 *   startExtractionPolling(documentIds);
 *   
 *   // In UI:
 *   {isExtracting && <ExtractionProgressBar status={extractionStatus} />}
 */
export const useExtractionProgress = () => {
    const [extractionStatus, setExtractionStatus] = useState(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [error, setError] = useState(null);

    const pollIntervalRef = useRef(null);
    const pollCountRef = useRef(0);
    const documentIdsRef = useRef([]);

    /**
     * Stop polling for extraction status
     */
    const stopPolling = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        pollCountRef.current = 0;
        documentIdsRef.current = [];
    }, []);

    /**
     * Poll document statuses
     */
    const pollStatus = useCallback(async (docIds) => {
        try {
            // Fetch status of each document
            const statuses = await Promise.all(
                docIds.map(async (docId) => {
                    try {
                        const doc = await api.get(`/documents/${docId}`);
                        return {
                            id: docId,
                            filename: doc.filename,
                            status: doc.extraction_status || 'pending',
                            extractedCount: doc.extracted_image_count || 0
                        };
                    } catch {
                        return { id: docId, status: 'error', filename: 'Unknown' };
                    }
                })
            );

            // Calculate aggregate progress
            const total = statuses.length;
            const completed = statuses.filter(s =>
                s.status === 'completed' || s.status === 'failed' || s.status === 'completed_with_errors'
            ).length;
            const processing = statuses.filter(s => s.status === 'processing').length;
            const pending = statuses.filter(s => s.status === 'pending').length;
            const failed = statuses.filter(s => s.status === 'failed' || s.status === 'error').length;

            const progressPercent = total > 0 ? (completed / total) * 100 : 0;

            // Determine current step
            let currentStep = '';
            if (pending > 0 && processing === 0) {
                currentStep = `Waiting to process ${pending} document(s)...`;
            } else if (processing > 0) {
                currentStep = `Extracting images from ${processing} document(s)...`;
            } else if (completed === total) {
                currentStep = `Completed processing ${total} document(s)`;
            }

            // Count total extracted images
            const totalExtracted = statuses.reduce((sum, s) => sum + (s.extractedCount || 0), 0);

            const status = {
                documents: statuses,
                total_documents: total,
                completed_documents: completed,
                processing_documents: processing,
                pending_documents: pending,
                failed_documents: failed,
                total_extracted: totalExtracted,
                progress_percent: progressPercent,
                current_step: currentStep,
                status: completed === total ? (failed > 0 ? 'partial' : 'completed') : 'processing'
            };

            setExtractionStatus(status);

            // Check if all done
            if (completed === total) {
                stopPolling();
                setIsExtracting(false);
                return true;
            }

            return false;
        } catch (err) {
            console.error('Error polling extraction status:', err);
            pollCountRef.current++;
            if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
                setError('Extraction status polling timed out');
                stopPolling();
                setIsExtracting(false);
            }
            return false;
        }
    }, [stopPolling]);

    /**
     * Start polling for extraction status
     */
    const startExtractionPolling = useCallback((documentIds) => {
        if (!documentIds || documentIds.length === 0) return;

        // Stop any existing polling
        stopPolling();

        documentIdsRef.current = documentIds;
        pollCountRef.current = 0;
        setIsExtracting(true);
        setError(null);
        setExtractionStatus({
            documents: documentIds.map(id => ({ id, status: 'pending' })),
            total_documents: documentIds.length,
            completed_documents: 0,
            progress_percent: 0,
            current_step: 'Starting extraction...',
            status: 'pending'
        });

        // Initial poll
        pollStatus(documentIds);

        // Set up interval for subsequent polls
        pollIntervalRef.current = setInterval(() => {
            if (documentIdsRef.current.length > 0) {
                pollStatus(documentIdsRef.current);
            }
        }, POLL_INTERVAL);
    }, [pollStatus, stopPolling]);

    /**
     * Reset state (call when starting a new upload)
     */
    const reset = useCallback(() => {
        stopPolling();
        setExtractionStatus(null);
        setIsExtracting(false);
        setError(null);
    }, [stopPolling]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    return {
        extractionStatus,
        isExtracting,
        error,
        startExtractionPolling,
        stopPolling,
        reset
    };
};

export default useExtractionProgress;
