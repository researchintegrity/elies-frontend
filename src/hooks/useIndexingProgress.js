import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../services/api';

// Polling interval for indexing status (ms)
const POLL_INTERVAL = 1000;

// Maximum number of poll attempts before giving up
const MAX_POLL_ATTEMPTS = 300; // 5 minutes at 1s interval

/**
 * Hook for tracking batch image indexing progress.
 * 
 * Usage:
 *   const { indexingStatus, isIndexing, startIndexingPolling, stopPolling } = useIndexingProgress();
 *   
 *   // After batch upload returns job_id:
 *   startIndexingPolling(jobId);
 *   
 *   // In UI:
 *   {isIndexing && <IndexingProgressBar status={indexingStatus} />}
 */
export const useIndexingProgress = () => {
    const [indexingStatus, setIndexingStatus] = useState(null);
    const [isIndexing, setIsIndexing] = useState(false);
    const [error, setError] = useState(null);

    const pollIntervalRef = useRef(null);
    const pollCountRef = useRef(0);
    const currentJobIdRef = useRef(null);

    /**
     * Stop polling for indexing status
     */
    const stopPolling = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        pollCountRef.current = 0;
        currentJobIdRef.current = null;
    }, []);

    /**
     * Poll the indexing status endpoint
     */
    const pollStatus = useCallback(async (jobId) => {
        try {
            const response = await api.get(`/images/indexing-status/${jobId}`);
            setIndexingStatus(response);

            // Check if job is finished
            const finishedStatuses = ['completed', 'failed', 'partial'];
            if (finishedStatuses.includes(response.status)) {
                stopPolling();
                setIsIndexing(false);
                return true; // Done
            }

            return false; // Still in progress
        } catch (err) {
            console.error('Error polling indexing status:', err);
            // Don't fail immediately on network errors, keep trying
            pollCountRef.current++;
            if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
                setError('Indexing status polling timed out');
                stopPolling();
                setIsIndexing(false);
            }
            return false;
        }
    }, [stopPolling]);

    /**
     * Start polling for indexing status
     */
    const startIndexingPolling = useCallback((jobId) => {
        // Stop any existing polling
        stopPolling();

        currentJobIdRef.current = jobId;
        pollCountRef.current = 0;
        setIsIndexing(true);
        setError(null);
        setIndexingStatus({
            job_id: jobId,
            status: 'pending',
            total_images: 0,
            processed_images: 0,
            progress_percent: 0,
            current_step: 'Starting...'
        });

        // Initial poll
        pollStatus(jobId);

        // Set up interval for subsequent polls
        pollIntervalRef.current = setInterval(() => {
            if (currentJobIdRef.current === jobId) {
                pollStatus(jobId);
            }
        }, POLL_INTERVAL);
    }, [pollStatus, stopPolling]);

    /**
     * Reset state (call when starting a new upload)
     */
    const reset = useCallback(() => {
        stopPolling();
        setIndexingStatus(null);
        setIsIndexing(false);
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
        indexingStatus,
        isIndexing,
        error,
        startIndexingPolling,
        stopPolling,
        reset
    };
};

export default useIndexingProgress;
