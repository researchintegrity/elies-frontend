// src/pages/CopyMove/components/__tests__/ResultsViewer.test.jsx
// Tests for the Forgeryscope findings shown by ResultsViewer
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ResultsViewer from '../ResultsViewer';
import { api } from '../../../../services/api';

vi.mock('../../../../services/api', () => ({
    api: { download: vi.fn() }
}));

// Translation stub: the key followed by its parameters
const t = (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key);

const DUPLICATED = {
    method: 'forgeryscope',
    verdict: 'duplicated',
    matches_image: '/w/fig_matches.png',
    clusters_image: '/w/fig_clusters.png',
    report: '/w/fig_result.json',
    panels: [{ id: 0 }, { id: 1 }, { id: 2 }],
    detections: [
        {
            id: 1, colour: '#e6194b', level: 'panel', panel_type: 'Microscopy', similarity: 0.912,
            pairs: [{ keypoint_match: true, inliers: 42 }, { keypoint_match: true, inliers: 17 }], lane_matches: []
        },
        {
            id: 2, colour: '#0082c8', level: 'panel', panel_type: 'Blots', similarity: 0.97,
            pairs: [{ keypoint_match: false, inliers: 0 }], lane_matches: []
        },
        {
            id: 3, colour: '#3cb44b', level: 'lane', panel_type: 'Blots', similarity: 0.7,
            pairs: [], lane_matches: [{}, {}]
        }
    ]
};

describe('ResultsViewer with Forgeryscope results', () => {
    beforeEach(() => {
        api.download.mockResolvedValue(new Blob(['png']));
        globalThis.URL.createObjectURL = vi.fn(() => 'blob:result');
        globalThis.URL.revokeObjectURL = vi.fn();
    });

    it('shows the verdict and one entry per group of duplicated regions', async () => {
        render(<ResultsViewer analysisId="a1" status="completed" results={DUPLICATED} t={t} />);

        expect(screen.getByText('copyMove.duplicationFoundGroups {"count":3}')).toBeInTheDocument();
        expect(screen.getByText('copyMove.forgeryscopeDisclaimer')).toBeInTheDocument();
        expect(screen.getByText('copyMove.panelTypeMicroscopy · copyMove.levelPanel')).toBeInTheDocument();
        expect(screen.getByText(/copyMove.similarity \{"value":91\} · copyMove.evidenceKeypoints \{"count":42\}/)).toBeInTheDocument();
        expect(screen.getByText(/copyMove.evidenceEmbedding/)).toBeInTheDocument();
        expect(screen.getByText(/copyMove.evidenceLanes \{"count":2\}/)).toBeInTheDocument();
        expect(screen.getByText('copyMove.duplicatedRegions')).toBeInTheDocument();
        await waitFor(() => expect(api.download).toHaveBeenCalledWith('/analyses/a1/results/matches/download'));
        expect(screen.getByText('copyMove.downloadReport')).toBeInTheDocument();
    });

    it('says how many panels were checked when nothing is found', () => {
        const authentic = { method: 'forgeryscope', verdict: 'authentic', detections: [], panels: [{ id: 0 }, { id: 1 }], report: '/r.json' };
        render(<ResultsViewer analysisId="a2" status="completed" results={authentic} t={t} />);

        expect(screen.getByText('copyMove.noResults')).toBeInTheDocument();
        expect(screen.getByText('copyMove.panelsChecked {"count":2}')).toBeInTheDocument();
        expect(screen.queryByText(/copyMove.duplicationFoundGroups/)).not.toBeInTheDocument();
    });

    it('says when no panel could be compared', () => {
        const noPanels = { method: 'forgeryscope', verdict: 'authentic', detections: [], panels: [] };
        render(<ResultsViewer analysisId="a3" status="completed" results={noPanels} t={t} />);

        expect(screen.getByText('copyMove.noPanelsDetected')).toBeInTheDocument();
        expect(screen.queryByText('copyMove.downloadReport')).not.toBeInTheDocument();
    });

    it('keeps the existing labels for other methods', () => {
        const dense = { method: 'dense', matches_image: '/m.png', clusters_image: '/c.png' };
        render(<ResultsViewer analysisId="a4" status="completed" results={dense} t={t} />);

        expect(screen.getByText('copyMove.matches')).toBeInTheDocument();
        expect(screen.queryByText(/copyMove.forgeryscopeDisclaimer/)).not.toBeInTheDocument();
    });
});
