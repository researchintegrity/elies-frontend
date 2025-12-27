// src/pages/ManipulationDetectionPage.jsx
/**
 * Manipulation Detection Page - Wizard Format
 * 
 * Detects manipulated/forged regions in images using TruFor deep learning model.
 * TruFor leverages both high-level (RGB) and low-level (Noiseprint++) features
 * to detect and localize image forgeries.
 * 
 * ELIS Scientific Integrity Platform
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    FiDownload,
    FiSearch,
    FiTag,
    FiCalendar,
    FiGrid,
    FiArrowRight,
    FiArrowLeft,
} from 'react-icons/fi';
import { useImages } from '../hooks/useImages';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { API_BASE_URL } from '../config/api';
import { showAlert, showToast } from '../utils/alert';

// Helper to get thumbnail URL with auth token
const getThumbnailUrl = (imageId) => {
    const token = localStorage.getItem('authToken');
    return `${API_BASE_URL}/images/${imageId}/thumbnail${token ? `?token=${token}` : ''}`;
};

// --- Constants ---
const IMAGES_PER_PAGE = 18;
const POLL_INTERVAL = 3000;
const MAX_POLL_ATTEMPTS = 120;

// Wizard Steps
const STEPS = {
    SELECT: 0,
    CONFIGURE: 1,
    RESULTS: 2
};

const STEP_LABELS = ['select', 'configure', 'results'];

// --- Skeleton Component ---
const SkeletonCard = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="aspect-square bg-gray-200 dark:bg-gray-700" />
        <div className="p-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
    </div>
);

// --- Sub-Components ---

// Step Indicator
const StepIndicator = ({ currentStep, steps, onStepClick, canNavigate, t }) => {
    return (
        <div className="flex items-center justify-center gap-2">
            {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                const isClickable = canNavigate(index);

                return (
                    <React.Fragment key={step}>
                        {index > 0 && (
                            <div className={`h-0.5 w-8 transition-colors ${isCompleted ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        )}
                        <button
                            onClick={() => isClickable && onStepClick(index)}
                            disabled={!isClickable}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive
                                ? 'bg-emerald-600 text-white shadow-lg'
                                : isCompleted
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200'
                                    : isClickable
                                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-white/20' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-gray-300 dark:bg-gray-600'
                                }`}>
                                {isCompleted ? <FiCheck size={12} /> : index + 1}
                            </span>
                            <span className="hidden sm:inline">{t(`manipulation.step.${step}`)}</span>
                        </button>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

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
            <div className={`absolute top-2 left-2 z-10 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-white/80 dark:bg-black/50 border-white/50'
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
                    <img src={imageUrl} alt={image.filename} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
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

// Lazy Image Card - uses thumbnail URL for fast loading
const LazyImageCard = ({ image, isSelected, onClick }) => {
    // Use thumbnail URL directly - browser handles caching
    const imageUrl = image?.id ? getThumbnailUrl(image.id) : null;

    return <ImageCard image={image} isSelected={isSelected} onClick={onClick} imageUrl={imageUrl} loading={false} />;
};

// Compact Selected Image Preview - uses thumbnail URL for fast loading
const CompactImagePreview = ({ image, onRemove, t }) => {
    // Use thumbnail URL directly - browser handles caching
    const imageUrl = image?.id ? getThumbnailUrl(image.id) : null;

    if (!image) {
        return (
            <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <FiImage className="text-gray-400" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase text-emerald-500">{t('manipulation.image')}</span>
                    <p className="text-xs text-gray-400 italic truncate">{t('manipulation.notSelected')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
            <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                {imageUrl ? (
                    <img src={imageUrl} alt={image.filename} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full animate-pulse bg-gray-200 dark:bg-gray-700" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">{t('manipulation.image')}</span>
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{image.filename}</p>
            </div>
            <button onClick={onRemove} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600">
                <FiX size={14} />
            </button>
        </div>
    );
};

// Results Viewer
const ResultsViewer = ({ analysisId, status, results, statusMessage, t }) => {
    const [predMapUrl, setPredMapUrl] = useState(null);
    const [confMapUrl, setConfMapUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const hasPredMap = results?.pred_map;
    const hasConfMap = results?.conf_map;
    const hasResults = hasPredMap || hasConfMap || (results?.files && results.files.length > 0);

    useEffect(() => {
        // Cleanup previous URLs
        if (predMapUrl) URL.revokeObjectURL(predMapUrl);
        if (confMapUrl) URL.revokeObjectURL(confMapUrl);
        setPredMapUrl(null);
        setConfMapUrl(null);
        setError(null);

        if (status !== 'completed' || !results) return;
        if (!hasResults) { setLoading(false); return; }

        setLoading(true);
        const loadResults = async () => {
            const errors = [];

            // Load prediction map
            if (hasPredMap || results?.files?.some(f => f.includes('_pred_map'))) {
                try {
                    const blob = await api.download(`/analyses/${analysisId}/results/pred_map/download`);
                    setPredMapUrl(URL.createObjectURL(blob));
                } catch (err) {
                    console.error('Failed to download pred_map:', err);
                    errors.push(`Prediction Map: ${err.message}`);
                }
            }

            // Load confidence map
            if (hasConfMap || results?.files?.some(f => f.includes('_conf_map'))) {
                try {
                    const blob = await api.download(`/analyses/${analysisId}/results/conf_map/download`);
                    setConfMapUrl(URL.createObjectURL(blob));
                } catch (err) {
                    console.error('Failed to download conf_map:', err);
                    errors.push(`Confidence Map: ${err.message}`);
                }
            }

            if (errors.length > 0 && !predMapUrl && !confMapUrl) {
                setError(errors.join('; '));
            }
            setLoading(false);
        };
        loadResults();

        return () => {
            if (predMapUrl) URL.revokeObjectURL(predMapUrl);
            if (confMapUrl) URL.revokeObjectURL(confMapUrl);
        };
    }, [status, results, analysisId, hasResults, hasPredMap, hasConfMap]);

    if (status === 'pending' || status === 'processing') {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-full border-4 border-emerald-100 dark:border-emerald-900/30" />
                    <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
                </div>
                <p className="font-medium text-lg mb-2">{status === 'pending' ? t('manipulation.pending') : t('manipulation.processing')}</p>
                {statusMessage && <p className="text-sm text-gray-400">{statusMessage}</p>}
            </div>
        );
    }

    if (status === 'failed') {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
                <FiAlertCircle className="w-12 h-12 mb-4" />
                <p className="font-medium text-lg">{t('manipulation.failed')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
                <FiAlertCircle className="w-8 h-8 mb-4" />
                <p className="font-medium">{t('manipulation.downloadError')}</p>
                <p className="text-sm mt-2 text-gray-500">{error}</p>
            </div>
        );
    }

    if (status === 'completed' && !hasResults) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                    <FiCheck className="w-8 h-8 text-green-500" />
                </div>
                <p className="font-medium text-lg text-gray-900 dark:text-white">{t('manipulation.noResults')}</p>
            </div>
        );
    }

    // Render single result image with label and download button
    const renderResultImage = (url, title, filename, isLoading) => (
        <div className="flex-1 space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">{title}</h4>
            <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 min-h-[250px] flex items-center justify-center">
                {isLoading ? (
                    <div className="flex flex-col items-center py-12 text-gray-500">
                        <FiLoader className="w-6 h-6 animate-spin mb-2" />
                        <span className="text-sm">{t('manipulation.loadingResults')}</span>
                    </div>
                ) : url ? (
                    <img src={url} alt={title} className="w-full h-auto" />
                ) : (
                    <span className="text-gray-400 text-sm">{t('manipulation.noVisualization')}</span>
                )}
            </div>
            {url && (
                <div className="flex justify-center">
                    <a href={url} download={filename} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        <FiDownload size={16} />{t('manipulation.downloadResult')}
                    </a>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Two-column layout for the result images */}
            <div className="flex gap-6">
                {renderResultImage(
                    predMapUrl,
                    t('manipulation.predictionMap'),
                    `trufor_pred_map_${analysisId}.png`,
                    loading && !predMapUrl
                )}
                {renderResultImage(
                    confMapUrl,
                    t('manipulation.confidenceMap'),
                    `trufor_conf_map_${analysisId}.png`,
                    loading && !confMapUrl
                )}
            </div>

            {/* Legend/Help text */}
            <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                    <FiInfo className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p className="font-medium text-gray-900 dark:text-white mb-1">{t('manipulation.resultLegendTitle')}</p>
                        <ul className="space-y-1 text-xs">
                            <li><strong>{t('manipulation.predictionMap')}:</strong> {t('manipulation.predictionMapDesc')}</li>
                            <li><strong>{t('manipulation.confidenceMap')}:</strong> {t('manipulation.confidenceMapDesc')}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Illustrated Empty State for Results
