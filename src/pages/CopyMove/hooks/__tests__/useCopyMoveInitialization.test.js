// src/pages/CopyMove/hooks/__tests__/useCopyMoveInitialization.test.js
// Tests for opening stored results ("View Results" in the Analysis Dashboard)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCopyMoveInitialization } from '../useCopyMoveInitialization';
import { api } from '../../../../services/api';

vi.mock('../../../../services/api', () => ({ api: { get: vi.fn() } }));
vi.mock('../../../../utils/alert', () => ({ showAlert: vi.fn(), showToast: vi.fn() }));

const setters = () => ({
    setLoadingReproduce: vi.fn(), setMode: vi.fn(), setSourceImage: vi.fn(), setTargetImage: vi.fn(),
    setMethodType: vi.fn(), setDenseMethod: vi.fn(), setDescriptor: vi.fn(), setCurrentStep: vi.fn(),
    setAnalysisId: vi.fn(), setAnalysisStatus: vi.fn(), setAnalysisResults: vi.fn(), setBatchMode: vi.fn(),
    setBatchImages: vi.fn(), t: (key) => key
});

const openStoredResults = (results) => {
    sessionStorage.setItem('viewResultsAnalysis', JSON.stringify({
        analysisId: 'a1', imageId: 'i1', type: 'single_image_copy_move', targetPage: 'copyMove'
    }));
    api.get.mockImplementation(async (path) => (path === '/images/i1' ? { _id: 'i1', filename: 'fig.png' } : { results }));
    const props = setters();
    renderHook(() => useCopyMoveInitialization(props));
    return props;
};

describe('useCopyMoveInitialization: stored results', () => {
    beforeEach(() => {
        sessionStorage.clear();
        api.get.mockReset();
    });

    it('keeps the verdict, findings and report of a Forgeryscope result', async () => {
        const stored = {
            method: 'forgeryscope', verdict: 'authentic', detections: [], panels: [{ id: 0 }],
            matches_image: null, clusters_image: null, report: '/w/fig_result.json'
        };
        const props = openStoredResults(stored);

        await waitFor(() => expect(props.setAnalysisResults).toHaveBeenCalledWith(stored));
    });

    it('still assumes both images for the other methods', async () => {
        const props = openStoredResults({ method: 'dense', matches_image: '/w/m.png', clusters_image: null });

        await waitFor(() => expect(props.setAnalysisResults).toHaveBeenCalledWith({
            matches_image: '/w/m.png', clusters_image: true
        }));
    });
});
