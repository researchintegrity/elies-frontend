// src/pages/CopyMovePage.jsx
/**
 * Copy-Move Detection Page - Streamlined UX
 * 
 * Detects duplicated regions within single images or across multiple images.
 * Combined mode selection with gallery for efficient workflow.
 * 
 * ELIS Scientific Integrity Platform
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    FiCopy,
    FiImage,
    FiZap,
    FiCheck,
    FiCheckCircle,
    FiAlertCircle,
    FiLoader,
    FiRefreshCw,
    FiChevronLeft,
    FiChevronRight,
    FiX,
    FiSettings,
    FiChevronDown,
    FiChevronUp,
    FiArrowRight,
    FiArrowLeft,
    FiInfo,
    FiDownload,
    FiLayers,
    FiGrid,
    FiTarget,
    FiSearch,
    FiTag,
    FiCalendar
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
const POLL_INTERVAL = 2000;
const MAX_POLL_ATTEMPTS = 60;

// Wizard Steps (simplified - mode is part of select)
const STEPS = {
    SELECT: 0,
    CONFIGURE: 1,
    RESULTS: 2
};

const STEP_LABELS = ['select', 'configure', 'results'];

// Method types
const METHOD_TYPES = [
    { id: 'keypoint', name: 'Feature Matching', descriptionKey: 'copyMove.keypointDesc', icon: FiTarget },
    { id: 'dense', name: 'Block Matching', descriptionKey: 'copyMove.denseDesc', icon: FiGrid }
];

// Dense method variants
const DENSE_METHODS = [
    { id: 1, name: 'ZM-cart', description: 'Zernike Moments (Cartesian)' },
    { id: 2, name: 'ZM-polar', description: 'Zernike Moments (Polar) - Default' },
    { id: 3, name: 'PCT-cart', description: 'Polar Cosine Transform (Cartesian)' },
    { id: 4, name: 'PCT-polar', description: 'Polar Cosine Transform (Polar)' },
    { id: 5, name: 'FMT', description: 'Fourier-Mellin Transform' }
];

// Keypoint descriptors
const KEYPOINT_DESCRIPTORS = [
    { id: 'cv_rsift', name: 'RootSIFT', descriptionKey: 'copyMove.descriptorRsift' },
    { id: 'cv_sift', name: 'SIFT', descriptionKey: 'copyMove.descriptorSift' },
    { id: 'vlfeat_sift_heq', name: 'VLFeat SIFT HEQ', descriptionKey: 'copyMove.descriptorVlfeat' }
];

// --- Skeleton Components ---
const SkeletonCard = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="aspect-square bg-gray-200 dark:bg-gray-700" />
        <div className="p-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
    </div>
);

// --- Sub-Components ---

// Step Indicator (simplified to 3 steps)
const StepIndicator = ({ currentStep, steps, onStepClick, canNavigate, t }) => {
    return (
        <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                const isClickable = canNavigate(index);

                return (
                    <React.Fragment key={step}>
                        {index > 0 && (
                            <div className={`h-0.5 w-8 transition-colors ${isCompleted ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        )}
                        <button
                            onClick={() => isClickable && onStepClick(index)}
                            disabled={!isClickable}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : isCompleted
                                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200'
                                    : isClickable
                                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-white/20' : isCompleted ? 'bg-indigo-500 text-white' : 'bg-gray-300 dark:bg-gray-600'
                                }`}>
                                {isCompleted ? <FiCheck size={12} /> : index + 1}
                            </span>
                            <span className="hidden sm:inline">{t(`copyMove.step.${step}`)}</span>
                        </button>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

// Mode Toggle (compact inline toggle)
const ModeToggle = ({ mode, onModeChange, t }) => (
    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
            onClick={() => onModeChange('single')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${mode === 'single'
                ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
        >
            <FiImage size={16} />
            {t('copyMove.singleMode')}
        </button>
        <button
            onClick={() => onModeChange('cross')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${mode === 'cross'
                ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
        >
            <FiLayers size={16} />
            {t('copyMove.crossMode')}
        </button>
    </div>
);

// Image Card for Selection
const ImageCard = ({ image, isSelected, onClick, imageUrl, loading, role, t }) => {
    return (
        <div
            className={`group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer ${isSelected
                ? role === 'target'
                    ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                    : 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                }`}
            onClick={onClick}
        >
            {/* Selection Indicator */}
            <div className={`absolute top-2 left-2 z-10 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
                    ? role === 'target'
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white/80 dark:bg-black/50 border-white/50'
                    }`}>
                    {isSelected && <FiCheck size={14} strokeWidth={3} />}
                </div>
            </div>

            {/* Role Badge */}
            {isSelected && role && (
                <div className={`absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${role === 'target' ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white'
                    }`}>
                    {t(`copyMove.${role}`)}
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
const LazyImageCard = ({ image, isSelected, onClick, role, t }) => {
    // Use thumbnail URL directly - browser handles caching
    const imageUrl = image?.id ? getThumbnailUrl(image.id) : null;

    return <ImageCard image={image} isSelected={isSelected} onClick={onClick} imageUrl={imageUrl} loading={false} role={role} t={t} />;
};

// Compact Selected Image Preview - uses thumbnail URL for fast loading
const CompactImagePreview = ({ image, label, color, onRemove, t }) => {
    // Use thumbnail URL directly - browser handles caching
    const imageUrl = image?.id ? getThumbnailUrl(image.id) : null;

    if (!image) {
        return (
            <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <FiImage className="text-gray-400" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <span className={`text-[10px] font-bold uppercase ${color === 'amber' ? 'text-amber-500' : 'text-indigo-500'}`}>{label}</span>
                    <p className="text-xs text-gray-400 italic truncate">{t('copyMove.notSelected')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 p-2 rounded-lg border ${color === 'amber' ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20' : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20'}`}>
            <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                {imageUrl ? (
                    <img src={imageUrl} alt={image.filename} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full animate-pulse bg-gray-200 dark:bg-gray-700" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <span className={`text-[10px] font-bold uppercase ${color === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{label}</span>
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{image.filename}</p>
            </div>
            <button onClick={onRemove} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600">
                <FiX size={14} />
            </button>
        </div>
    );
};

// Illustrated Empty State for Results
const IllustratedGuide = ({ t }) => (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="relative mb-8">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
                <FiCopy className="w-12 h-12 text-indigo-500" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <FiZap className="w-4 h-4 text-green-500" />
            </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('copyMove.guideTitle')}</h3>
        <div className="space-y-3 text-left max-w-xs">
            {[1, 2, 3].map(i => (
                <div key={i} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{i}</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{t(`copyMove.guideStep${i}Title`)}</p>
                        <p className="text-xs text-gray-500">{t(`copyMove.guideStep${i}Desc`)}</p>
                    </div>
                </div>
            ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">{t('copyMove.guideFooter')}</p>
    </div>
);

// Results Viewer
const ResultsViewer = ({ analysisId, status, results, t }) => {
    const [matchesUrl, setMatchesUrl] = useState(null);
    const [clustersUrl, setClustersUrl] = useState(null);
    const [activeTab, setActiveTab] = useState('matches');
    const [loading, setLoading] = useState(false);
    const [, setError] = useState(null);

    useEffect(() => {
        if (matchesUrl) URL.revokeObjectURL(matchesUrl);
        if (clustersUrl) URL.revokeObjectURL(clustersUrl);
        setMatchesUrl(null); setClustersUrl(null); setError(null);
        if (status !== 'completed' || !results) return;
        setLoading(true);

        const loadResults = async () => {
            try {
                if (results?.matches_image) {
                    const blob = await api.download(`/analyses/${analysisId}/results/matches/download`);
                    setMatchesUrl(URL.createObjectURL(blob));
                }
                if (results?.clusters_image) {
                    const blob = await api.download(`/analyses/${analysisId}/results/clusters/download`);
                    setClustersUrl(URL.createObjectURL(blob));
                }
            } catch (err) { setError(err.message); }
            finally { setLoading(false); }
        };
        loadResults();
        return () => { if (matchesUrl) URL.revokeObjectURL(matchesUrl); if (clustersUrl) URL.revokeObjectURL(clustersUrl); };
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

    if (status === 'completed' && (!results?.matches_image && !results?.clusters_image)) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                    <FiCheck className="w-8 h-8 text-green-500" />
                </div>
                <p className="font-medium text-lg text-gray-900 dark:text-white">{t('copyMove.noResults')}</p>
                <p className="text-sm text-gray-500 mt-2">{t('copyMove.noResultsDesc')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                {results?.matches_image && (
                    <button onClick={() => setActiveTab('matches')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'matches' ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent'}`}>
                        {t('copyMove.matches')}
                    </button>
                )}
                {results?.clusters_image && (
                    <button onClick={() => setActiveTab('clusters')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'clusters' ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent'}`}>
                        {t('copyMove.clusters')}
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
            {(matchesUrl || clustersUrl) && (
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
                </div>
            )}
        </div>
    );
};

// --- Main Component ---
const CopyMovePage = ({ onNavigate }) => {
    const { images, loading: imagesLoading, fetchImages, pagination } = useImages();
    const { t } = useLanguage();

    // Wizard state (simplified - starts at SELECT)
    const [currentStep, setCurrentStep] = useState(STEPS.SELECT);

    // Mode: 'single' or 'cross' (default to single)
    const [mode, setMode] = useState('single');

    // Image selection
    const [sourceImage, setSourceImage] = useState(null);
    const [targetImage, setTargetImage] = useState(null);

    // Detection method
    const [methodType, setMethodType] = useState('dense');
    const [denseMethod, setDenseMethod] = useState(2);
    const [descriptor, setDescriptor] = useState('cv_rsift');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Analysis state
    const [analysisId, setAnalysisId] = useState(null);
    const [analysisStatus, setAnalysisStatus] = useState(null);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loadingReproduce, setLoadingReproduce] = useState(false);

    // Batch analysis state
    const [batchMode, setBatchMode] = useState(false);
    const [batchImages, setBatchImages] = useState([]);  // Array of {id, filename}
    const [batchResults, setBatchResults] = useState([]);  // Array of {imageId, analysisId, status, results}
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Filter state
    const [filterMode, setFilterMode] = useState('all'); // 'all' | 'tags' | 'date' | 'similar'
    const [filterTags, setFilterTags] = useState([]);
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [availableCategories, setAvailableCategories] = useState([]);

    // Similarity search state
    const [similarityResults, setSimilarityResults] = useState([]);
    const [loadingSimilarity, setLoadingSimilarity] = useState(false);
    const [similarityPage, setSimilarityPage] = useState(1);
    const SIMILARITY_PER_PAGE = 12;

    // Reset similarity results when source is deselected
    useEffect(() => {
        if (!sourceImage) {
            setSimilarityResults([]);
            setSimilarityPage(1);
            if (filterMode === 'similar') setFilterMode('all');
        }
    }, [sourceImage, filterMode]);

    // ESC key to clear selection
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && currentStep === STEPS.SELECT) {
                setBatchImages([]);
                setSourceImage(null);
                setTargetImage(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentStep]);

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
                const { imageId, targetImageId, parameters, type } = JSON.parse(reproduceData);
                sessionStorage.removeItem('reproduceAnalysis'); // Clear after reading

                // Only handle copy-move types
                if (!['single_image_copy_move', 'cross_image_copy_move'].includes(type)) {
                    setLoadingReproduce(false);
                    return;
                }

                // Set mode based on analysis type
                const isCrossMode = type === 'cross_image_copy_move';
                setMode(isCrossMode ? 'cross' : 'single');

                // Load source image info
                if (imageId) {
                    try {
                        const img = await api.get(`/images/${imageId}`);
                        setSourceImage({ id: img._id, filename: img.filename });
                    } catch (err) {
                        console.error('Failed to load source image:', err);
                        showAlert(
                            t('common.warning'),
                            t('copyMove.sourceImageDeleted') || 'Source image no longer exists',
                            'warning'
                        );
                        setLoadingReproduce(false);
                        return;
                    }
                }

                // Load target image info for cross-image mode
                let targetDeleted = false;
                if (isCrossMode && targetImageId) {
                    try {
                        const img = await api.get(`/images/${targetImageId}`);
                        setTargetImage({ id: img._id, filename: img.filename });
                    } catch (err) {
                        console.error('Failed to load target image:', err);
                        targetDeleted = true;
                    }
                }

                // Apply parameters
                if (parameters) {
                    if (parameters.method) {
                        setMethodType(parameters.method);
                    }
                    if (parameters.dense_method !== null && parameters.dense_method !== undefined) {
                        setDenseMethod(parameters.dense_method);
                    }
                    if (parameters.descriptor) {
                        setDescriptor(parameters.descriptor);
                    }
                }

                // Navigate to configure step after a short delay to allow state updates
                setTimeout(() => {
                    setCurrentStep(STEPS.CONFIGURE);
                    showToast(t('analysisDashboard.parametersLoaded'), 'success');

                    // Show warning about deleted target image after the success toast
                    if (targetDeleted) {
                        setTimeout(() => {
                            showAlert(
                                t('common.warning'),
                                t('copyMove.targetImageDeleted') || 'Target image no longer exists',
                                'warning'
                            );
                        }, 300);
                    }
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
                const { analysisId, imageId, targetImageId, parameters, type, results } = JSON.parse(viewResultsData);
                sessionStorage.removeItem('viewResultsAnalysis'); // Clear after reading

                // Only handle copy-move types
                if (!['single_image_copy_move', 'cross_image_copy_move'].includes(type)) {
                    setLoadingReproduce(false);
                    return;
                }

                const isCrossMode = type === 'cross_image_copy_move';
                setMode(isCrossMode ? 'cross' : 'single');

                // Load source image info (might be deleted but we continue anyway)
                let sourceImageDeleted = false;
                if (imageId) {
                    try {
                        const img = await api.get(`/images/${imageId}`);
                        setSourceImage({ id: img._id, filename: img.filename });
                    } catch (err) {
                        console.error('Source image no longer exists:', err);
                        sourceImageDeleted = true;
                    }
                }

                // Load target image for cross-mode
                let targetImageDeleted = false;
                if (isCrossMode && targetImageId) {
                    try {
                        const img = await api.get(`/images/${targetImageId}`);
                        setTargetImage({ id: img._id, filename: img.filename });
                    } catch (err) {
                        console.error('Target image no longer exists:', err);
                        targetImageDeleted = true;
                    }
                }

                // Load result info from backend - set flags for ResultsViewer to load
                if (analysisId) {
                    try {
                        setAnalysisId(analysisId);
                        setAnalysisStatus('completed');

                        // Fetch analysis to get result flags
                        const analysisData = await api.get(`/analyses/${analysisId}`);
                        if (analysisData.results) {
                            // Set the results with flags that ResultsViewer expects
                            setAnalysisResults({
                                matches_image: analysisData.results.matches_image || true,
                                clusters_image: analysisData.results.clusters_image || true
                            });
                        } else {
                            // If no results info, assume matches and clusters exist
                            setAnalysisResults({
                                matches_image: true,
                                clusters_image: true
                            });
                        }
                    } catch (err) {
                        console.error('Failed to load analysis results:', err);
                        // Fallback: assume both images exist
                        setAnalysisResults({
                            matches_image: true,
                            clusters_image: true
                        });
                    }
                }

                // Navigate to results step
                setTimeout(() => {
                    setCurrentStep(STEPS.RESULTS);
                    showToast(t('analysisDashboard.resultsLoaded') || 'Results loaded successfully', 'success');

                    if (sourceImageDeleted || targetImageDeleted) {
                        setTimeout(() => {
                            const message = sourceImageDeleted && targetImageDeleted
                                ? t('copyMove.bothImagesDeleted') || 'Source and target images were deleted but cached results are available'
                                : sourceImageDeleted
                                    ? t('copyMove.sourceImageDeletedButResultsAvailable') || 'Source image was deleted but cached results are available'
                                    : t('copyMove.targetImageDeletedButResultsAvailable') || 'Target image was deleted but cached results are available';
                            showAlert(t('common.warning'), message, 'warning');
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
                const { imageIds, targetPage, mode: analysisMode } = JSON.parse(startAnalysisData);
                sessionStorage.removeItem('startAnalysis'); // Clear after reading

                // Only handle copyMove target
                if (targetPage !== 'copyMove') {
                    setLoadingReproduce(false);
                    return;
                }

                // Handle batch mode - load all images
                if (analysisMode === 'batch' && imageIds && imageIds.length > 0) {
                    setBatchMode(true);
                    setMode('single'); // Batch uses single-image analysis for each
                    const loadedImages = [];
                    let failedCount = 0;

                    for (const imgId of imageIds) {
                        try {
                            const img = await api.get(`/images/${imgId}`);
                            loadedImages.push({ id: img._id, filename: img.filename });
                        } catch (err) {
                            console.error(`Failed to load image ${imgId}:`, err);
                            failedCount++;
                        }
                    }

                    if (loadedImages.length === 0) {
                        showAlert(
                            t('common.error'),
                            t('copyMove.allImagesDeleted') || 'All selected images no longer exist',
                            'error'
                        );
                        setLoadingReproduce(false);
                        return;
                    }

                    setBatchImages(loadedImages);

                    if (failedCount > 0) {
                        showToast(`${failedCount} ${t('copyMove.imagesNotFound') || 'image(s) could not be loaded'}`, 'warning');
                    }

                    // Navigate to configure step
                    setTimeout(() => {
                        setCurrentStep(STEPS.CONFIGURE);
                        setLoadingReproduce(false);
                    }, 300);
                    return;
                }

                // Set mode based on the trigger
                const isCrossMode = analysisMode === 'cross';
                setMode(isCrossMode ? 'cross' : 'single');

                // Load source image info (first image)
                const sourceId = imageIds && imageIds.length > 0 ? imageIds[0] : null;
                if (sourceId) {
                    try {
                        const img = await api.get(`/images/${sourceId}`);
                        setSourceImage({ id: img._id, filename: img.filename });
                    } catch (err) {
                        console.error('Failed to load source image:', err);
                        showAlert(
                            t('common.warning'),
                            t('copyMove.sourceImageDeleted') || 'Source image no longer exists',
                            'warning'
                        );
                        setLoadingReproduce(false);
                        return;
                    }
                }

                // Load target image for cross mode (second image)
                if (isCrossMode && imageIds.length > 1) {
                    const targetId = imageIds[1];
                    try {
                        const img = await api.get(`/images/${targetId}`);
                        setTargetImage({ id: img._id, filename: img.filename });
                    } catch (err) {
                        console.error('Failed to load target image:', err);
                        showAlert(
                            t('common.warning'),
                            t('copyMove.targetImageDeleted') || 'Target image no longer exists',
                            'warning'
                        );
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

    // Fetch images with filters when on select step
    useEffect(() => {
        if (currentStep === STEPS.SELECT) {
            // Build filter params
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

    // Handle similarity search
    const handleSimilaritySearch = async () => {
        if (!sourceImage) {
            showToast(t('copyMove.selectSourceForSimilar'), 'warning');
            return;
        }
        setLoadingSimilarity(true);
        try {
            const response = await api.post('/cbir/search/sync', {
                image_id: sourceImage.id,
                top_k: 24,
                labels: null
            });
            const filtered = response.matches.filter(m => m.image_id !== sourceImage.id && m.similarity_score >= 0.3);
            setSimilarityResults(filtered);
            setFilterMode('similar');
            if (filtered.length === 0) {
                showToast(t('copyMove.noSimilarFound'), 'info');
            } else {
                showToast(`${t('similarity.found')} ${filtered.length} ${t('similarity.similarImages')}`, 'success');
            }
        } catch (err) {
            console.error('Similarity search error:', err);
            showToast(t('similarity.searchError'), 'error');
        } finally {
            setLoadingSimilarity(false);
        }
    };

    // Clear filters
    const handleClearFilters = () => {
        setFilterMode('all');
        setFilterTags([]);
        setFilterDateFrom('');
        setFilterDateTo('');
        setSearchQuery('');
        setSimilarityResults([]);
        setCurrentPage(1);
    };


    // Clear target when switching to single mode
    useEffect(() => {
        if (mode === 'single') {
            setTargetImage(null);
            if (methodType === 'keypoint') setMethodType('dense');
        }
    }, [mode, methodType]);

    // Poll for analysis status
    useEffect(() => {
        if (!analysisId || analysisStatus === 'completed' || analysisStatus === 'failed') return;
        let pollCount = 0;
        const pollInterval = setInterval(async () => {
            try {
                pollCount++;
                if (pollCount > MAX_POLL_ATTEMPTS) { clearInterval(pollInterval); setIsAnalyzing(false); showToast(t('copyMove.timeout'), 'warning'); return; }
                const analysis = await api.getAnalysisById(analysisId);
                setAnalysisStatus(analysis.status);
                if (analysis.status === 'completed') { setAnalysisResults(analysis.results); setIsAnalyzing(false); clearInterval(pollInterval); showToast(t('copyMove.completed'), 'success'); }
                else if (analysis.status === 'failed') { setIsAnalyzing(false); clearInterval(pollInterval); showToast(t('copyMove.failed'), 'error'); }
            } catch (err) { console.error('Error polling:', err); }
        }, POLL_INTERVAL);
        return () => clearInterval(pollInterval);
    }, [analysisId, analysisStatus, t]);

    // Handle image selection - supports multi-selection for batch mode in single mode
    const handleImageClick = useCallback((image) => {
        if (mode === 'single') {
            // Toggle selection in batch images array for multi-selection
            setBatchImages(prev => {
                const isSelected = prev.some(img => img.id === image.id);
                if (isSelected) {
                    return prev.filter(img => img.id !== image.id);
                } else {
                    return [...prev, { id: image.id, filename: image.filename }];
                }
            });
            // Also update single selection for backwards compatibility
            setSourceImage(prev => prev?.id === image.id ? null : image);
        } else {
            // Cross mode - original behavior
            if (!sourceImage || sourceImage.id === image.id) {
                setSourceImage(prev => prev?.id === image.id ? null : image);
            } else if (!targetImage || targetImage.id === image.id) {
                setTargetImage(prev => prev?.id === image.id ? null : image);
            } else {
                setTargetImage(image);
            }
        }
    }, [mode, sourceImage, targetImage]);

    const getImageRole = (image) => {
        if (mode === 'single') {
            // For single mode, check batchImages array
            if (batchImages.some(img => img.id === image.id)) return 'source';
        } else {
            if (sourceImage?.id === image.id) return 'source';
            if (targetImage?.id === image.id) return 'target';
        }
        return null;
    };

    // Navigation
    const canNavigateToStep = (step) => {
        if (step === STEPS.SELECT) return true;
        if (step === STEPS.CONFIGURE) {
            if (mode === 'single') return batchImages.length > 0 || !!sourceImage;
            return !!sourceImage && !!targetImage;
        }
        if (step === STEPS.RESULTS) return analysisId !== null || batchResults.length > 0;
        return false;
    };

    const goToNextStep = () => {
        if (currentStep < STEPS.RESULTS) {
            // Enable batch mode if multiple images selected in single mode
            if (currentStep === STEPS.SELECT && mode === 'single') {
                if (batchImages.length > 1) {
                    setBatchMode(true);
                } else if (batchImages.length === 1) {
                    setBatchMode(false);
                    setSourceImage(batchImages[0]);
                }
            }
            setCurrentStep(prev => prev + 1);
        }
    };
    const goToPrevStep = () => { if (currentStep > STEPS.SELECT) setCurrentStep(prev => prev - 1); };

    // Run single/cross analysis
    const handleRunAnalysis = async () => {
        if (mode === 'single' && !sourceImage) { showToast(t('copyMove.selectImageFirst'), 'warning'); return; }
        if (mode === 'cross' && (!sourceImage || !targetImage)) { showToast(t('copyMove.selectBothImages'), 'warning'); return; }

        setIsAnalyzing(true); setAnalysisStatus('pending'); setAnalysisResults(null); setCurrentStep(STEPS.RESULTS);

        try {
            let response;
            if (mode === 'single') {
                response = await api.startCopyMoveAnalysis(sourceImage.id, 'dense', denseMethod);
            } else {
                response = await api.startCrossImageCopyMoveAnalysis(sourceImage.id, targetImage.id, methodType, denseMethod, descriptor);
            }
            setAnalysisId(response.analysis_id);
            showToast(t('copyMove.analysisStarted'), 'success');
        } catch (err) {
            console.error('Error starting analysis:', err);
            showAlert(t('common.error'), err.message, 'error');
            setIsAnalyzing(false); setAnalysisStatus(null); setCurrentStep(STEPS.CONFIGURE);
        }
    };

    // Run batch analysis - submit all to queue, then poll in parallel
    const handleRunBatchAnalysis = async () => {
        if (batchImages.length === 0) {
            showToast(t('copyMove.noImagesSelected') || 'No images selected', 'warning');
            return;
        }

        setIsAnalyzing(true);
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
                    const response = await api.startCopyMoveAnalysis(image.id, 'dense', denseMethod);
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

        setIsAnalyzing(false);
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

    // Reset
    const handleReset = () => {
        setCurrentStep(STEPS.SELECT); setMode('single'); setSourceImage(null); setTargetImage(null);
        setAnalysisId(null); setAnalysisStatus(null); setAnalysisResults(null); setIsAnalyzing(false);
        setMethodType('dense'); setDenseMethod(2); setDescriptor('cv_rsift'); setShowAdvanced(false);
        // Clear filters
        setFilterMode('all'); setFilterTags([]); setFilterDateFrom(''); setFilterDateTo('');
        setSearchQuery(''); setSimilarityResults([]);
        // Reset batch state
        setBatchMode(false); setBatchImages([]); setBatchResults([]); setBatchProgress({ current: 0, total: 0 });
    };

    const canProceed = useMemo(() => {
        if (currentStep === STEPS.SELECT) {
            if (mode === 'single') return batchImages.length > 0;
            return !!sourceImage && !!targetImage;
        }
        if (currentStep === STEPS.CONFIGURE) {
            if (batchMode) return batchImages.length > 0;
            return true;
        }
        return false;
    }, [currentStep, mode, sourceImage, targetImage, batchMode, batchImages]);


    // specific handler for mode change to set default values
    const handleModeChange = (newMode) => {
        setMode(newMode);
        if (newMode === 'cross') {
            setMethodType('keypoint');
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case STEPS.SELECT:
                return (
                    <div className="flex gap-4 h-full">
                        {/* Left Panel: Summary + Mode + Selected Images */}
                        <div className="w-64 flex-shrink-0 flex flex-col gap-3">
                            {/* Mode Toggle */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">{t('copyMove.mode')}</h3>
                                <ModeToggle mode={mode} onModeChange={handleModeChange} t={t} />
                            </div>

                            {/* Selected Images */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex-1">
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                                    {mode === 'single' ? `${t('copyMove.selectedImages') || 'Selected Images'} (${batchImages.length})` : t('copyMove.selectedImages')}
                                </h3>

                                {mode === 'single' ? (
                                    /* Batch Images List for Single Mode */
                                    batchImages.length > 0 ? (
                                        <div className="max-h-40 overflow-y-auto scrollbar-custom space-y-2">
                                            {batchImages.map((image) => (
                                                <div key={image.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                                    <div className="w-8 h-8 rounded overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
                                                        <img
                                                            src={getThumbnailUrl(image.id)}
                                                            alt={image.filename}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{image.filename}</span>
                                                    <button
                                                        onClick={() => setBatchImages(prev => prev.filter(img => img.id !== image.id))}
                                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600"
                                                    >
                                                        <FiX size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-gray-400 text-xs">
                                            {t('copyMove.noImagesSelected') || 'No images selected'}
                                        </div>
                                    )
                                ) : (
                                    /* Cross Mode - Source/Target Images */
                                    <div className="space-y-2">
                                        <CompactImagePreview image={sourceImage} label={t('copyMove.source')} color="indigo" onRemove={() => setSourceImage(null)} t={t} />
                                        <CompactImagePreview image={targetImage} label={t('copyMove.target')} color="amber" onRemove={() => setTargetImage(null)} t={t} />
                                    </div>
                                )}

                                {/* Instructions */}
                                <div className="mt-3 p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                                    <div className="flex gap-2 items-start">
                                        <FiInfo className="text-indigo-500 flex-shrink-0 mt-0.5" size={12} />
                                        <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                                            {mode === 'single' ? t('copyMove.selectMultiple') || 'Click to select images for batch analysis' : t('copyMove.selectInstructionsCross')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Panel: Image Gallery with Filters */}
                        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col min-h-0">
                            {/* Filter Tabs + Search */}
                            <div className="flex flex-wrap items-center gap-2 mb-3 flex-shrink-0">
                                {/* Filter Mode Tabs */}
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
                                                ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                }`}
                                        >
                                            <Icon size={12} />
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                {/* Similar Button (for cross-image mode) */}
                                {mode === 'cross' && sourceImage && (
                                    <button
                                        onClick={handleSimilaritySearch}
                                        disabled={loadingSimilarity}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${filterMode === 'similar'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200'
                                            }`}
                                    >
                                        {loadingSimilarity ? <FiLoader className="animate-spin" size={12} /> : <FiTarget size={12} />}
                                        {t('provenance.findSimilar')}
                                    </button>
                                )}

                                {/* Search Input */}
                                <div className="relative flex-1 min-w-[150px]">
                                    <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t('gallery.searchPlaceholder')}
                                        className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            <FiX size={12} />
                                        </button>
                                    )}
                                </div>

                                {/* Clear Filters */}
                                {(filterMode !== 'all' || searchQuery || filterTags.length > 0) && (
                                    <button onClick={handleClearFilters} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                        {t('filters.clearFilters')}
                                    </button>
                                )}
                            </div>

                            {/* Filter-specific Controls */}
                            {filterMode === 'tags' && (
                                <div className="flex flex-wrap gap-1.5 mb-3 flex-shrink-0">
                                    {availableCategories.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => setFilterTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                                            className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${filterTags.includes(tag)
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                        >
                                            #{tag}
                                        </button>
                                    ))}
                                    {availableCategories.length === 0 && (
                                        <span className="text-xs text-gray-400 italic">{t('filters.noTagsAvailable')}</span>
                                    )}
                                </div>
                            )}

                            {filterMode === 'date' && (
                                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                                    <input
                                        type="date"
                                        value={filterDateFrom}
                                        onChange={(e) => setFilterDateFrom(e.target.value)}
                                        className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                        placeholder={t('filters.dateFrom')}
                                    />
                                    <span className="text-gray-400 text-xs">→</span>
                                    <input
                                        type="date"
                                        value={filterDateTo}
                                        onChange={(e) => setFilterDateTo(e.target.value)}
                                        className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                                        placeholder={t('filters.dateTo')}
                                    />
                                </div>
                            )}

                            {filterMode === 'similar' && similarityResults.length > 0 && (
                                <div className="mb-3 p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 flex-shrink-0 flex items-center justify-between">
                                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                                        {t('similarity.found')} <strong>{similarityResults.length}</strong> {t('similarity.similarImages')}
                                    </p>
                                    <span className="text-[10px] text-indigo-500">
                                        {t('common.page')} {similarityPage}/{Math.ceil(similarityResults.length / SIMILARITY_PER_PAGE)}
                                    </span>
                                </div>
                            )}

                            {/* Image Grid */}
                            <div className="flex-1 overflow-y-auto scrollbar-custom max-h-[calc(100vh-420px)]">
                                {imagesLoading ? (
                                    <div className="grid grid-cols-6 gap-2">
                                        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                                    </div>
                                ) : filterMode === 'similar' && similarityResults.length > 0 ? (
                                    /* Show paginated similarity results */
                                    <div className="grid grid-cols-6 gap-2">
                                        {similarityResults
                                            .slice((similarityPage - 1) * SIMILARITY_PER_PAGE, similarityPage * SIMILARITY_PER_PAGE)
                                            .map((result, idx) => {
                                                const img = { id: result.image_id, filename: result.filename || `Image ${result.image_id.slice(0, 8)}` };
                                                const score = result.similarity_score;
                                                const rank = (similarityPage - 1) * SIMILARITY_PER_PAGE + idx + 1;
                                                // Score color
                                                const scoreColor = score >= 0.8 ? 'bg-green-500' : score >= 0.6 ? 'bg-emerald-500' : score >= 0.4 ? 'bg-amber-500' : 'bg-orange-500';
                                                return (
                                                    <div key={result.image_id} className="relative group">
                                                        <LazyImageCard image={img} isSelected={targetImage?.id === result.image_id} onClick={() => handleImageClick(img)} role={getImageRole(img)} t={t} />
                                                        {/* Score Badge - top left */}
                                                        <div className={`absolute top-1 left-1 ${scoreColor} text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-1`}>
                                                            <span>#{rank}</span>
                                                            <span className="opacity-80">•</span>
                                                            <span>{(score * 100).toFixed(0)}%</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                ) : images.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                        <FiImage className="w-12 h-12 mb-3" />
                                        <p className="text-sm">{t('copyMove.noImages')}</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-6 gap-2">
                                        {images.map(image => (
                                            <LazyImageCard key={image.id} image={image} isSelected={mode === 'single' ? batchImages.some(img => img.id === image.id) : (sourceImage?.id === image.id || targetImage?.id === image.id)} onClick={() => handleImageClick(image)} role={getImageRole(image)} t={t} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Pagination - for both modes */}
                            {filterMode === 'similar' && similarityResults.length > SIMILARITY_PER_PAGE && (
                                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mt-3 flex-shrink-0">
                                    <button onClick={() => setSimilarityPage(p => Math.max(1, p - 1))} disabled={similarityPage === 1} className="p-2 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <FiChevronLeft />
                                    </button>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{similarityPage} / {Math.ceil(similarityResults.length / SIMILARITY_PER_PAGE)}</span>
                                    <button onClick={() => setSimilarityPage(p => Math.min(Math.ceil(similarityResults.length / SIMILARITY_PER_PAGE), p + 1))} disabled={similarityPage >= Math.ceil(similarityResults.length / SIMILARITY_PER_PAGE)} className="p-2 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <FiChevronRight />
                                    </button>
                                </div>
                            )}
                            {filterMode !== 'similar' && pagination.totalPages > 1 && (
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
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                {batchMode ? t('copyMove.batchConfigureTitle') || 'Configure Batch Analysis' : t('copyMove.step.configureTitle')}
                            </h2>
                            <p className="text-gray-500">
                                {batchMode ? t('copyMove.batchConfigureDesc') || 'These settings will apply to all selected images' : t('copyMove.step.configureDesc')}
                            </p>
                        </div>

                        {/* Selected Images Summary - Batch or Normal */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                {batchMode ? `${t('copyMove.selectedImages') || 'Selected Images'} (${batchImages.length})` : t('copyMove.selectedImages')}
                            </h3>

                            {batchMode ? (
                                /* Batch Images Panel */
                                <div className="max-h-48 overflow-y-auto scrollbar-custom space-y-2">
                                    {batchImages.map((image) => (
                                        <div key={image.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                            <div className="w-10 h-10 rounded overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
                                                <img
                                                    src={getThumbnailUrl(image.id)}
                                                    alt={image.filename}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{image.filename}</span>
                                            <button
                                                onClick={() => setBatchImages(prev => prev.filter(img => img.id !== image.id))}
                                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600"
                                            >
                                                <FiX size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* Normal Single/Cross Images */
                                <div className={`grid gap-3 ${mode === 'cross' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    <CompactImagePreview image={sourceImage} label={t('copyMove.source')} color="indigo" onRemove={() => { setSourceImage(null); setCurrentStep(STEPS.SELECT); }} t={t} />
                                    {mode === 'cross' && <CompactImagePreview image={targetImage} label={t('copyMove.target')} color="amber" onRemove={() => { setTargetImage(null); setCurrentStep(STEPS.SELECT); }} t={t} />}
                                </div>
                            )}
                        </div>

                        {/* Method Selection */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('copyMove.method')}</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {METHOD_TYPES.map(m => {
                                    const isDisabled = m.id === 'keypoint' && mode === 'single';
                                    const Icon = m.icon;
                                    return (
                                        <button key={m.id} onClick={() => !isDisabled && setMethodType(m.id)} disabled={isDisabled}
                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left ${methodType === m.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                : isDisabled ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${methodType === m.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                                <Icon size={16} />
                                            </div>
                                            <div>
                                                <span className={`block text-sm font-medium ${methodType === m.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>{m.name}</span>
                                                <span className="text-[10px] text-gray-500">{t(m.descriptionKey)}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            {mode === 'single' && <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1"><FiInfo size={10} />{t('copyMove.keypointCrossOnly')}</p>}
                        </div>

                        {/* Advanced Options */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <div className="flex items-center gap-2">
                                    <FiSettings className="text-gray-400" size={16} />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('copyMove.advancedOptions')}</span>
                                </div>
                                {showAdvanced ? <FiChevronUp /> : <FiChevronDown />}
                            </button>
                            {showAdvanced && (
                                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                                    {methodType === 'keypoint' && mode === 'cross' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('copyMove.descriptorType')}</label>
                                            <select value={descriptor} onChange={(e) => setDescriptor(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm">
                                                {KEYPOINT_DESCRIPTORS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {methodType === 'dense' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('copyMove.denseVariant')}</label>
                                            <select value={denseMethod} onChange={(e) => setDenseMethod(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm">
                                                {DENSE_METHODS.map(m => <option key={m.id} value={m.id}>{m.name} - {m.description}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );

            case STEPS.RESULTS:
                return (
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                {batchMode ? t('copyMove.batchResults') || 'Batch Analysis Results' : t('copyMove.results')}
                            </h2>
                            <p className="text-gray-500">
                                {batchMode ? t('copyMove.batchResultsDesc') || 'Results for all analyzed images' : t('copyMove.step.resultsDesc')}
                            </p>
                            {batchMode && (
                                <button
                                    onClick={() => onNavigate && onNavigate('analysisDashboard')}
                                    className="mt-4 inline-flex items-center gap-3 px-8 py-5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors group w-full max-w-2xl justify-center"
                                >
                                    <FiInfo className="text-indigo-500 group-hover:scale-110 transition-transform flex-shrink-0" size={24} />
                                    <span className="text-lg font-medium text-indigo-700 dark:text-indigo-300">
                                        {t('copyMove.batchDashboardNotice') || 'Individual results are available in the Analysis Dashboard'}
                                    </span>
                                    <FiArrowRight className="text-indigo-400 group-hover:translate-x-1 transition-transform flex-shrink-0" size={20} />
                                </button>
                            )}
                        </div>

                        {/* Batch Results View */}
                        {batchMode ? (
                            <div className="space-y-4">
                                {/* Progress Bar */}
                                {isAnalyzing && (
                                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {t('copyMove.analyzing') || 'Analyzing'} {batchProgress.current} / {batchProgress.total}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Results Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {batchResults.map((result, idx) => (
                                        <div key={result.imageId || idx} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
                                                    <img
                                                        src={getThumbnailUrl(result.imageId)}
                                                        alt={result.filename}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{result.filename}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {result.status === 'queued' && (
                                                            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                                <FiLoader size={12} /> {t('copyMove.queued') || 'Queued'}
                                                            </span>
                                                        )}
                                                        {result.status === 'processing' && (
                                                            <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                                                                <FiLoader className="animate-spin" size={12} /> {t('copyMove.processing') || 'Processing'}
                                                            </span>
                                                        )}
                                                        {result.status === 'completed' && (
                                                            <span className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400">
                                                                <FiCheckCircle size={12} /> {t('copyMove.complete') || 'Complete'}
                                                            </span>
                                                        )}
                                                        {result.status === 'failed' && (
                                                            <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                                                <FiAlertCircle size={12} /> {t('copyMove.failed') || 'Failed'}
                                                            </span>
                                                        )}
                                                        {result.status === 'timeout' && (
                                                            <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                                                                <FiAlertCircle size={12} /> {t('copyMove.timeout') || 'Timeout'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {result.results?.num_matches !== undefined && (
                                                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-gray-500">{t('copyMove.matches') || 'Matches'}</span>
                                                        <span className={`text-sm font-semibold ${result.results.num_matches > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                                            {result.results.num_matches}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* Single Result View */
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                {analysisId ? <ResultsViewer analysisId={analysisId} status={analysisStatus} results={analysisResults} t={t} /> : <IllustratedGuide t={t} />}
                            </div>
                        )}
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
                            <div className="w-16 h-16 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30" />
                            <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" />
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
                        <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                            <FiCopy className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('copyMove.title')}</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('copyMove.subtitle')}</p>
                        </div>
                    </div>
                    {currentStep > STEPS.SELECT && (
                        <button onClick={handleReset} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <FiRefreshCw size={16} />{t('copyMove.startOver')}
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

                {/* Step Indicator (centered) */}
                <StepIndicator currentStep={currentStep} steps={STEP_LABELS} onStepClick={setCurrentStep} canNavigate={canNavigateToStep} t={t} />

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {currentStep === STEPS.SELECT && (
                        <button onClick={goToNextStep} disabled={!canProceed}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${canProceed ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                        >
                            {t('common.next')}<FiArrowRight size={16} />
                        </button>
                    )}
                    {currentStep === STEPS.CONFIGURE && (
                        <button onClick={batchMode ? handleRunBatchAnalysis : handleRunAnalysis} disabled={isAnalyzing || (batchMode && batchImages.length === 0)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isAnalyzing ? <><FiLoader className="animate-spin" size={16} />{batchMode ? t('copyMove.analyzingBatch') || 'Analyzing...' : t('copyMove.analyzing')}</> : <><FiZap size={16} />{batchMode ? t('copyMove.analyzeBatch') || `Analyze ${batchImages.length} Images` : t('copyMove.analyze')}</>}
                        </button>
                    )}
                    {currentStep === STEPS.RESULTS && (
                        <button onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700">
                            <FiRefreshCw size={16} />{t('copyMove.newAnalysis')}
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

export default CopyMovePage;
