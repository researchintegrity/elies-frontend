// src/components/analysis/AnalysisDetailsPanel.jsx
/**
 * Analysis Details Panel component
 * Provides detailed view of an analysis with Source/Result image tabs,
 * General Info, and Parameters sections.
 * 
 * Used by both AnalysisDashboardPage and FlaggedImagesPage
 */

import React, { useState, useEffect } from 'react';
import {
    FiChevronLeft,
    FiChevronRight,
    FiX,
    FiFilter,
    FiRepeat,
    FiPlay,
    FiSliders,
    FiCalendar,
    FiImage,
    FiTarget,
    FiAlertTriangle,
    FiArrowLeft
} from 'react-icons/fi';
import TypeBadge from './TypeBadge';
import StatusBadge from './StatusBadge';
import ParametersDisplay from './ParametersDisplay';
import { API_BASE_URL } from '../../config/api';
import { api } from '../../services/api';

// Helper to get thumbnail URL with auth token
const getThumbnailUrl = (imageId) => {
    const token = localStorage.getItem('authToken');
    return `${API_BASE_URL}/images/${imageId}/thumbnail${token ? `?token=${token}` : ''}`;
};

/**
 * AnalysisDetailsPanel - Full analysis detail view with image preview
 * 
 * Props:
 * - analysis: The analysis object to display
 * - onClose: Callback when close button is clicked
 * - onReproduce: Callback to reproduce the analysis
 * - onFilterByImage: Callback to filter by source image
 * - onViewResults: Callback to navigate to full results page
 * - onNext/onPrev: Navigation callbacks (optional)
 * - hasNext/hasPrev: Navigation state (optional)
 * - activeTab/onTabChange: External tab state control (optional)
 * - t: Translation function
 * - locale: Current locale
 * - ProvenanceGraph: Optional provenance graph component to use
 * - embedded: If true, uses a more compact layout for embedding
 */
