import React, { useState, useEffect } from 'react';
import { FiAlertCircle, FiAlertTriangle, FiCheck, FiLoader, FiDownload, FiFileText } from 'react-icons/fi';
import { api } from '../../../services/api';

const PANEL_TYPE_KEYS = { Blots: 'copyMove.panelTypeBlots', Microscopy: 'copyMove.panelTypeMicroscopy' };

// What a Forgeryscope detection rests on: matching lanes, matching keypoints,
// or (western blots only) similar appearance without keypoint matches
const describeEvidence = (detection, t) => {
    if (detection.level === 'lane') {
        return t('copyMove.evidenceLanes', { count: detection.lane_matches?.length || 0 });
    }
    const matched = (detection.pairs || []).filter(pair => pair.keypoint_match);
    if (matched.length === 0) return t('copyMove.evidenceEmbedding');
    return t('copyMove.evidenceKeypoints', { count: Math.max(...matched.map(pair => pair.inliers)) });
};

// Forgeryscope findings, numbered and coloured as in the result image
const FindingsList = ({ detections, t }) => (
    <ul className="space-y-2">
        {detections.map(detection => (
            <li key={detection.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <span className="mt-0.5 w-6 h-6 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: detection.colour }}>
                    {detection.id}
                </span>
                <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {t(PANEL_TYPE_KEYS[detection.panel_type] || detection.panel_type)} · {t(detection.level === 'lane' ? 'copyMove.levelLane' : 'copyMove.levelPanel')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('copyMove.similarity', { value: Math.round((detection.similarity || 0) * 100) })} · {describeEvidence(detection, t)}
                    </p>
                </div>
            </li>
        ))}
    </ul>
);

const ResultsViewer = ({ analysisId, status, results, t }) => {
    const isForgeryscope = results?.method === 'forgeryscope';
    const detections = results?.detections || [];
    const [matchesUrl, setMatchesUrl] = useState(null);
    const [clustersUrl, setClustersUrl] = useState(null);
    const [activeTab, setActiveTab] = useState('matches');
    const [loading, setLoading] = useState(false);
    const [, setError] = useState(null);

    const urlsRef = React.useRef({ matches: null, clusters: null });

    useEffect(() => {
        // Cleanup function to revoke URLs when component unmounts or updates
        return () => {
            if (urlsRef.current.matches) URL.revokeObjectURL(urlsRef.current.matches);
            if (urlsRef.current.clusters) URL.revokeObjectURL(urlsRef.current.clusters);
        };
    }, []);

    useEffect(() => {
        // Clear current URLs from state and revoke old ones
        if (urlsRef.current.matches) {
            URL.revokeObjectURL(urlsRef.current.matches);
            urlsRef.current.matches = null;
        }
        if (urlsRef.current.clusters) {
            URL.revokeObjectURL(urlsRef.current.clusters);
            urlsRef.current.clusters = null;
        }
        setMatchesUrl(null);
        setClustersUrl(null);
        setError(null);

        if (status !== 'completed' || !results) return;
        setLoading(true);

        const loadResults = async () => {
            try {
                if (results?.matches_image) {
                    const blob = await api.download(`/analyses/${analysisId}/results/matches/download`);
                    const url = URL.createObjectURL(blob);
                    urlsRef.current.matches = url;
                    setMatchesUrl(url);
                }
                if (results?.clusters_image) {
                    const blob = await api.download(`/analyses/${analysisId}/results/clusters/download`);
                    const url = URL.createObjectURL(blob);
                    urlsRef.current.clusters = url;
                    setClustersUrl(url);
                }
            } catch (err) { setError(err.message); }
            finally { setLoading(false); }
        };
        loadResults();
    }, [status, results, analysisId]);


    if (status === 'pending' || status === 'processing') {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30" />
                    <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" />
                </div>
                <p className="font-medium text-lg mb-2">{status === 'pending' ? t('copyMove.pending') : t('copyMove.processing')}</p>
                <p className="text-sm text-gray-400">{t('copyMove.analysisInProgress')}</p>
            </div>
        );
    }

    if (status === 'failed') {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
                <FiAlertCircle className="w-12 h-12 mb-4" />
                <p className="font-medium text-lg">{t('copyMove.failed')}</p>
                <p className="text-sm text-gray-500 mt-2">{t('copyMove.failedDesc')}</p>
            </div>
        );
    }

    const downloadReport = async () => {
        try {
            const blob = await api.download(`/analyses/${analysisId}/results/report/download`);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `forgeryscope_report_${analysisId}.json`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) { setError(err.message); }
    };

    const reportButton = isForgeryscope && results?.report && (
        <button onClick={downloadReport} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-medium">
            <FiFileText size={16} />{t('copyMove.downloadReport')}
        </button>
    );

    if (status === 'completed' && (!results?.matches_image && !results?.clusters_image)) {
        const panelCount = results?.panels?.length || 0;
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                    <FiCheck className="w-8 h-8 text-green-500" />
                </div>
                <p className="font-medium text-lg text-gray-900 dark:text-white">{t('copyMove.noResults')}</p>
                <p className="text-sm text-gray-500 mt-2">{t('copyMove.noResultsDesc')}</p>
                {isForgeryscope && (
                    <p className="text-sm text-gray-500 mt-1">
                        {panelCount > 0 ? t('copyMove.panelsChecked', { count: panelCount }) : t('copyMove.noPanelsDetected')}
                    </p>
                )}
                {reportButton && <div className="mt-4">{reportButton}</div>}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {isForgeryscope && results?.verdict === 'duplicated' && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <FiAlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
                    <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{t('copyMove.duplicationFoundGroups', { count: detections.length })}</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{t('copyMove.forgeryscopeDisclaimer')}</p>
                    </div>
                </div>
            )}
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                {results?.matches_image && (
                    <button onClick={() => setActiveTab('matches')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'matches' ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent'}`}>
                        {t(isForgeryscope ? 'copyMove.duplicatedRegions' : 'copyMove.matches')}
                    </button>
                )}
                {results?.clusters_image && (
                    <button onClick={() => setActiveTab('clusters')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'clusters' ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent'}`}>
                        {t(isForgeryscope ? 'copyMove.regionMask' : 'copyMove.clusters')}
                    </button>
                )}
            </div>
            <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 min-h-[300px] flex items-center justify-center">
                {loading ? (
                    <div className="flex flex-col items-center py-12 text-gray-500">
                        <FiLoader className="w-6 h-6 animate-spin mb-2" />
                        <span className="text-sm">{t('copyMove.loadingResults')}</span>
                    </div>
                ) : (
                    <>
                        {activeTab === 'matches' && matchesUrl && <img src={matchesUrl} alt="Matches" className="w-full h-auto" />}
                        {activeTab === 'clusters' && clustersUrl && <img src={clustersUrl} alt="Clusters" className="w-full h-auto" />}
                    </>
                )}
            </div>
            {isForgeryscope && detections.length > 0 && <FindingsList detections={detections} t={t} />}
            {(matchesUrl || clustersUrl || reportButton) && (
                <div className="flex gap-2">
                    {matchesUrl && (
                        <a href={matchesUrl} download={`copy_move_matches_${analysisId}.png`} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-medium">
                            <FiDownload size={16} />{t('copyMove.downloadMatches')}
                        </a>
                    )}
                    {clustersUrl && (
                        <a href={clustersUrl} download={`copy_move_clusters_${analysisId}.png`} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-medium">
                            <FiDownload size={16} />{t('copyMove.downloadClusters')}
                        </a>
                    )}
                    {reportButton}
                </div>
            )}
        </div>
    );
};

export default ResultsViewer;
