// src/pages/CopyMovePage.jsx
/**
 * Copy-Move Detection Page
 * 
 * Detects duplicated regions within single images or across multiple images.
 * Supports both single-image and cross-image detection modes with methods 1-5.
 * 
 * ELIS Scientific Integrity Platform
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    FiCopy,
    FiImage,
    FiZap,
    FiCheck,
    FiAlertCircle,
    FiLoader,
    FiRefreshCw,
    FiChevronLeft,
    FiChevronRight,
    FiX
} from 'react-icons/fi';
import { useImages } from '../hooks/useImages';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { showAlert, showToast } from '../utils/alert';

// --- Constants ---
const IMAGES_PER_PAGE = 12;
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 60; // Max 2 minutes of polling

// Method types (keypoint only available for cross-image mode)
const METHOD_TYPES = [
    { id: 'keypoint', name: 'Keypoint', descriptionKey: 'copyMove.keypointDesc' },
    { id: 'dense', name: 'Dense', descriptionKey: 'copyMove.denseDesc' }
];

// Dense method variants (only used when method type is 'dense')
const DENSE_METHODS = [
    { id: 1, name: 'ZM-cart', description: 'Zernike Moments (Cartesian)' },
    { id: 2, name: 'ZM-polar', description: 'Zernike Moments (Polar) - Default' },
    { id: 3, name: 'PCT-cart', description: 'Polar Cosine Transform (Cartesian)' },
    { id: 4, name: 'PCT-polar', description: 'Polar Cosine Transform (Polar)' },
    { id: 5, name: 'FMT', description: 'Fourier-Mellin Transform' }
];

// Keypoint descriptor types (only used when method type is 'keypoint')
const KEYPOINT_DESCRIPTORS = [
    { id: 'cv_rsift', name: 'RootSIFT', descriptionKey: 'copyMove.descriptorRsift' },
    { id: 'cv_sift', name: 'SIFT', descriptionKey: 'copyMove.descriptorSift' },
    { id: 'vlfeat_sift_heq', name: 'VLFeat SIFT HEQ', descriptionKey: 'copyMove.descriptorVlfeat' }
];

// --- Sub-Components ---

// Image Card for Selection
const ImageCard = ({ image, isSelected, onClick, imageUrl, loading, isSecondary = false }) => {
    const { t } = useLanguage();

    return (
        <div
            className={`group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer
                ${isSelected
                    ? isSecondary
                        ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                        : 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                }`}
            onClick={onClick}
        >
            {/* Selection Indicator */}
            <div
                className={`absolute top-2 left-2 z-10 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
                    ? isSecondary
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white/80 dark:bg-black/50 border-white/50 dark:border-gray-400'
                    }`}>
                    {isSelected && <FiCheck size={14} strokeWidth={3} />}
                </div>
            </div>

            {/* Role Badge */}
            {isSelected && (
                <div className={`absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isSecondary
                    ? 'bg-amber-500 text-white'
                    : 'bg-indigo-600 text-white'
                    }`}>
                    {isSecondary ? t('copyMove.target') : t('copyMove.source')}
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
const LazyImageCard = ({ image, isSelected, onClick, isSecondary }) => {
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
            isSecondary={isSecondary}
        />
    );
};

// Results Viewer
const ResultsViewer = ({ analysisId, status, results, t }) => {
    const [matchesUrl, setMatchesUrl] = useState(null);
    const [clustersUrl, setClustersUrl] = useState(null);
    const [activeTab, setActiveTab] = useState('matches');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Clean up previous URLs
        if (matchesUrl) URL.revokeObjectURL(matchesUrl);
        if (clustersUrl) URL.revokeObjectURL(clustersUrl);
        setMatchesUrl(null);
        setClustersUrl(null);
        setError(null);

        // Debug: log what we received
        console.log('ResultsViewer useEffect triggered:', { status, results, analysisId });

        if (status !== 'completed' || !results) {
            console.log('Exiting early: status is not completed or no results');
            return;
        }

        setLoading(true);

        const loadResults = async () => {
            try {
                console.log('Loading results... matches_image:', results?.matches_image, 'clusters_image:', results?.clusters_image);

                if (results?.matches_image) {
                    console.log('Fetching matches image...');
                    try {
                        const blob = await api.download(`/analyses/${analysisId}/results/matches/download`);
                        console.log('Matches blob received:', blob);
                        setMatchesUrl(URL.createObjectURL(blob));
                    } catch (err) {
                        console.error('Failed to download matches:', err);
                        setError(`Matches: ${err.message}`);
                    }
                }
                if (results?.clusters_image) {
                    console.log('Fetching clusters image...');
                    try {
                        const blob = await api.download(`/analyses/${analysisId}/results/clusters/download`);
                        console.log('Clusters blob received:', blob);
                        setClustersUrl(URL.createObjectURL(blob));
                    } catch (err) {
                        console.error('Failed to download clusters:', err);
                        setError(prev => prev ? `${prev}, Clusters: ${err.message}` : `Clusters: ${err.message}`);
                    }
                }
            } catch (err) {
                console.error('Error loading result images:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadResults();

        return () => {
            if (matchesUrl) URL.revokeObjectURL(matchesUrl);
            if (clustersUrl) URL.revokeObjectURL(clustersUrl);
        };
    }, [status, results, analysisId]);

    if (status === 'pending' || status === 'processing') {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <FiLoader className="w-8 h-8 animate-spin mb-4" />
                <p className="font-medium">{status === 'pending' ? t('copyMove.pending') : t('copyMove.processing')}</p>
            </div>
        );
    }

    if (status === 'failed') {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
                <FiAlertCircle className="w-8 h-8 mb-4" />
                <p className="font-medium">{t('copyMove.failed')}</p>
            </div>
        );
    }

    // Show error if download failed
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
                <FiAlertCircle className="w-8 h-8 mb-4" />
                <p className="font-medium">{t('copyMove.downloadError') || 'Failed to load results'}</p>
                <p className="text-sm mt-2 text-gray-500">{error}</p>
            </div>
        );
    }

    if (status === 'completed' && (!results?.matches_image && !results?.clusters_image)) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <FiCheck className="w-8 h-8 mb-4 text-green-500" />
                <p className="font-medium">{t('copyMove.noResults')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                {results?.matches_image && (
                    <button
                        onClick={() => setActiveTab('matches')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === 'matches'
                            ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
                            : 'text-gray-500 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        {t('copyMove.matches')}
                    </button>
                )}
                {results?.clusters_image && (
                    <button
                        onClick={() => setActiveTab('clusters')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === 'clusters'
                            ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
                            : 'text-gray-500 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        {t('copyMove.clusters')}
                    </button>
                )}
            </div>

            {/* Result Image */}
            <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 min-h-[200px] flex items-center justify-center">
                {loading ? (
                    <div className="flex flex-col items-center py-12 text-gray-500">
                        <FiLoader className="w-6 h-6 animate-spin mb-2" />
                        <span className="text-sm">{t('copyMove.loadingResults') || 'Loading results...'}</span>
                    </div>
                ) : (
                    <>
                        {activeTab === 'matches' && matchesUrl && (
                            <img src={matchesUrl} alt="Matches" className="w-full h-auto" />
                        )}
                        {activeTab === 'clusters' && clustersUrl && (
                            <img src={clustersUrl} alt="Clusters" className="w-full h-auto" />
                        )}
                        {activeTab === 'matches' && !matchesUrl && !loading && (
                            <span className="text-gray-400 text-sm">{t('copyMove.noMatchesImage') || 'No matches image available'}</span>
                        )}
                        {activeTab === 'clusters' && !clustersUrl && !loading && (
                            <span className="text-gray-400 text-sm">{t('copyMove.noClustersImage') || 'No clusters image available'}</span>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// --- Main Component ---

const CopyMovePage = () => {
    const { images, loading: imagesLoading, fetchImages, pagination } = useImages();
    const { t } = useLanguage();

    // Mode: 'single' or 'cross'
    const [mode, setMode] = useState('single');

    // Image selection
    const [sourceImage, setSourceImage] = useState(null);
    const [targetImage, setTargetImage] = useState(null);

    // Detection method - now uses string type
    // Single-image mode only supports 'dense', cross-image supports both
    const [methodType, setMethodType] = useState('dense'); // 'keypoint' or 'dense'
    const [denseMethod, setDenseMethod] = useState(2); // Sub-method for dense (1-5)
    const [descriptor, setDescriptor] = useState('cv_rsift'); // Keypoint descriptor

    // When mode changes, ensure valid method type is selected
    useEffect(() => {
        if (mode === 'single' && methodType === 'keypoint') {
            setMethodType('dense');
        }
    }, [mode, methodType]);

    // Analysis state
    const [analysisId, setAnalysisId] = useState(null);
    const [analysisStatus, setAnalysisStatus] = useState(null);
    const [analysisResults, setAnalysisResults] = useState(null);
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
                    showToast(t('copyMove.timeout'), 'warning');
                    return;
                }

                const analysis = await api.getAnalysisById(analysisId);
                setAnalysisStatus(analysis.status);

                if (analysis.status === 'completed') {
                    setAnalysisResults(analysis.results);
                    setIsAnalyzing(false);
                    clearInterval(pollInterval);
                    showToast(t('copyMove.completed'), 'success');
                } else if (analysis.status === 'failed') {
                    setIsAnalyzing(false);
                    clearInterval(pollInterval);
                    showToast(t('copyMove.failed'), 'error');
                }
            } catch (err) {
                console.error('Error polling analysis status:', err);
            }
        }, POLL_INTERVAL);

        return () => clearInterval(pollInterval);
    }, [analysisId, analysisStatus, t]);

    // Handle image selection
    const handleImageClick = useCallback((image) => {
        if (mode === 'single') {
            setSourceImage(prev => prev?.id === image.id ? null : image);
            setTargetImage(null);
        } else {
            // Cross mode: first click = source, second = target
            if (!sourceImage || sourceImage.id === image.id) {
                setSourceImage(prev => prev?.id === image.id ? null : image);
            } else if (!targetImage || targetImage.id === image.id) {
                setTargetImage(prev => prev?.id === image.id ? null : image);
            } else {
                // Both selected, clicking a third replaces target
                setTargetImage(image);
            }
        }
        // Reset analysis when selection changes
        setAnalysisId(null);
        setAnalysisStatus(null);
        setAnalysisResults(null);
    }, [mode, sourceImage, targetImage]);

    // Run analysis
    const handleRunAnalysis = async () => {
        if (mode === 'single' && !sourceImage) {
            showToast(t('copyMove.selectImageFirst'), 'warning');
            return;
        }
        if (mode === 'cross' && (!sourceImage || !targetImage)) {
            showToast(t('copyMove.selectBothImages'), 'warning');
            return;
        }

        setIsAnalyzing(true);
        setAnalysisStatus('pending');
        setAnalysisResults(null);

        try {
            let response;
            if (mode === 'single') {
                // Single-image only uses dense method
                response = await api.startCopyMoveAnalysis(sourceImage.id, 'dense', denseMethod);
            } else {
                // Cross-image supports both methods
                response = await api.startCrossImageCopyMoveAnalysis(
                    sourceImage.id,
                    targetImage.id,
                    methodType,
                    denseMethod,
                    descriptor
                );
            }

            setAnalysisId(response.analysis_id);
            showToast(t('copyMove.analysisStarted'), 'success');
        } catch (err) {
            console.error('Error starting analysis:', err);
            showAlert(t('common.error'), err.message, 'error');
            setIsAnalyzing(false);
            setAnalysisStatus(null);
        }
    };

    // Reset analysis
    const handleReset = () => {
        setSourceImage(null);
        setTargetImage(null);
        setAnalysisId(null);
        setAnalysisStatus(null);
        setAnalysisResults(null);
        setIsAnalyzing(false);
    };

    // Check if ready to analyze
    const canAnalyze = mode === 'single' ? !!sourceImage : (!!sourceImage && !!targetImage);

    return (
        <div className="w-full h-full flex flex-col gap-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                        <FiCopy className="w-5 h-5" />
                    </div>
                    {t('copyMove.title')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('copyMove.subtitle')}</p>
            </div>

            {/* Main Content */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                {/* Left Panel - Configuration */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    {/* Mode Selection */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('copyMove.mode')}</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => { setMode('single'); setTargetImage(null); }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'single'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {t('copyMove.singleMode')}
                            </button>
                            <button
                                onClick={() => setMode('cross')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'cross'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {t('copyMove.crossMode')}
                            </button>
                        </div>
                    </div>

                    {/* Method Type Selection */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('copyMove.method')}</h3>

                        {/* Method Type Buttons */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            {METHOD_TYPES.map(m => {
                                const isDisabled = m.id === 'keypoint' && mode === 'single';
                                return (
                                    <button
                                        key={m.id}
                                        onClick={() => !isDisabled && setMethodType(m.id)}
                                        disabled={isDisabled}
                                        title={isDisabled ? t('copyMove.keypointCrossOnly') : ''}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${methodType === m.id
                                            ? 'bg-indigo-600 text-white'
                                            : isDisabled
                                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                    >
                                        {m.name}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Method Description */}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            {methodType === 'keypoint'
                                ? t('copyMove.keypointDesc')
                                : t('copyMove.denseDesc')
                            }
                        </p>

                        {/* Keypoint Descriptor Selector (only shown when keypoint is selected) */}
                        {methodType === 'keypoint' && mode === 'cross' && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                                    {t('copyMove.descriptorType')}
                                </label>
                                <select
                                    value={descriptor}
                                    onChange={(e) => setDescriptor(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                    {KEYPOINT_DESCRIPTORS.map(d => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    {t(KEYPOINT_DESCRIPTORS.find(d => d.id === descriptor)?.descriptionKey || '')}
                                </p>
                            </div>
                        )}

                        {/* Dense Method Variants (only shown when dense is selected) */}
                        {methodType === 'dense' && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                                    {t('copyMove.denseVariant')}
                                </label>
                                <select
                                    value={denseMethod}
                                    onChange={(e) => setDenseMethod(Number(e.target.value))}
                                    className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                    {DENSE_METHODS.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.name} - {m.description}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Selected Images */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('copyMove.selectedImages')}</h3>

                        <div className="space-y-3">
                            {/* Source Image */}
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase w-16">{t('copyMove.source')}</span>
                                {sourceImage ? (
                                    <div className="flex-1 flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                        <span className="text-sm text-gray-900 dark:text-white truncate">{sourceImage.filename}</span>
                                        <button onClick={() => setSourceImage(null)} className="text-gray-400 hover:text-gray-600">
                                            <FiX size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-400 italic">{t('copyMove.notSelected')}</span>
                                )}
                            </div>

                            {/* Target Image (Cross Mode Only) */}
                            {mode === 'cross' && (
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase w-16">{t('copyMove.target')}</span>
                                    {targetImage ? (
                                        <div className="flex-1 flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                                            <span className="text-sm text-gray-900 dark:text-white truncate">{targetImage.filename}</span>
                                            <button onClick={() => setTargetImage(null)} className="text-gray-400 hover:text-gray-600">
                                                <FiX size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">{t('copyMove.notSelected')}</span>
                                    )}
                                </div>
                            )}
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
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {isAnalyzing ? (
                                <>
                                    <FiLoader className="animate-spin" />
                                    {t('copyMove.analyzing')}
                                </>
                            ) : (
                                <>
                                    <FiZap />
                                    {t('copyMove.analyze')}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Center Panel - Image Gallery */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col min-h-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('copyMove.selectImage')}</h3>

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
                                <p className="text-sm">{t('copyMove.noImages')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {images.map(image => (
                                    <LazyImageCard
                                        key={image.id}
                                        image={image}
                                        isSelected={sourceImage?.id === image.id || targetImage?.id === image.id}
                                        onClick={() => handleImageClick(image)}
                                        isSecondary={targetImage?.id === image.id}
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
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('copyMove.results')}</h3>

                    <div className="flex-1 overflow-y-auto">
                        {analysisId ? (
                            <ResultsViewer
                                analysisId={analysisId}
                                status={analysisStatus}
                                results={analysisResults}
                                t={t}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <FiCopy className="w-12 h-12 mb-4" />
                                <p className="text-sm text-center">{t('copyMove.selectAndRun')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CopyMovePage;