const AnalysisDetailsPanel = ({
    analysis,
    onClose,
    onReproduce,
    onFilterByImage,
    onViewResults,
    onNext,
    onPrev,
    hasNext,
    hasPrev,
    activeTab: externalActiveTab,
    onTabChange,
    t,
    locale,
    ProvenanceGraph,
    embedded = false
}) => {
    const [internalActiveTab, setInternalActiveTab] = useState(analysis.type === 'cross_image_copy_move' ? 'comparison' : 'source');

    // Sync with external tab state if provided
    const activeTab = externalActiveTab || internalActiveTab;
    const setActiveTab = (tab) => {
        if (onTabChange) {
            onTabChange(tab);
        } else {
            setInternalActiveTab(tab);
        }
    };

    const [sourceUrl, setSourceUrl] = useState(null);
    const [targetUrl, setTargetUrl] = useState(null);
    const [resultUrl, setResultUrl] = useState(null);
    const [loadingSource, setLoadingSource] = useState(true);
    const [loadingTarget, setLoadingTarget] = useState(false);
    const [loadingResult, setLoadingResult] = useState(false);
    const [sourceError, setSourceError] = useState(false);
    const [targetError, setTargetError] = useState(false);
    const [imageUrls, setImageUrls] = useState({});

    // Load Provenance Graph Images - use thumbnail URLs
    useEffect(() => {
        if (analysis.type === 'provenance' && analysis.results?.graph?.nodes) {
            const newUrls = {};
            for (const node of analysis.results.graph.nodes) {
                if (!imageUrls[node.id]) {
                    newUrls[node.id] = getThumbnailUrl(node.id);
                }
            }
            if (Object.keys(newUrls).length > 0) {
                setImageUrls(prev => ({ ...prev, ...newUrls }));
            }
        }
    }, [analysis, imageUrls]);

    // Load Source Image - use thumbnail URL for detail panel
    useEffect(() => {
        if (analysis.source_image_id) {
            setSourceUrl(getThumbnailUrl(analysis.source_image_id));
        }
        setLoadingSource(false);
    }, [analysis.source_image_id]);

    // Load Target Image - use thumbnail URL for detail panel
    useEffect(() => {
        const targetId = analysis.parameters?.target_image_id || analysis.target_image_id;
        if (targetId) {
            setTargetUrl(getThumbnailUrl(targetId));
        }
        setLoadingTarget(false);
    }, [analysis.parameters?.target_image_id, analysis.target_image_id]);

    // Result Navigation State
    const [availableResults, setAvailableResults] = useState([]);
    const [currentResultIndex, setCurrentResultIndex] = useState(0);

    // Initialize available results
    useEffect(() => {
        if (!analysis.results) return;

        const results = [];
        // Define priority/order of results
        const resultKeys = [
            { key: 'pred_map', label: 'analysisDashboard.resultTypes.pred_map' },
            { key: 'conf_map', label: 'analysisDashboard.resultTypes.conf_map' },
            { key: 'noiseprint', label: 'analysisDashboard.resultTypes.noiseprint' },
            { key: 'matches_image', label: 'analysisDashboard.resultTypes.matches' },
            { key: 'clusters_image', label: 'analysisDashboard.resultTypes.clusters' },
            { key: 'result_image', label: 'analysisDashboard.resultTypes.result_image' }
        ];

        resultKeys.forEach(({ key, label }) => {
            if (analysis.results[key]) {
                let apiType = key;
                // Special handling: remove _image suffix for matches and clusters only
                if (key === 'matches_image' || key === 'clusters_image') {
                    apiType = key.replace('_image', '');
                }
                results.push({ key, label, apiType });
            }
        });

        setAvailableResults(results);
        setCurrentResultIndex(0);
        setResultUrl(null);
    }, [analysis]);

    // Cleanup result URL when switching results
    useEffect(() => {
        setResultUrl(null);
    }, [currentResultIndex]);

    const handleNextResult = (e) => {
        e.stopPropagation();
        if (availableResults.length <= 1) return;
        setCurrentResultIndex((prev) => (prev + 1) % availableResults.length);
    };

    const handlePrevResult = (e) => {
        e.stopPropagation();
        if (availableResults.length <= 1) return;
        setCurrentResultIndex((prev) => (prev - 1 + availableResults.length) % availableResults.length);
    };

    // Load Result Image
    useEffect(() => {
        if (activeTab === 'result' && analysis.status === 'completed' && !resultUrl && availableResults.length > 0) {
            // Skip provenance if graph is available
            if (analysis.type === 'provenance' && analysis.results?.graph) {
                return;
            }

            let isMounted = true;
            setLoadingResult(true);

            const loadResult = async () => {
                try {
                    const currentResult = availableResults[currentResultIndex];
                    if (!currentResult) return;

                    const downloadType = currentResult.apiType;
                    const blob = await api.download(`/analyses/${analysis._id}/results/${downloadType}/download`);
                    if (isMounted) setResultUrl(URL.createObjectURL(blob));
                } catch (err) {
                    console.error("Failed to load result", err);
                } finally {
                    if (isMounted) setLoadingResult(false);
                }
            };
            loadResult();
            return () => { isMounted = false; };
        }
    }, [activeTab, analysis, resultUrl, availableResults, currentResultIndex]);

    // Cleanup URLs
    useEffect(() => {
        return () => {
            if (resultUrl) URL.revokeObjectURL(resultUrl);
        };
    }, [resultUrl]);

    const containerClass = embedded
        ? "flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden"
        : "flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-lg flex flex-col h-full";

    return (
        <div className={containerClass}>
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center gap-3">
                    {embedded && onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            title={t('common.back') || 'Back'}
                        >
                            <FiArrowLeft size={18} />
                        </button>
                    )}
                    <TypeBadge type={analysis.type} subtype={analysis.parameters?.analysis_subtype} t={t} />
                    <StatusBadge status={analysis.status} t={t} />

                    {/* Navigation */}
                    {(onNext || onPrev) && (
                        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ml-2">
                            <button
                                onClick={onPrev}
                                disabled={!hasPrev}
                                className="p-1.5 rounded-l-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title={t('common.previous') || 'Previous'}
                            >
                                <FiChevronLeft size={16} />
                            </button>
                            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                            <button
                                onClick={onNext}
                                disabled={!hasNext}
                                className="p-1.5 rounded-r-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title={t('common.next') || 'Next'}
                            >
                                <FiChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {analysis.source_image_id && onFilterByImage && (
                        <button
                            onClick={() => onFilterByImage(analysis.source_image_id)}
                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title={t('analysisDashboard.filterByImage')}
                        >
                            <FiFilter size={16} />
                        </button>
                    )}
                    {analysis.status === 'completed' && analysis.parameters && onReproduce && (
                        <button
                            onClick={() => onReproduce(analysis)}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title={t('analysisDashboard.reproduce')}
                        >
                            <FiRepeat size={16} />
                        </button>
                    )}
                    {analysis.status === 'completed' && onViewResults && (
                        <button
                            onClick={() => onViewResults(analysis)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title={t('analysisDashboard.viewResults') || 'View Full Results'}
                        >
                            <FiPlay size={16} />
                        </button>
                    )}
                    {!embedded && onClose && (
                        <button onClick={onClose} className="text-gray-400 hover:text-red-500">
                            <FiX size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Visual Stage */}
            <div className={`flex-1 bg-gray-100 dark:bg-gray-900 relative ${embedded ? 'min-h-[250px]' : 'min-h-[300px]'} flex items-center justify-center overflow-hidden`}>
                {activeTab === 'source' ? (
                    loadingSource ? (
                        <div className="animate-pulse w-full h-full bg-gray-200 dark:bg-gray-800" />
                    ) : sourceError ? (
                        <div className="text-amber-500 flex flex-col items-center gap-3 p-8">
                            <FiAlertTriangle size={48} />
                            <span className="text-sm font-medium">{t('analysisDashboard.imageDeleted')}</span>
                            <span className="text-xs text-gray-400">{t('analysisDashboard.resultsStillAvailable')}</span>
                        </div>
                    ) : sourceUrl ? (
                        <img
                            src={sourceUrl}
                            alt="Source"
                            className="w-full h-full object-contain p-12"
                            onError={() => setSourceError(true)}
                        />
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                            <span className="text-sm">No source image</span>
                        </div>
                    )
                ) : activeTab === 'target' ? (
                    loadingTarget ? (
                        <div className="animate-pulse w-full h-full bg-gray-200 dark:bg-gray-800" />
                    ) : targetError ? (
                        <div className="text-amber-500 flex flex-col items-center gap-3 p-8">
                            <FiAlertTriangle size={48} />
                            <span className="text-sm font-medium">{t('analysisDashboard.imageDeleted')}</span>
                            <span className="text-xs text-gray-400">{t('analysisDashboard.resultsStillAvailable')}</span>
                        </div>
                    ) : targetUrl ? (
                        <img
                            src={targetUrl}
                            alt="Target"
                            className="w-full h-full object-contain p-12"
                            onError={() => setTargetError(true)}
                        />
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                            <span className="text-sm">No target image</span>
                        </div>
                    )
                ) : activeTab === 'comparison' ? (
                    <div className="w-full h-full flex flex-row items-center justify-center p-8 gap-8">
                        {/* Source Side */}
                        <div className="flex-1 h-full flex flex-col items-center overflow-hidden">
                            <span className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <FiImage size={14} /> {t('analysisDashboard.tabSource')}
                            </span>
                            {loadingSource ? (
                                <div className="animate-pulse w-full h-full bg-gray-200 dark:bg-gray-800 rounded-lg" />
                            ) : sourceUrl ? (
                                <img src={sourceUrl} alt="Source" className="w-full h-full object-contain rounded-lg border border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-white/5" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-sm">N/A</span>
                                </div>
                            )}
                        </div>

                        {/* Separator */}
                        <div className="h-full w-px bg-gray-200 dark:bg-gray-700" />

                        {/* Target Side */}
                        <div className="flex-1 h-full flex flex-col items-center overflow-hidden">
                            <span className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <FiTarget size={14} /> {t('analysisDashboard.tabTarget')}
                            </span>
                            {loadingTarget ? (
                                <div className="animate-pulse w-full h-full bg-gray-200 dark:bg-gray-800 rounded-lg" />
                            ) : targetUrl ? (
                                <img src={targetUrl} alt="Target" className="w-full h-full object-contain rounded-lg border border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-white/5" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-sm">N/A</span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    loadingResult ? (
                        <div className="animate-pulse w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                        </div>
                    ) : analysis.type === 'provenance' && analysis.results?.graph && ProvenanceGraph ? (
                        <div className="w-full h-full p-2 overflow-hidden">
                            <ProvenanceGraph
                                nodes={analysis.results.graph.nodes}
                                edges={analysis.results.graph.edges}
                                spanningTreeEdges={analysis.results.graph.spanning_tree_edges}
                                queryImageId={analysis.source_image_id}
                                getImageUrl={(id) => imageUrls[id]}
                                width={800}
                                height={500}
                            />
                        </div>
                    ) : resultUrl ? (
                        <div className="relative w-full h-full group">
                            <img src={resultUrl} alt="Result" className="w-full h-full object-contain p-12" />

                            {/* Result Type Badge */}
                            {availableResults.length > 0 && (
                                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur-sm shadow-sm border border-white/10 z-10">
                                    {availableResults[currentResultIndex] ? t(availableResults[currentResultIndex].label) : ''}
                                </div>
                            )}

                            {/* Navigation Arrows */}
                            {availableResults.length > 1 && (
                                <>
                                    <button
                                        onClick={handlePrevResult}
                                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 dark:bg-gray-800/80 p-3 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title={t('common.previous')}
                                    >
                                        <FiChevronLeft size={24} className="text-gray-700 dark:text-gray-300" />
                                    </button>
                                    <button
                                        onClick={handleNextResult}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 dark:bg-gray-800/80 p-3 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title={t('common.next')}
                                    >
                                        <FiChevronRight size={24} className="text-gray-700 dark:text-gray-300" />
                                    </button>
                                    {/* Dots Indicators */}
                                    <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex gap-2">
                                        {availableResults.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`w-2 h-2 rounded-full transition-colors ${idx === currentResultIndex ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center gap-2">
                            <span className="text-sm">Preview not available</span>
                            {onViewResults && (
                                <button
                                    onClick={() => onViewResults(analysis)}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                                >
                                    {t('analysisDashboard.viewResults') || 'View Full Results'}
                                </button>
                            )}
                        </div>
                    )
                )}

                {/* Tabs */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 dark:bg-gray-800/90 p-1 rounded-lg flex gap-1 shadow-lg backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('source')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'source'
                            ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        {t('analysisDashboard.tabSource')}
                    </button>
                    {analysis.parameters?.target_image_id && (
                        <button
                            onClick={() => setActiveTab('target')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'target'
                                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {t('analysisDashboard.tabTarget')}
                        </button>
                    )}
                    {analysis.type === 'cross_image_copy_move' && (
                        <button
                            onClick={() => setActiveTab('comparison')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'comparison'
                                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {t('analysisDashboard.tabComparison')}
                        </button>
                    )}
                    {analysis.status === 'completed' && (
                        <button
                            onClick={() => setActiveTab('result')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'result'
                                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {t('analysisDashboard.tabResult')}
                        </button>
                    )}
                </div>
            </div>

            {/* Details Section */}
            <div className={`${embedded ? 'max-h-[200px]' : 'h-1/3'} border-t border-gray-200 dark:border-gray-700 overflow-y-auto p-4 bg-white dark:bg-gray-800`}>
                <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <FiCalendar size={14} />
                        {t('analysisDashboard.generalInfo')}
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('analysisDashboard.created')}</span>
                            <p className="text-gray-900 dark:text-white">{new Date(analysis.created_at).toLocaleString(locale)}</p>
                        </div>
                        <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('analysisDashboard.updated')}</span>
                            <p className="text-gray-900 dark:text-white">{new Date(analysis.updated_at).toLocaleString(locale)}</p>
                        </div>
                    </div>
                </div>

                {/* Parameters */}
                {analysis.parameters && Object.keys(analysis.parameters).length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <FiSliders size={14} />
                            {t('analysisDashboard.parameters')}
                        </h4>
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 space-y-2">
                            <ParametersDisplay
                                parameters={analysis.parameters}
                                sourceImageId={analysis.source_image_id}
                                targetImageId={analysis.parameters?.target_image_id || analysis.target_image_id}
                                t={t}
                                defaultExpanded={true}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalysisDetailsPanel;
