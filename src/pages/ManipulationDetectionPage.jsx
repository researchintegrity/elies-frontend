// src/pages/ManipulationDetectionPage.jsx
/**
 * Manipulation Detection Page - Wizard Format
 * 
 * Detects manipulated/forged regions in images using TruFor deep learning model.
 * Matches layout standard of Copy-Move page.
 * 
 * ELIS Scientific Integrity Platform
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    FiRefreshCw,
    FiSearch,
    FiTag,
    FiCalendar,
    FiArrowRight,
    FiArrowLeft,
    FiChevronLeft,
    FiChevronRight,
    FiLayers,
    FiGrid,
    FiX,
    FiInfo,
    FiZap,
    FiShield
} from 'react-icons/fi';
import { useImages } from '../hooks/useImages';
import { getThumbnailUrl } from '../hooks/useGallery';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { showAlert, showToast } from '../utils/alert';

// Components
import StepIndicator from '../components/manipulation/StepIndicator';
import SkeletonCard from '../components/manipulation/SkeletonCard';
import { LazyImageCard } from '../components/manipulation/ImageCard';
import ResultsViewer from '../components/manipulation/ResultsViewer';
import IllustratedGuide from '../components/manipulation/IllustratedGuide';

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

// --- Main Component ---
const ManipulationDetectionPage = () => {
    const { images, loading: imagesLoading, fetchImages, pagination } = useImages();
    const { t } = useLanguage();

    // Wizard state
    const [currentStep, setCurrentStep] = useState(STEPS.SELECT);

    // Image selection
    const [selectedImage, setSelectedImage] = useState(null);
    // Batch selection
    const [batchImages, setBatchImages] = useState([]);

    // Options
    const [saveNoiseprint, setSaveNoiseprint] = useState(false);

    // Analysis state
    const [analysisId, setAnalysisId] = useState(null);
    const [analysisStatus, setAnalysisStatus] = useState(null);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [statusMessage, setStatusMessage] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loadingReproduce, setLoadingReproduce] = useState(false);

    // Batch analysis state: [{id, imageId, filename, status, results}]
    const [batchAnalyses, setBatchAnalyses] = useState([]);
    const [currentBatchIndex, setCurrentBatchIndex] = useState(0);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Filter state
    const [filterMode, setFilterMode] = useState('all');
    const [filterTags, setFilterTags] = useState([]);
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [availableCategories, setAvailableCategories] = useState([]);

    // Fetch all available tags
    useEffect(() => {
        let isMounted = true;
        const fetchTags = async () => {
            try {
                const tags = await api.get('/images/tags');
                if (isMounted) setAvailableCategories(tags);
            } catch (err) {
                console.error('Error fetching tags:', err);
            }
        };
        fetchTags();
        return () => { isMounted = false; };
    }, []);

    // ESC key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && currentStep === STEPS.SELECT) {
                setBatchImages([]);
                setSelectedImage(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentStep]);

    // Handle reproduce analysis
    useEffect(() => {
        const reproduceData = sessionStorage.getItem('reproduceAnalysis');
        if (!reproduceData) return;
        const loadReproduceData = async () => {
            setLoadingReproduce(true);
            try {
                const { imageId, parameters, type } = JSON.parse(reproduceData);
                sessionStorage.removeItem('reproduceAnalysis');
                if (type !== 'trufor') { setLoadingReproduce(false); return; }
                if (imageId) {
                    try {
                        const img = await api.get(`/images/${imageId}`);
                        setSelectedImage({ id: img._id, filename: img.filename });
                        setBatchImages([{ id: img._id, filename: img.filename }]);
                    } catch (err) {
                        console.error(err);
                        showAlert(t('common.warning'), t('manipulation.sourceImageDeleted'), 'warning');
                        setLoadingReproduce(false);
                        return;
                    }
                }
                if (parameters?.save_noiseprint !== undefined) setSaveNoiseprint(parameters.save_noiseprint);
                setTimeout(() => {
                    setCurrentStep(STEPS.CONFIGURE);
                    showToast(t('analysisDashboard.parametersLoaded'), 'success');
                    setLoadingReproduce(false);
                }, 500);
            } catch (err) { console.error(err); setLoadingReproduce(false); }
        };
        loadReproduceData();
    }, [t]);

    // Handle view results
    useEffect(() => {
        const viewResultsData = sessionStorage.getItem('viewResultsAnalysis');
        if (!viewResultsData) return;
        const loadViewResultsData = async () => {
            setLoadingReproduce(true);
            try {
                const { analysisId: aId, imageId, type } = JSON.parse(viewResultsData);
                sessionStorage.removeItem('viewResultsAnalysis');
                if (type !== 'trufor') { setLoadingReproduce(false); return; }
                let sourceImageDeleted = false;
                if (imageId) {
                    try {
                        const img = await api.get(`/images/${imageId}`);
                        const blob = await api.download(`/images/${imageId}/download`);
                        const url = URL.createObjectURL(blob);
                        const imgObj = { id: img._id, filename: img.filename, url };
                        setSelectedImage(imgObj);
                        setBatchImages([imgObj]);
                    } catch (err) { console.error(err); sourceImageDeleted = true; }
                }
                if (aId) {
                    try {
                        setAnalysisId(aId);
                        setAnalysisStatus('completed');
                        const analysisData = await api.get(`/analyses/${aId}`);
                        setAnalysisResults(analysisData.results || { pred_map: true, conf_map: true });
                    } catch (err) {
                        console.error(err);
                        setAnalysisResults({ pred_map: true, conf_map: true });
                    }
                }
                setTimeout(() => {
                    setCurrentStep(STEPS.RESULTS);
                    showToast(t('analysisDashboard.resultsLoaded'), 'success');
                    if (sourceImageDeleted) setTimeout(() => showAlert(t('common.warning'), t('manipulation.sourceImageDeletedButResultsAvailable'), 'warning'), 300);
                    setLoadingReproduce(false);
                }, 500);
            } catch (err) { console.error(err); setLoadingReproduce(false); }
        };
        loadViewResultsData();
    }, [t]);

    // Fetch images
    useEffect(() => {
        if (currentStep === STEPS.SELECT) {
            const params = { page: currentPage, per_page: IMAGES_PER_PAGE };
            if (searchQuery) params.search = searchQuery;
            if (filterMode === 'tags' && filterTags.length > 0) params.image_type = filterTags.join(',');
            if (filterMode === 'date') {
                if (filterDateFrom) params.date_from = filterDateFrom;
                if (filterDateTo) params.date_to = filterDateTo;
            }
            fetchImages(params);
        }
    }, [fetchImages, currentPage, currentStep, searchQuery, filterMode, filterTags, filterDateFrom, filterDateTo]);

    useEffect(() => { setCurrentPage(1); }, [filterMode, filterTags, filterDateFrom, filterDateTo, searchQuery]);

    // Poll analysis (handles both single and batch)
    useEffect(() => {
        // Single analysis polling
        if (analysisId && analysisStatus !== 'completed' && analysisStatus !== 'failed' && batchAnalyses.length === 0) {
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
        }

        // Batch analysis polling
        if (batchAnalyses.length > 0 && isAnalyzing) {
            const pollInterval = setInterval(async () => {
                try {
                    const updatedAnalyses = await Promise.all(
                        batchAnalyses.map(async (item) => {
                            if (item.status === 'completed' || item.status === 'failed') return item;
                            try {
                                const analysis = await api.getAnalysisById(item.id);
                                return { ...item, status: analysis.status, results: analysis.results, statusMessage: analysis.status_message };
                            } catch (err) {
                                console.error(`Error polling ${item.id}:`, err);
                                return item;
                            }
                        })
                    );
                    setBatchAnalyses(updatedAnalyses);

                    // Check if all are done
                    const allDone = updatedAnalyses.every(a => a.status === 'completed' || a.status === 'failed');
                    if (allDone) {
                        setIsAnalyzing(false);
                        const completed = updatedAnalyses.filter(a => a.status === 'completed').length;
                        const failed = updatedAnalyses.filter(a => a.status === 'failed').length;
                        if (failed === 0) {
                            showToast(t('manipulation.batchCompleted') || `Batch complete: ${completed} images analyzed`, 'success');
                        } else {
                            showToast(`${completed} completed, ${failed} failed`, 'warning');
                        }
                        clearInterval(pollInterval);
                    }
                } catch (err) { console.error('Error polling batch:', err); }
            }, POLL_INTERVAL);
            return () => clearInterval(pollInterval);
        }
    }, [analysisId, analysisStatus, batchAnalyses, isAnalyzing, t]);

    // Image Click
    const handleImageClick = useCallback((image) => {
        setBatchImages(prev => {
            const isSelected = prev.some(img => img.id === image.id);
            if (isSelected) return prev.filter(img => img.id !== image.id);
            return [...prev, { id: image.id, filename: image.filename }];
        });
        setSelectedImage(prev => prev?.id === image.id ? null : image);
    }, []);

    // Navigation
    const canNavigateToStep = useCallback((step) => {
        if (step === STEPS.SELECT) return true;
        if (step === STEPS.CONFIGURE) return batchImages.length > 0 || !!selectedImage;
        if (step === STEPS.RESULTS) return analysisId !== null || batchAnalyses.length > 0;
        return false;
    }, [batchImages.length, selectedImage, analysisId, batchAnalyses.length]);

    const canProceed = useMemo(() => {
        if (currentStep === STEPS.SELECT) return batchImages.length > 0 || !!selectedImage;
        if (currentStep === STEPS.CONFIGURE) return true;
        return false;
    }, [currentStep, batchImages.length, selectedImage]);

    const goToNextStep = () => {
        if (currentStep < STEPS.RESULTS && canProceed) setCurrentStep(prev => prev + 1);
    };
    const goToPrevStep = () => { if (currentStep > STEPS.SELECT) setCurrentStep(prev => prev - 1); };

    const handleReset = () => {
        setCurrentStep(STEPS.SELECT);
        setBatchImages([]);
        setSelectedImage(null);
        setAnalysisId(null);
        setAnalysisStatus(null);
        setAnalysisResults(null);
        setSaveNoiseprint(false);
        setBatchAnalyses([]);
        setCurrentBatchIndex(0);
    };

    const runAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            if (batchImages.length === 0 && !selectedImage) return;

            // Single image mode
            if (batchImages.length <= 1) {
                const targetId = batchImages.length > 0 ? batchImages[0].id : selectedImage.id;
                const res = await api.startManipulationAnalysis(targetId, { save_noiseprint: saveNoiseprint });
                setAnalysisId(res.analysis_id);
                setAnalysisStatus('pending');
                setBatchAnalyses([]); // Clear batch state for single mode
                setCurrentStep(STEPS.RESULTS);
                return;
            }

            // Batch mode: start analysis for all images
            const analyses = [];
            for (const image of batchImages) {
                try {
                    const res = await api.startManipulationAnalysis(image.id, { save_noiseprint: saveNoiseprint });
                    analyses.push({
                        id: res.analysis_id,
                        imageId: image.id,
                        filename: image.filename,
                        status: 'pending',
                        results: null
                    });
                } catch (err) {
                    console.error(`Failed to start analysis for ${image.filename}:`, err);
                    analyses.push({
                        id: null,
                        imageId: image.id,
                        filename: image.filename,
                        status: 'failed',
                        results: null,
                        error: err.message
                    });
                }
            }

            setBatchAnalyses(analyses);
            setCurrentBatchIndex(0);
            setAnalysisId(null); // Clear single analysis state
            setCurrentStep(STEPS.RESULTS);
            showToast(t('manipulation.batchStarted') || `Started analysis for ${analyses.length} images`, 'info');
        } catch (err) {
            console.error(err);
            showToast(t('manipulation.failed'), 'error');
            setIsAnalyzing(false);
        }
    };

    // Render Steps
    const renderStepContent = () => {
        switch (currentStep) {
            case STEPS.SELECT:
                return (
                    <div className="flex gap-4 h-full">
                        {/* Left Panel: Selected Images (Sidebar Style) */}
                        <div className="w-64 flex-shrink-0 flex flex-col gap-3">
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex-1 flex flex-col min-h-0">
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                                    {t('manipulation.selectedImages')} ({batchImages.length})
                                </h3>

                                {batchImages.length > 0 ? (
                                    <div className="flex-1 overflow-y-auto scrollbar-custom space-y-2 min-h-0">
                                        {batchImages.map((image) => (
                                            <div key={image.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 group">
                                                <div className="w-8 h-8 rounded overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
                                                    <img
                                                        src={image.url || getThumbnailUrl(image.id)}
                                                        alt={image.filename}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { e.target.style.display = 'none' }}
                                                    />
                                                </div>
                                                <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{image.filename}</span>
                                                <button
                                                    onClick={() => handleImageClick(image)}
                                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <FiX size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-400 text-xs">
                                        {t('manipulation.noImagesSelected') || 'No images selected'}
                                    </div>
                                )}

                                {/* Instructions */}
                                <div className="mt-3 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 flex-shrink-0">
                                    <div className="flex gap-2 items-start">
                                        <FiInfo className="text-emerald-500 flex-shrink-0 mt-0.5" size={12} />
                                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                                            {t('manipulation.selectInstructions')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Panel: Gallery */}
                        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col min-h-0">
                            {/* Filters */}
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
                                            <Icon size={12} /> {label}
                                        </button>
                                    ))}
                                </div>

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
                            </div>

                            {/* Filter Logic UI */}
                            {filterMode === 'tags' && availableCategories.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3 flex-shrink-0 animate-in fade-in slide-in-from-top-1">
                                    {availableCategories.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => setFilterTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                                            className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${filterTags.includes(tag)
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                                        >
                                            #{tag}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {filterMode === 'date' && (
                                <div className="flex items-center gap-2 mb-3 px-1 animate-in fade-in slide-in-from-top-1">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-medium text-gray-500 uppercase">{t('filters.dateFrom')}</label>
                                        <input
                                            type="date"
                                            value={filterDateFrom}
                                            onChange={e => setFilterDateFrom(e.target.value)}
                                            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-medium text-gray-500 uppercase">{t('filters.dateTo')}</label>
                                        <input
                                            type="date"
                                            value={filterDateTo}
                                            onChange={e => setFilterDateTo(e.target.value)}
                                            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Grid */}
                            <div className="flex-1 overflow-y-auto scrollbar-custom max-h-[calc(100vh-320px)]">
                                {imagesLoading ? (
                                    <div className="grid grid-cols-6 gap-2">
                                        {[...Array(12)].map((_, i) => <SkeletonCard key={i} />)}
                                    </div>
                                ) : images.length > 0 ? (
                                    <div className="grid grid-cols-6 gap-2">
                                        {images.map(image => (
                                            <LazyImageCard
                                                key={image.id}
                                                image={image}
                                                isSelected={batchImages.some(img => img.id === image.id)}
                                                onClick={handleImageClick}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                        <p>{t('gallery.noImagesFound')}</p>
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {!imagesLoading && pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mt-3 flex-shrink-0">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={pagination.page <= 1} className="p-2 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <FiChevronLeft />
                                    </button>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('admin.pageInfo', { current: pagination.page, total: pagination.totalPages })}</span>
                                    <button onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))} disabled={pagination.page >= pagination.totalPages} className="p-2 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <FiChevronRight />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case STEPS.CONFIGURE:
                return (
                    <div className="max-w-2xl mx-auto h-full flex flex-col justify-center">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('manipulation.step.configureTitle')}</h2>
                            <p className="text-gray-500">{t('manipulation.step.configureDesc')}</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                {t('manipulation.selectedImages')} ({batchImages.length})
                            </h3>
                            <div className="max-h-48 overflow-y-auto scrollbar-custom space-y-2">
                                {batchImages.map((image) => (
                                    <div key={image.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                        <div className="w-10 h-10 rounded overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
                                            <img
                                                src={image.url || getThumbnailUrl(image.id)}
                                                alt={image.filename}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { e.target.style.display = 'none' }}
                                            />
                                        </div>
                                        <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{image.filename}</span>
                                        <button onClick={() => handleImageClick(image)} className="p-1 rounded text-red-500 hover:bg-red-50">
                                            <FiX size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={saveNoiseprint}
                                    onChange={e => setSaveNoiseprint(e.target.checked)}
                                    className="mt-1 w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                />
                                <div>
                                    <span className="block text-sm font-medium text-gray-900 dark:text-white">{t('manipulation.saveNoiseprint')}</span>
                                    <span className="block text-xs text-gray-500 mt-0.5">{t('manipulation.saveNoiseprintDesc')}</span>
                                </div>
                            </label>
                        </div>
                    </div>
                );

            case STEPS.RESULTS:
                return (
                    <div className="max-w-4xl mx-auto h-full flex flex-col">
                        <div className="text-center mb-6 pt-4">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('manipulation.results')}</h2>
                            <p className="text-gray-500">{t('manipulation.step.resultsDesc')}</p>
                        </div>

                        {/* Batch Mode Results */}
                        {batchAnalyses.length > 0 ? (
                            <div className="flex-1 flex flex-col min-h-0 gap-4">
                                {/* Batch Navigation */}
                                <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                                    <button
                                        onClick={() => setCurrentBatchIndex(i => Math.max(0, i - 1))}
                                        disabled={currentBatchIndex === 0}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        <FiChevronLeft /> {t('common.previous')}
                                    </button>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        <span className="font-medium">{currentBatchIndex + 1}</span> / {batchAnalyses.length}
                                        <span className="ml-2 text-xs">
                                            ({batchAnalyses.filter(a => a.status === 'completed').length} completed)
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setCurrentBatchIndex(i => Math.min(batchAnalyses.length - 1, i + 1))}
                                        disabled={currentBatchIndex === batchAnalyses.length - 1}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        {t('common.next')} <FiChevronRight />
                                    </button>
                                </div>

                                {/* Current Analysis View */}
                                {batchAnalyses[currentBatchIndex] && (
                                    <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                        <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {batchAnalyses[currentBatchIndex].filename}
                                            </p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${batchAnalyses[currentBatchIndex].status === 'completed' ? 'bg-green-100 text-green-700' :
                                                batchAnalyses[currentBatchIndex].status === 'failed' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {batchAnalyses[currentBatchIndex].status}
                                            </span>
                                        </div>
                                        {batchAnalyses[currentBatchIndex].id ? (
                                            <ResultsViewer
                                                analysisId={batchAnalyses[currentBatchIndex].id}
                                                status={batchAnalyses[currentBatchIndex].status}
                                                results={batchAnalyses[currentBatchIndex].results}
                                                statusMessage={batchAnalyses[currentBatchIndex].statusMessage}
                                            />
                                        ) : (
                                            <div className="text-center py-8 text-red-500">
                                                {batchAnalyses[currentBatchIndex].error || t('manipulation.failed')}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Batch Thumbnails */}
                                <div className="flex gap-2 overflow-x-auto scrollbar-custom pb-2 flex-shrink-0">
                                    {batchAnalyses.map((analysis, idx) => (
                                        <button
                                            key={analysis.imageId}
                                            onClick={() => setCurrentBatchIndex(idx)}
                                            className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden relative ${idx === currentBatchIndex
                                                ? 'border-emerald-500'
                                                : 'border-gray-200 dark:border-gray-600'
                                                }`}
                                        >
                                            <img
                                                src={getThumbnailUrl(analysis.imageId)}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                            <div className={`absolute bottom-0 left-0 right-0 h-1 ${analysis.status === 'completed' ? 'bg-green-500' :
                                                analysis.status === 'failed' ? 'bg-red-500' :
                                                    'bg-yellow-500 animate-pulse'
                                                }`} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* Single Mode Results */
                            <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                {analysisId ? (
                                    <ResultsViewer
                                        analysisId={analysisId}
                                        status={analysisStatus}
                                        results={analysisResults}
                                        statusMessage={statusMessage}
                                    />
                                ) : (
                                    <IllustratedGuide />
                                )}
                            </div>
                        )}
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="w-full h-full flex flex-col relative p-4 bg-gray-50 dark:bg-gray-900 overflow-hidden">
            {/* Global Loader for Reproduce/View Results actions */}
            {loadingReproduce && (
                <div className="absolute inset-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex flex-col items-center">
                        <FiRefreshCw className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                        <p className="font-medium text-gray-900 dark:text-white">{t('common.loading')}</p>
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

            {/* Navigation Bar */}
            <div className="flex items-center justify-between gap-4 mb-4 flex-shrink-0">
                <button
                    onClick={goToPrevStep}
                    disabled={currentStep === STEPS.SELECT}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentStep === STEPS.SELECT ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                    <FiArrowLeft size={16} /> {t('common.back')}
                </button>

                <StepIndicator
                    currentStep={currentStep}
                    steps={STEP_LABELS}
                    onStepClick={(step) => canNavigateToStep(step) && setCurrentStep(step)}
                    canNavigate={canNavigateToStep}
                />

                <div className="flex gap-2">
                    {currentStep === STEPS.SELECT && (
                        <button
                            onClick={goToNextStep}
                            disabled={!canProceed}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${canProceed ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                        >
                            {t('common.next')} <FiArrowRight size={16} />
                        </button>
                    )}
                    {currentStep === STEPS.CONFIGURE && (
                        <button
                            onClick={runAnalysis}
                            disabled={isAnalyzing}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {isAnalyzing ? <FiRefreshCw className="animate-spin" size={16} /> : <FiZap size={16} />}
                            {isAnalyzing ? t('manipulation.analyzing') : t('manipulation.startAnalysis')}
                        </button>
                    )}
                    {currentStep === STEPS.RESULTS && (
                        <button onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700">
                            <FiRefreshCw size={16} />{t('manipulation.newAnalysis')}
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {renderStepContent()}
            </div>
        </div>
    );
};

export default ManipulationDetectionPage;
