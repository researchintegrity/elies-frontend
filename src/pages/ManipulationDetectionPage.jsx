// src/pages/ManipulationDetectionPage.jsx
/**
 * Manipulation Detection Page
 * 
 * Detects manipulated/forged regions in images using TruFor deep learning model.
 * TruFor leverages both high-level (RGB) and low-level (Noiseprint++) features
 * to detect and localize image forgeries.
 * 
 * ELIS Scientific Integrity Platform
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    FiShield,
    FiImage,
    FiZap,
    FiCheck,
    FiAlertCircle,
    FiLoader,
    FiRefreshCw,
    FiChevronLeft,
    FiChevronRight,
    FiX,
    FiInfo,
    FiDownload
} from 'react-icons/fi';
import { useImages } from '../hooks/useImages';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { showAlert, showToast } from '../utils/alert';

// --- Constants ---
const IMAGES_PER_PAGE = 12;
const POLL_INTERVAL = 3000; // 3 seconds (TrueFor can be slower)
const MAX_POLL_ATTEMPTS = 120; // Max 6 minutes of polling

// --- Sub-Components ---

// Image Card for Selection
const ImageCard = ({ image, isSelected, onClick, imageUrl, loading }) => {
    const { t } = useLanguage();

    return (
        <div
            className={`group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer
                ${isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                }`}
            onClick={onClick}
        >
            {/* Selection Indicator */}
            <div
                className={`absolute top-2 left-2 z-10 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-white/80 dark:bg-black/50 border-white/50 dark:border-gray-400'
                    }`}>
                    {isSelected && <FiCheck size={14} strokeWidth={3} />}
                </div>
            </div>

            {/* Selected Badge */}
            {isSelected && (
                <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500 text-white">
                    {t('manipulation.selected')}
                </div>
            )}

            <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-900">
                {loading ? (
                    <div className="w-full h-full animate-pulse bg-gray-200 dark:bg-gray-700" />
                ) : imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={image.filename}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <FiImage size={24} />
                    </div>
                )}
            </div>

            <div className="p-2">
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate" title={image.filename}>
                    {image.filename}
                </p>
            </div>
        </div>
    );
};

// Image with lazy loading
const LazyImageCard = ({ image, isSelected, onClick }) => {
    const [imageUrl, setImageUrl] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const loadImage = async () => {
            try {
                const blob = await api.download(`/images/${image.id}/download`);
                const url = URL.createObjectURL(blob);
                if (isMounted) {
                    setImageUrl(url);
                    setLoading(false);
                }
            } catch (err) {
                if (isMounted) setLoading(false);
            }
        };
        if (image?.id) loadImage();
        return () => {
            isMounted = false;
            if (imageUrl) URL.revokeObjectURL(imageUrl);
        };
    }, [image?.id]);

    return (
        <ImageCard
            image={image}
            isSelected={isSelected}
            onClick={onClick}
            imageUrl={imageUrl}
            loading={loading}
        />
    );
};

