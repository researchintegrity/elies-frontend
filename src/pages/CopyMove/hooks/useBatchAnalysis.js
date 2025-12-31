import { useState } from 'react';
import { api } from '../../../services/api';
import { showToast } from '../../../utils/alert';
import { MAX_POLL_ATTEMPTS, POLL_INTERVAL, STEPS } from '../constants';

export const useBatchAnalysis = (t) => {
    const [batchMode, setBatchMode] = useState(false);
    const [batchImages, setBatchImages] = useState([]);  // Array of {id, filename}
    const [batchResults, setBatchResults] = useState([]);  // Array of {imageId, analysisId, status, results}
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
    const [isAnalyzingBatch, setIsAnalyzingBatch] = useState(false);

    // Run batch analysis - submit all to queue, then poll in parallel
    const startBatchAnalysis = async (denseMethod, setCurrentStep) => {
        if (batchImages.length === 0) {
            showToast(t('copyMove.noImagesSelected') || 'No images selected', 'warning');
            return;
        }

        setIsAnalyzingBatch(true);
        setCurrentStep(STEPS.RESULTS);
        setBatchProgress({ current: 0, total: batchImages.length });

        // Initialize results array
        const initialResults = batchImages.map(image => ({
            imageId: image.id,
            filename: image.filename,
            analysisId: null,
            status: 'queued',
            results: null
        }));
        setBatchResults(initialResults);

        // Step 1: Submit all analyses in parallel (Celery manages the queue)
        const submissionResults = await Promise.all(
            batchImages.map(async (image) => {
                try {
                    const response = await api.startCopyMoveAnalysis(image.id, parseInt(denseMethod, 10));
                    return { imageId: image.id, analysisId: response.analysis_id, status: 'processing' };
                } catch (err) {
                    console.error(`Error submitting analysis for ${image.id}:`, err);
                    return { imageId: image.id, analysisId: null, status: 'failed', error: err.message };
                }
            })
        );

        // Update results with analysis IDs
        const resultsWithIds = initialResults.map(result => {
            const submission = submissionResults.find(s => s.imageId === result.imageId);
            return submission ? { ...result, ...submission } : result;
        });
        setBatchResults(resultsWithIds);

        const successfulSubmissions = submissionResults.filter(s => s.analysisId);
        showToast(`${t('copyMove.batchQueued') || 'Queued'}: ${successfulSubmissions.length}/${batchImages.length} ${t('copyMove.imagesAnalyzed') || 'images'}`, 'success');

        // Step 2: Poll all analyses in parallel
        let pendingAnalyses = resultsWithIds.filter(r => r.analysisId && !['completed', 'failed'].includes(r.status));
        let pollCount = 0;
        let currentResults = [...resultsWithIds];

        while (pendingAnalyses.length > 0 && pollCount < MAX_POLL_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
            pollCount++;

            // Poll all pending analyses in parallel
            const statusUpdates = await Promise.all(
                pendingAnalyses.map(async (item) => {
                    try {
                        const analysis = await api.getAnalysisById(item.analysisId);
                        const uiStatus = analysis.status === 'pending' ? 'processing' : analysis.status;
                        return { imageId: item.imageId, status: uiStatus, results: analysis.results };
                    } catch (err) {
                        console.error(`Error polling ${item.analysisId}:`, err);
                        return { imageId: item.imageId, status: 'processing' };
                    }
                })
            );

            // Update results
            currentResults = currentResults.map(result => {
                const update = statusUpdates.find(u => u.imageId === result.imageId);
                if (update) {
                    return { ...result, status: update.status, results: update.results || result.results };
                }
                return result;
            });
            setBatchResults([...currentResults]);

            // Update progress
            const completedCount = currentResults.filter(r => r.status === 'completed' || r.status === 'failed').length;
            setBatchProgress({ current: completedCount, total: batchImages.length });

            // Filter still pending
            pendingAnalyses = currentResults.filter(r => r.analysisId && !['completed', 'failed'].includes(r.status));
        }

        // Mark timeout for any still pending
        if (pendingAnalyses.length > 0) {
            currentResults = currentResults.map(r =>
                pendingAnalyses.some(p => p.imageId === r.imageId) ? { ...r, status: 'timeout' } : r
            );
            setBatchResults([...currentResults]);
        }

        setIsAnalyzingBatch(false);
        const completed = currentResults.filter(r => r.status === 'completed').length;
        const failed = currentResults.filter(r => r.status !== 'completed').length;

        if (completed > 0 && failed === 0) {
            showToast(`${t('copyMove.batchCompleted') || 'Batch analysis completed'}: ${completed} ${t('copyMove.imagesAnalyzed') || 'images'}`, 'success');
        } else if (completed > 0) {
            showToast(`${completed} ${t('copyMove.completed') || 'completed'}, ${failed} ${t('copyMove.failed') || 'failed'}`, 'warning');
        } else {
            showToast(t('copyMove.batchFailed') || 'Batch analysis failed', 'error');
        }
    };

    const resetBatch = () => {
        setBatchMode(false);
        setBatchImages([]);
        setBatchResults([]);
        setBatchProgress({ current: 0, total: 0 });
        setIsAnalyzingBatch(false);
    }

    return {
        batchMode,
        setBatchMode,
        batchImages,
        setBatchImages,
        batchResults,
        batchProgress,
        isAnalyzingBatch,
        startBatchAnalysis,
        resetBatch
    };
};
