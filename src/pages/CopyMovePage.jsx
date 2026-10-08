// src/pages/CopyMovePage.jsx
/**
 * Copy-Move Detection Page - Streamlined UX
 *
 * Detects duplicated regions within single images or across multiple images.
 * Combined mode selection with gallery for efficient workflow.
 *
 * ELIES Scientific Integrity Platform
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    FiCopy,
    FiZap,
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
    FiLayers,
    FiGrid,
    FiTarget,
    FiSearch,
    FiTag,
    FiCalendar,
    FiLoader,
    FiLink,
    FiCheck,
    FiImage,
    FiAlertCircle
} from 'react-icons/fi';
import { useImages } from '../hooks/useImages';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { showAlert, showToast } from '../utils/alert';

// Constants & Utils
import {
    IMAGES_PER_PAGE,
    POLL_INTERVAL,
    maxPollAttempts,
    methodSupportsMode,
    STEPS,
    STEP_LABELS,
    METHOD_TYPES,
    DENSE_METHODS,
    KEYPOINT_DESCRIPTORS,
    SIMILARITY_PER_PAGE
} from './CopyMove/constants';
import { getThumbnailUrl } from './CopyMove/utils';

// Components
import SkeletonCard from './CopyMove/components/SkeletonCard';
import StepIndicator from './CopyMove/components/StepIndicator';
import ModeToggle from './CopyMove/components/ModeToggle';
import LazyImageCard from './CopyMove/components/LazyImageCard';
import CompactImagePreview from './CopyMove/components/CompactImagePreview';
import IllustratedGuide from './CopyMove/components/IllustratedGuide';
import ResultsViewer from './CopyMove/components/ResultsViewer';

// Hooks
import { useCopyMoveInitialization } from './CopyMove/hooks/useCopyMoveInitialization';
import { useBatchAnalysis } from './CopyMove/hooks/useBatchAnalysis';
import { useSimilaritySearch } from './CopyMove/hooks/useSimilaritySearch';

const CopyMovePage = ({ onNavigate }) => {
    const { images, loading: imagesLoading, fetchImages, pagination } = useImages();
    const { t } = useLanguage();

    // Wizard state
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
    const [isLinkingAsRelated, setIsLinkingAsRelated] = useState(false);
    const [linkedAsRelated, setLinkedAsRelated] = useState(false);

    // Filter state
    const [currentPage, setCurrentPage] = useState(1);
    const [filterMode, setFilterMode] = useState('all'); // 'all' | 'tags' | 'date' | 'similar'
    const [filterTags, setFilterTags] = useState([]);
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [availableCategories, setAvailableCategories] = useState([]);

    // Custom Hooks
    const {
        batchMode,
        setBatchMode,
        batchImages,
        setBatchImages,
        batchResults,
        batchProgress,
        isAnalyzingBatch,
        startBatchAnalysis,
        resetBatch
    } = useBatchAnalysis(t);

    const {
        similarityResults,
        loadingSimilarity,
        similarityPage,
        setSimilarityPage,
        handleSimilaritySearch,
        clearSimilarity
    } = useSimilaritySearch(sourceImage, filterMode, setFilterMode, t);

    // Initialization Logic
    useCopyMoveInitialization({
        setLoadingReproduce,
        setMode,
        setSourceImage,
        setTargetImage,
        setMethodType,
        setDenseMethod,
        setDescriptor,
        setCurrentStep,
        setAnalysisId,
        setAnalysisStatus,
        setAnalysisResults,
        setBatchMode,
        setBatchImages,
        t
    });

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
    }, [currentStep, setBatchImages]);

    // Fetch all available tags from backend
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
        clearSimilarity();
        setCurrentPage(1);
    };

    // Clear target when switching to single mode; keep a method the mode supports
    useEffect(() => {
        if (mode === 'single') setTargetImage(null);
        if (!methodSupportsMode(methodType, mode)) setMethodType(mode === 'cross' ? 'keypoint' : 'dense');
    }, [mode, methodType]);

    // Poll for single analysis status
    useEffect(() => {
        if (!analysisId || analysisStatus === 'completed' || analysisStatus === 'failed') return;
        let pollCount = 0;
        const pollInterval = setInterval(async () => {
            try {
                pollCount++;
                if (pollCount > maxPollAttempts(methodType)) { clearInterval(pollInterval); setIsAnalyzing(false); showToast(t('copyMove.timeout'), 'warning'); return; }
                const analysis = await api.getAnalysisById(analysisId);
                setAnalysisStatus(analysis.status);
                if (analysis.status === 'completed') { setAnalysisResults(analysis.results); setIsAnalyzing(false); clearInterval(pollInterval); showToast(t('copyMove.completed'), 'success'); }
                else if (analysis.status === 'failed') { setIsAnalyzing(false); clearInterval(pollInterval); showToast(t('copyMove.failed'), 'error'); }
            } catch (err) { console.error('Error polling:', err); }
        }, POLL_INTERVAL);
        return () => clearInterval(pollInterval);
    }, [analysisId, analysisStatus, methodType, t]);

    // Handle image selection
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
    }, [mode, sourceImage, targetImage, setBatchImages]);

    const getImageRole = (image) => {
        if (mode === 'single') {
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
                response = await api.startCopyMoveAnalysis(sourceImage.id, parseInt(denseMethod, 10), methodType);
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

    // Reset
    const handleReset = () => {
        setCurrentStep(STEPS.SELECT); setMode('single'); setSourceImage(null); setTargetImage(null);
        setAnalysisId(null); setAnalysisStatus(null); setAnalysisResults(null); setIsAnalyzing(false);
        setMethodType('dense'); setDenseMethod(2); setDescriptor('cv_rsift'); setShowAdvanced(false);
        handleClearFilters();
        resetBatch();
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

    const handleModeChange = (newMode) => {
        setMode(newMode);
        if (newMode === 'cross') {
            setMethodType('keypoint');
        } else if (newMode === 'single') {
            setMethodType('dense');
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
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                {METHOD_TYPES.map(m => {
                                    const isDisabled = !m.modes.includes(mode);
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
                            {mode === 'cross' && <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1"><FiInfo size={10} />{t('copyMove.forgeryscopeSingleOnly')}</p>}
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
                                    {methodType === 'forgeryscope' && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('copyMove.forgeryscopeNoOptions')}</p>
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
                                {isAnalyzingBatch && (
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
                                                        {/* Status display logic */}
                                                        {['queued', 'processing'].includes(result.status) && <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400"><FiLoader className={result.status === 'processing' ? 'animate-spin' : ''} size={12} /> {t(`copyMove.${result.status}`) || result.status}</span>}
                                                        {result.status === 'completed' && <span className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400"><FiCheck size={12} /> {t('copyMove.complete') || 'Complete'}</span>}
                                                        {(result.status === 'failed' || result.status === 'timeout') && <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400"><FiAlertCircle size={12} /> {t(`copyMove.${result.status}`) || result.status}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            {result.results?.verdict && (
                                                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                                    <span className="text-xs text-gray-500">{t('copyMove.verdict')}</span>
                                                    <span className={`text-sm font-semibold ${result.results.verdict === 'duplicated' ? 'text-amber-600' : 'text-green-600'}`}>
                                                        {result.results.verdict === 'duplicated'
                                                            ? `${t('copyMove.duplicationFound')} (${result.results.detections?.length || 0})`
                                                            : t('copyMove.noDuplication')}
                                                    </span>
                                                </div>
                                            )}
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

                                {/* Mark as Related button for cross-image analysis */}
                                {mode === 'cross' && sourceImage && targetImage && analysisStatus === 'completed' && (
                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <button
                                            onClick={async () => {
                                                setIsLinkingAsRelated(true);
                                                try {
                                                    await api.createRelationship(
                                                        sourceImage.id,
                                                        targetImage.id,
                                                        'cross_copy_move',
                                                        1.0,
                                                        { analysis_id: analysisId }
                                                    );
                                                    setLinkedAsRelated(true);
                                                    showToast(t('copyMove.linkedAsRelated') || 'Images linked as related', 'success');
                                                } catch (err) {
                                                    console.error('Error linking as related:', err);
                                                    showToast(t('copyMove.linkError') || 'Failed to link images', 'error');
                                                } finally {
                                                    setIsLinkingAsRelated(false);
                                                }
                                            }}
                                            disabled={isLinkingAsRelated || linkedAsRelated}
                                            className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${linkedAsRelated
                                                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'
                                                : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800'
                                                }`}
                                        >
                                            {linkedAsRelated ? (
                                                <>
                                                    <FiCheck size={16} />
                                                    {t('copyMove.linkedAsRelatedDone') || 'Images linked as related'}
                                                </>
                                            ) : isLinkingAsRelated ? (
                                                <>
                                                    <FiLoader className="animate-spin" size={16} />
                                                    {t('copyMove.linking') || 'Linking...'}
                                                </>
                                            ) : (
                                                <>
                                                    <FiLink size={16} />
                                                    {t('copyMove.markAsRelated') || 'Mark these images as related'}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
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
                        <button onClick={() => batchMode ? startBatchAnalysis(denseMethod, setCurrentStep, methodType) : handleRunAnalysis()} disabled={isAnalyzing || isAnalyzingBatch || (batchMode && batchImages.length === 0)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isAnalyzing || isAnalyzingBatch ? <><FiLoader className="animate-spin" size={16} />{batchMode || isAnalyzingBatch ? t('copyMove.analyzingBatch') || 'Analyzing...' : t('copyMove.analyzing')}</> : <><FiZap size={16} />{batchMode ? t('copyMove.analyzeBatch') || `Analyze ${batchImages.length} Images` : t('copyMove.analyze')}</>}
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