// Score Display Component
const ScoreDisplay = ({ score, t }) => {
    // Score is between 0-1, where higher means more likely manipulated
    const percentage = Math.round(score * 100);
    const isLikelyManipulated = score > 0.5;
    const isHighRisk = score > 0.7;

    return (
        <div className={`p-4 rounded-xl border ${isHighRisk
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : isLikelyManipulated
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('manipulation.integrityScore')}
                </span>
                <span className={`text-lg font-bold ${isHighRisk
                    ? 'text-red-600 dark:text-red-400'
                    : isLikelyManipulated
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                    {percentage}%
                </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ${isHighRisk
                        ? 'bg-red-500'
                        : isLikelyManipulated
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                        }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <p className={`text-xs mt-2 ${isHighRisk
                ? 'text-red-600 dark:text-red-400'
                : isLikelyManipulated
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-green-600 dark:text-green-400'
                }`}>
                {isHighRisk
                    ? t('manipulation.highRisk')
                    : isLikelyManipulated
                        ? t('manipulation.mediumRisk')
                        : t('manipulation.lowRisk')
                }
            </p>
        </div>
    );
};

// Results Viewer
const ResultsViewer = ({ analysisId, status, results, statusMessage, t }) => {
    const [visualizationUrl, setVisualizationUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Check if we have any visualization result (either direct or in files array)
    const hasVisualization = results?.visualization || (results?.files && results.files.length > 0);

    useEffect(() => {
        // Clean up previous URL
        if (visualizationUrl) URL.revokeObjectURL(visualizationUrl);
        setVisualizationUrl(null);
        setError(null);

        if (status !== 'completed' || !results) {
            return;
        }

        // Only try to download if we have visualization data
        if (!hasVisualization) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const loadResults = async () => {
            try {
                // The backend handles both 'visualization' and 'files' fallback
                const blob = await api.download(`/analyses/${analysisId}/results/visualization/download`);
                setVisualizationUrl(URL.createObjectURL(blob));
            } catch (err) {
                console.error('Failed to download visualization:', err);
                setError(`Visualization: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        loadResults();

        return () => {
            if (visualizationUrl) URL.revokeObjectURL(visualizationUrl);
        };
    }, [status, results, analysisId, hasVisualization]);

    if (status === 'pending' || status === 'processing') {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <FiLoader className="w-8 h-8 animate-spin mb-4" />
                <p className="font-medium">
                    {status === 'pending' ? t('manipulation.pending') : t('manipulation.processing')}
                </p>
                {statusMessage && (
                    <p className="text-sm text-gray-400 mt-2">{statusMessage}</p>
                )}
            </div>
        );
    }

    if (status === 'failed') {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
                <FiAlertCircle className="w-8 h-8 mb-4" />
                <p className="font-medium">{t('manipulation.failed')}</p>
            </div>
        );
    }

    // Show error if download failed
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
                <FiAlertCircle className="w-8 h-8 mb-4" />
                <p className="font-medium">{t('manipulation.downloadError') || 'Failed to load results'}</p>
                <p className="text-sm mt-2 text-gray-500">{error}</p>
            </div>
        );
    }

    if (status === 'completed' && !hasVisualization) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <FiCheck className="w-8 h-8 mb-4 text-green-500" />
                <p className="font-medium">{t('manipulation.noResults')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Result Image */}
            <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 min-h-[200px] flex items-center justify-center">
                {loading ? (
                    <div className="flex flex-col items-center py-12 text-gray-500">
                        <FiLoader className="w-6 h-6 animate-spin mb-2" />
                        <span className="text-sm">{t('manipulation.loadingResults') || 'Loading results...'}</span>
                    </div>
                ) : visualizationUrl ? (
                    <img src={visualizationUrl} alt="TruFor Visualization" className="w-full h-auto" />
                ) : (
                    <span className="text-gray-400 text-sm">{t('manipulation.noVisualization') || 'No visualization available'}</span>
                )}
            </div>

            {/* Download button */}
            {visualizationUrl && (
                <a
                    href={visualizationUrl}
                    download={`trufor_result_${analysisId}.png`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                    <FiDownload size={16} />
                    {t('manipulation.downloadResult')}
                </a>
            )}
        </div>
    );
};

// --- Main Component ---

const ManipulationDetectionPage = () => {
    const { images, loading: imagesLoading, fetchImages, pagination } = useImages();
    const { t } = useLanguage();

    // Image selection
    const [selectedImage, setSelectedImage] = useState(null);

    // Options
    const [saveNoiseprint, setSaveNoiseprint] = useState(false);

    // Analysis state
    const [analysisId, setAnalysisId] = useState(null);
    const [analysisStatus, setAnalysisStatus] = useState(null);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [statusMessage, setStatusMessage] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Fetch images on mount
    useEffect(() => {
        fetchImages({ page: currentPage, per_page: IMAGES_PER_PAGE });
    }, [fetchImages, currentPage]);

    // Poll for analysis status
    useEffect(() => {
        if (!analysisId || analysisStatus === 'completed' || analysisStatus === 'failed') return;

        let pollCount = 0;
        const pollInterval = setInterval(async () => {
            try {
                pollCount++;
                if (pollCount > MAX_POLL_ATTEMPTS) {
                    clearInterval(pollInterval);
                    setIsAnalyzing(false);
                    showToast(t('manipulation.timeout'), 'warning');
                    return;
                }

                const analysis = await api.getAnalysisById(analysisId);
                setAnalysisStatus(analysis.status);
                setStatusMessage(analysis.status_message);

                if (analysis.status === 'completed') {
                    setAnalysisResults(analysis.results);
                    setIsAnalyzing(false);
                    clearInterval(pollInterval);
                    showToast(t('manipulation.completed'), 'success');
                } else if (analysis.status === 'failed') {
                    setIsAnalyzing(false);
                    clearInterval(pollInterval);
                    showToast(t('manipulation.failed'), 'error');
                }
            } catch (err) {
                console.error('Error polling analysis status:', err);
            }
        }, POLL_INTERVAL);

        return () => clearInterval(pollInterval);
    }, [analysisId, analysisStatus, t]);

    // Handle image selection
    const handleImageClick = useCallback((image) => {
        setSelectedImage(prev => prev?.id === image.id ? null : image);
        // Reset analysis when selection changes
        setAnalysisId(null);
        setAnalysisStatus(null);
        setAnalysisResults(null);
        setStatusMessage(null);
    }, []);

    // Run analysis
    const handleRunAnalysis = async () => {
        if (!selectedImage) {
            showToast(t('manipulation.selectImageFirst'), 'warning');
            return;
        }

        setIsAnalyzing(true);
        setAnalysisStatus('pending');
        setAnalysisResults(null);
        setStatusMessage(null);

        try {
            const response = await api.startManipulationAnalysis(selectedImage.id, {
                save_noiseprint: saveNoiseprint
            });

            setAnalysisId(response.analysis_id);
            showToast(t('manipulation.analysisStarted'), 'success');
        } catch (err) {
            console.error('Error starting analysis:', err);
            showAlert(t('common.error'), err.message, 'error');
            setIsAnalyzing(false);
            setAnalysisStatus(null);
        }
    };

    // Reset analysis
    const handleReset = () => {
        setSelectedImage(null);
        setAnalysisId(null);
        setAnalysisStatus(null);
        setAnalysisResults(null);
        setStatusMessage(null);
        setIsAnalyzing(false);
    };

    // Check if ready to analyze
    const canAnalyze = !!selectedImage;

    return (
        <div className="w-full h-full flex flex-col gap-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                        <FiShield className="w-5 h-5" />
                    </div>
                    {t('manipulation.title')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('manipulation.subtitle')}</p>
            </div>

            {/* Main Content */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                {/* Left Panel - Configuration */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    {/* Info Card */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
                        <div className="flex items-start gap-3">
                            <FiInfo className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                                    {t('manipulation.aboutTitle')}
                                </h3>
                                <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                                    {t('manipulation.aboutDescription')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Options */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('manipulation.options')}</h3>

                        {/* Save Noiseprint Toggle */}
                        <label className="flex items-center justify-between cursor-pointer group">
                            <div>
                                <span className="text-sm text-gray-700 dark:text-gray-300">{t('manipulation.saveNoiseprint')}</span>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                    {t('manipulation.saveNoiseprintDesc')}
                                </p>
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={saveNoiseprint}
                                    onChange={(e) => setSaveNoiseprint(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </div>
                        </label>
                    </div>

                    {/* Selected Image */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('manipulation.selectedImage')}</h3>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase w-16">{t('manipulation.image')}</span>
                                {selectedImage ? (
                                    <div className="flex-1 flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                                        <span className="text-sm text-gray-900 dark:text-white truncate">{selectedImage.filename}</span>
                                        <button onClick={() => setSelectedImage(null)} className="text-gray-400 hover:text-gray-600">
                                            <FiX size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-400 italic">{t('manipulation.notSelected')}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleReset}
                            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <FiRefreshCw className="inline-block mr-2" />
                            {t('common.reset') || 'Reset'}
                        </button>
                        <button
                            onClick={handleRunAnalysis}
                            disabled={!canAnalyze || isAnalyzing}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${canAnalyze && !isAnalyzing
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {isAnalyzing ? (
                                <>
                                    <FiLoader className="animate-spin" />
                                    {t('manipulation.analyzing')}
                                </>
                            ) : (
                                <>
                                    <FiZap />
                                    {t('manipulation.analyze')}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Center Panel - Image Gallery */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col min-h-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('manipulation.selectImage')}</h3>

                    {/* Image Grid */}
                    <div className="flex-1 overflow-y-auto scrollbar-custom">
                        {imagesLoading ? (
                            <div className="grid grid-cols-2 gap-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : images.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <FiImage className="w-12 h-12 mb-3" />
                                <p className="text-sm">{t('manipulation.noImages')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {images.map(image => (
                                    <LazyImageCard
                                        key={image.id}
                                        image={image}
                                        isSelected={selectedImage?.id === image.id}
                                        onClick={() => handleImageClick(image)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mt-3">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <FiChevronLeft />
                            </button>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {currentPage} / {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={currentPage === pagination.totalPages}
                                className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <FiChevronRight />
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Panel - Results */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col min-h-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('manipulation.results')}</h3>

                    <div className="flex-1 overflow-y-auto">
                        {analysisId ? (
                            <ResultsViewer
                                analysisId={analysisId}
                                status={analysisStatus}
                                results={analysisResults}
                                statusMessage={statusMessage}
                                t={t}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <FiShield className="w-12 h-12 mb-4" />
                                <p className="text-sm text-center">{t('manipulation.selectAndRun')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManipulationDetectionPage;