const IllustratedGuide = ({ t }) => (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="relative mb-8">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center">
                <FiShield className="w-12 h-12 text-emerald-500" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <FiZap className="w-4 h-4 text-green-500" />
            </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('manipulation.guideTitle')}</h3>
        <div className="space-y-3 text-left max-w-xs">
            {[1, 2, 3].map(i => (
                <div key={i} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{i}</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{t(`manipulation.guideStep${i}Title`)}</p>
                        <p className="text-xs text-gray-500">{t(`manipulation.guideStep${i}Desc`)}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// --- Main Component ---
const ManipulationDetectionPage = () => {
    const { images, loading: imagesLoading, fetchImages, pagination } = useImages();
    const { t } = useLanguage();

    // Wizard state
    const [currentStep, setCurrentStep] = useState(STEPS.SELECT);

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
    const [loadingReproduce, setLoadingReproduce] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Filter state
    const [filterMode, setFilterMode] = useState('all');
    const [filterTags, setFilterTags] = useState([]);
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [availableCategories, setAvailableCategories] = useState([]);

    // Fetch all available tags from backend (using dedicated endpoint for efficiency)
    useEffect(() => {
        const fetchTags = async () => {
            try {
                const tags = await api.get('/images/tags');
                setAvailableCategories(tags);
            } catch (err) {
                console.error('Error fetching tags:', err);
            }
        };
        fetchTags();
    }, []);

    // Handle reproduce analysis from Analysis Dashboard
    useEffect(() => {
        const reproduceData = sessionStorage.getItem('reproduceAnalysis');
        if (!reproduceData) return;

        const loadReproduceData = async () => {
            setLoadingReproduce(true);
            try {
                const { imageId, parameters, type } = JSON.parse(reproduceData);
                sessionStorage.removeItem('reproduceAnalysis'); // Clear after reading

                // Only handle trufor type
                if (type !== 'trufor') {
                    setLoadingReproduce(false);
                    return;
                }

                // Load source image info
                if (imageId) {
                    try {
                        const img = await api.get(`/images/${imageId}`);
                        setSelectedImage({ id: img._id, filename: img.filename });
                    } catch (err) {
                        console.error('Failed to load source image:', err);
                        showAlert(
                            t('common.warning'),
                            t('manipulation.sourceImageDeleted') || 'Source image no longer exists',
                            'warning'
                        );
                        setLoadingReproduce(false);
                        return;
                    }
                }

                // Apply parameters
                if (parameters) {
                    if (parameters.save_noiseprint !== undefined) {
                        setSaveNoiseprint(parameters.save_noiseprint);
                    }
                }

                // Navigate to configure step after a short delay
                setTimeout(() => {
                    setCurrentStep(STEPS.CONFIGURE);
                    showToast(t('analysisDashboard.parametersLoaded'), 'success');
                    setLoadingReproduce(false);
                }, 500);
            } catch (err) {
                console.error('Failed to parse reproduce data:', err);
                setLoadingReproduce(false);
            }
        };

        loadReproduceData();
    }, [t]);

    // Handle view results from Analysis Dashboard (load stored results)
    useEffect(() => {
        const viewResultsData = sessionStorage.getItem('viewResultsAnalysis');
        if (!viewResultsData) return;

        const loadViewResultsData = async () => {
            setLoadingReproduce(true);
            try {
                const { analysisId, imageId, parameters, type, results } = JSON.parse(viewResultsData);
                sessionStorage.removeItem('viewResultsAnalysis'); // Clear after reading

                // Only handle trufor type
                if (type !== 'trufor') {
                    setLoadingReproduce(false);
                    return;
                }

                // Load source image info (might be deleted but we continue anyway)
                let sourceImageDeleted = false;
                if (imageId) {
                    try {
                        const img = await api.get(`/images/${imageId}`);
                        const blob = await api.download(`/images/${imageId}/download`);
                        const url = URL.createObjectURL(blob);
                        setSelectedImage({ id: img._id, filename: img.filename, url });
                    } catch (err) {
                        console.error('Source image no longer exists:', err);
                        sourceImageDeleted = true;
                    }
                }

                // Load result info from backend - set flags for ResultsViewer to load
                if (analysisId) {
                    try {
                        setAnalysisId(analysisId);
                        setAnalysisStatus('completed');

                        // Fetch analysis to get result flags and integrity score
                        const analysisData = await api.get(`/analyses/${analysisId}`);
                        if (analysisData.results) {
                            // Set the results with flags that ResultsViewer expects
                            setAnalysisResults({
                                pred_map: analysisData.results.pred_map || true,
                                conf_map: analysisData.results.conf_map || true,
                                integrity_score: analysisData.results.integrity_score
                            });

                            // Set integrity score if available
                            if (analysisData.results.integrity_score !== undefined) {
                                setIntegrityScore(analysisData.results.integrity_score);
                            }
                        } else {
                            // If no results info, assume both images exist
                            setAnalysisResults({
                                pred_map: true,
                                conf_map: true
                            });
                        }
                    } catch (err) {
                        console.error('Failed to load analysis results:', err);
                        // Fallback: assume both images exist
                        setAnalysisResults({
                            pred_map: true,
                            conf_map: true
                        });
                    }
                }

                // Navigate to results step
                setTimeout(() => {
                    setCurrentStep(STEPS.RESULTS);
                    showToast(t('analysisDashboard.resultsLoaded') || 'Results loaded successfully', 'success');

                    if (sourceImageDeleted) {
                        setTimeout(() => {
                            showAlert(
                                t('common.warning'),
                                t('manipulation.sourceImageDeletedButResultsAvailable') || 'Source image was deleted but cached results are available',
                                'warning'
                            );
                        }, 300);
                    }
                    setLoadingReproduce(false);
                }, 500);
            } catch (err) {
                console.error('Failed to parse view results data:', err);
                setLoadingReproduce(false);
            }
        };

        loadViewResultsData();
    }, [t]);

    // Handle start analysis from Gallery (Analyze button)
    useEffect(() => {
        const startAnalysisData = sessionStorage.getItem('startAnalysis');
        if (!startAnalysisData) return;

        const loadStartAnalysisData = async () => {
            setLoadingReproduce(true);
            try {
                const { imageIds, targetPage, mode } = JSON.parse(startAnalysisData);
                sessionStorage.removeItem('startAnalysis'); // Clear after reading

                // Only handle manipulationDetection target
                if (targetPage !== 'manipulationDetection') {
                    setLoadingReproduce(false);
                    return;
                }

                // Load source image info (first image in the array)
                const imageId = imageIds && imageIds.length > 0 ? imageIds[0] : null;
                if (imageId) {
                    try {
                        const img = await api.get(`/images/${imageId}`);
                        setSelectedImage({ id: img._id, filename: img.filename });
                    } catch (err) {
                        console.error('Failed to load source image:', err);
                        showAlert(
                            t('common.warning'),
                            t('manipulation.sourceImageDeleted') || 'Source image no longer exists',
                            'warning'
                        );
                        setLoadingReproduce(false);
                        return;
                    }
                }

                // Navigate to configure step
                setTimeout(() => {
                    setCurrentStep(STEPS.CONFIGURE);
                    setLoadingReproduce(false);
                }, 300);
            } catch (err) {
                console.error('Failed to parse start analysis data:', err);
                setLoadingReproduce(false);
            }
        };

        loadStartAnalysisData();
    }, [t]);

    // Fetch images with filters
    useEffect(() => {
        if (currentStep === STEPS.SELECT) {
            const params = { page: currentPage, per_page: IMAGES_PER_PAGE };
            if (searchQuery) params.search = searchQuery;
            if (filterMode === 'tags' && filterTags.length > 0) {
                params.image_type = filterTags.join(',');
            }
            if (filterMode === 'date') {
                if (filterDateFrom) params.date_from = filterDateFrom;
                if (filterDateTo) params.date_to = filterDateTo;
            }
            fetchImages(params);
        }
    }, [fetchImages, currentPage, currentStep, searchQuery, filterMode, filterTags, filterDateFrom, filterDateTo]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterMode, filterTags, filterDateFrom, filterDateTo, searchQuery]);

    // Clear filters
    const handleClearFilters = () => {
        setFilterMode('all');
        setFilterTags([]);
        setFilterDateFrom('');
        setFilterDateTo('');
        setSearchQuery('');
        setCurrentPage(1);
    };

    // Poll for analysis status
    useEffect(() => {
        if (!analysisId || analysisStatus === 'completed' || analysisStatus === 'failed') return;
        let pollCount = 0;
        const pollInterval = setInterval(async () => {
            try {
                pollCount++;
                if (pollCount > MAX_POLL_ATTEMPTS) { clearInterval(pollInterval); setIsAnalyzing(false); showToast(t('manipulation.timeout'), 'warning'); return; }
                const analysis = await api.getAnalysisById(analysisId);
                setAnalysisStatus(analysis.status);
                setStatusMessage(analysis.status_message);
                if (analysis.status === 'completed') { setAnalysisResults(analysis.results); setIsAnalyzing(false); clearInterval(pollInterval); showToast(t('manipulation.completed'), 'success'); }
                else if (analysis.status === 'failed') { setIsAnalyzing(false); clearInterval(pollInterval); showToast(t('manipulation.failed'), 'error'); }
            } catch (err) { console.error('Error polling:', err); }
        }, POLL_INTERVAL);
        return () => clearInterval(pollInterval);
    }, [analysisId, analysisStatus, t]);

    // Handle image click
    const handleImageClick = useCallback((image) => {
        setSelectedImage(prev => prev?.id === image.id ? null : image);
    }, []);

    // Navigation
    const canNavigateToStep = (step) => {
        if (step === STEPS.SELECT) return true;
        if (step === STEPS.CONFIGURE) return !!selectedImage;
        if (step === STEPS.RESULTS) return analysisId !== null;
        return false;
    };

    const goToNextStep = () => { if (currentStep < STEPS.RESULTS) setCurrentStep(prev => prev + 1); };
    const goToPrevStep = () => { if (currentStep > STEPS.SELECT) setCurrentStep(prev => prev - 1); };

    // Run analysis
    const handleRunAnalysis = async () => {
        if (!selectedImage) { showToast(t('manipulation.selectImageFirst'), 'warning'); return; }

        setIsAnalyzing(true); setAnalysisStatus('pending'); setAnalysisResults(null); setStatusMessage(null); setCurrentStep(STEPS.RESULTS);

        try {
            const response = await api.startManipulationAnalysis(selectedImage.id, { save_noiseprint: saveNoiseprint });
            setAnalysisId(response.analysis_id);
            showToast(t('manipulation.analysisStarted'), 'success');
        } catch (err) {
            console.error('Error starting analysis:', err);
            showAlert(t('common.error'), err.message, 'error');
            setIsAnalyzing(false); setAnalysisStatus(null); setCurrentStep(STEPS.CONFIGURE);
        }
    };

    // Reset
    const handleReset = () => {
        setCurrentStep(STEPS.SELECT); setSelectedImage(null);
        setAnalysisId(null); setAnalysisStatus(null); setAnalysisResults(null); setStatusMessage(null); setIsAnalyzing(false);
        setSaveNoiseprint(false); handleClearFilters();
    };

    const canProceed = useMemo(() => {
        if (currentStep === STEPS.SELECT) return !!selectedImage;
        if (currentStep === STEPS.CONFIGURE) return true;
        return false;
    }, [currentStep, selectedImage]);

    // Render step content
    const renderStepContent = () => {
        switch (currentStep) {
            case STEPS.SELECT:
                return (
                    <div className="flex gap-4 h-full">
                        {/* Left Panel: Selected Image */}
                        <div className="w-64 flex-shrink-0 flex flex-col gap-3">
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">{t('manipulation.selectedImage')}</h3>
                                <CompactImagePreview image={selectedImage} onRemove={() => setSelectedImage(null)} t={t} />

                                {/* Instructions */}
                                <div className="mt-3 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                                    <div className="flex gap-2 items-start">
                                        <FiInfo className="text-emerald-500 flex-shrink-0 mt-0.5" size={12} />
                                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                                            {t('manipulation.selectInstructions')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Panel: Gallery with Filters */}
                        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col min-h-0">
                            {/* Filter Tabs + Search */}
                            <div className="flex flex-wrap items-center gap-2 mb-3 flex-shrink-0">
                                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                                    {[
                                        { mode: 'all', icon: FiGrid, label: t('common.all') },
                                        { mode: 'tags', icon: FiTag, label: t('filters.tags') },
                                        { mode: 'date', icon: FiCalendar, label: t('filters.date') },
                                    ].map(({ mode: m, icon: Icon, label }) => (
                                        <button
                                            key={m}
                                            onClick={() => setFilterMode(m)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${filterMode === m
                                                ? 'bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                }`}
                                        >
                                            <Icon size={12} />
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                {/* Search */}
                                <div className="relative flex-1 min-w-[150px]">
                                    <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t('gallery.searchPlaceholder')}
                                        className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            <FiX size={12} />
                                        </button>
                                    )}
                                </div>

                                {(filterMode !== 'all' || searchQuery || filterTags.length > 0) && (
                                    <button onClick={handleClearFilters} className="text-xs text-gray-500 hover:text-gray-700">
                                        {t('filters.clearFilters')}
                                    </button>
                                )}
                            </div>

                            {/* Filter Controls */}
                            {filterMode === 'tags' && (
                                <div className="flex flex-wrap gap-1.5 mb-3 flex-shrink-0">
                                    {availableCategories.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => setFilterTags(prev => prev.includes(tag) ? prev.filter(tt => tt !== tag) : [...prev, tag])}
                                            className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${filterTags.includes(tag) ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                                }`}
                                        >
                                            #{tag}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {filterMode === 'date' && (
                                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                                    <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs" />
                                    <span className="text-gray-400 text-xs">→</span>
                                    <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs" />
                                </div>
                            )}

                            {/* Image Grid */}
                            <div className="flex-1 overflow-y-auto scrollbar-custom max-h-[calc(100vh-380px)]">
                                {imagesLoading ? (
                                    <div className="grid grid-cols-6 gap-2">
                                        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                                    </div>
                                ) : images.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                        <FiImage className="w-12 h-12 mb-3" />
                                        <p className="text-sm">{t('manipulation.noImages')}</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-6 gap-2">
                                        {images.map(image => (
                                            <LazyImageCard key={image.id} image={image} isSelected={selectedImage?.id === image.id} onClick={() => handleImageClick(image)} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mt-3 flex-shrink-0">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <FiChevronLeft />
                                    </button>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{currentPage} / {pagination.totalPages}</span>
                                    <button onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))} disabled={currentPage === pagination.totalPages} className="p-2 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <FiChevronRight />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case STEPS.CONFIGURE:
                return (
                    <div className="max-w-2xl mx-auto">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('manipulation.step.configureTitle')}</h2>
                            <p className="text-gray-500">{t('manipulation.step.configureDesc')}</p>
                        </div>

                        {/* Selected Image Summary */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('manipulation.selectedImage')}</h3>
                            <CompactImagePreview image={selectedImage} onRemove={() => { setSelectedImage(null); setCurrentStep(STEPS.SELECT); }} t={t} />
                        </div>

                        {/* Options */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('manipulation.options')}</h3>
                            <label className="flex items-center justify-between cursor-pointer group">
                                <div>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('manipulation.saveNoiseprint')}</span>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('manipulation.saveNoiseprintDesc')}</p>
                                </div>
                                <div className="relative">
                                    <input type="checkbox" checked={saveNoiseprint} onChange={(e) => setSaveNoiseprint(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                </div>
                            </label>
                        </div>

                        {/* About TruFor */}
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
                            <div className="flex items-start gap-3">
                                <FiInfo className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-1">{t('manipulation.aboutTitle')}</h3>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">{t('manipulation.aboutDescription')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case STEPS.RESULTS:
                return (
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('manipulation.results')}</h2>
                            <p className="text-gray-500">{t('manipulation.step.resultsDesc')}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            {analysisId ? <ResultsViewer analysisId={analysisId} status={analysisStatus} results={analysisResults} statusMessage={statusMessage} t={t} /> : <IllustratedGuide t={t} />}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="w-full h-full flex flex-col relative">
            {/* Loading overlay for reproduce */}
            {loadingReproduce && (
                <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center gap-4 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-4 border-emerald-100 dark:border-emerald-900/30" />
                            <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-gray-900 dark:text-white">{t('analyze.loadingAnalysis') || 'Loading analysis...'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('analyze.preparingImage') || 'Preparing image for analysis'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex-shrink-0 mb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                            <FiShield className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('manipulation.title')}</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('manipulation.subtitle')}</p>
                        </div>
                    </div>
                    {currentStep > STEPS.SELECT && (
                        <button onClick={handleReset} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <FiRefreshCw size={16} />{t('manipulation.startOver')}
                        </button>
                    )}
                </div>
            </div>

            {/* Step Indicator with Navigation */}
            <div className="flex items-center justify-between gap-4 mb-4 flex-shrink-0">
                {/* Back Button */}
                <button onClick={goToPrevStep} disabled={currentStep === STEPS.SELECT}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentStep === STEPS.SELECT ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                    <FiArrowLeft size={16} />{t('common.back')}
                </button>

                {/* Step Indicator */}
                <StepIndicator currentStep={currentStep} steps={STEP_LABELS} onStepClick={setCurrentStep} canNavigate={canNavigateToStep} t={t} />

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {currentStep === STEPS.SELECT && (
                        <button onClick={goToNextStep} disabled={!canProceed}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${canProceed ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                        >
                            {t('common.next')}<FiArrowRight size={16} />
                        </button>
                    )}
                    {currentStep === STEPS.CONFIGURE && (
                        <button onClick={handleRunAnalysis} disabled={isAnalyzing}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {isAnalyzing ? <><FiLoader className="animate-spin" size={16} />{t('manipulation.analyzing')}</> : <><FiZap size={16} />{t('manipulation.analyze')}</>}
                        </button>
                    )}
                    {currentStep === STEPS.RESULTS && (
                        <button onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700">
                            <FiRefreshCw size={16} />{t('manipulation.newAnalysis')}
                        </button>
                    )}
                </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {renderStepContent()}
            </div>
        </div>
    );
};

export default ManipulationDetectionPage;
