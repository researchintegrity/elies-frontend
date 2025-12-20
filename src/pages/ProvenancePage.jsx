// src/pages/ProvenancePage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    FiShare2,
    FiX,
    FiRefreshCw,
    FiAlertTriangle,
    FiCheck,
    FiChevronLeft,
    FiChevronRight,
    FiChevronDown,
    FiChevronUp,
    FiTarget,
    FiGitBranch,
    FiLayers,
    FiZap,
    FiInfo,
} from 'react-icons/fi';
import { api } from '../services/api';
import { showAlert, showToast } from '../utils/alert';
import { useLanguage } from '../context/LanguageContext';
import { SkeletonCard, EmptyState } from '../components/common';
import ProvenanceGraph from '../components/ProvenanceGraph';

// --- Constants ---
const IMAGES_PER_PAGE = 24;
const PAIRS_PER_PAGE = 6;
const DESCRIPTOR_TYPES = [
    { value: 'cv_rsift', label: 'RootSIFT (Recommended)' },
    { value: 'cv_sift', label: 'SIFT' },
    { value: 'vlfeat_sift_heq', label: 'VLFeat SIFT HEQ' },
];
const POLL_INTERVAL = 3000; // 3 seconds

// --- Sub-Components ---

// Collapsible Section Component
const CollapsibleSection = ({
    title,
    description,
    stepNumber,
    children,
    defaultOpen = false,
    headerActions = null,
    statusBadge = null
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300">
            <div
                className={`p-3 sm:p-5 flex flex-wrap items-center justify-between gap-3 cursor-pointer ${isOpen ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                        {stepNumber}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            {title}
                            {statusBadge}
                        </h3>
                        {!isOpen && description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px] sm:max-w-md">
                                {description}
                            </p>
                        )}
                        {isOpen && description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {headerActions && (
                        <div onClick={e => e.stopPropagation()}>
                            {headerActions}
                        </div>
                    )}
                    <button
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                    >
                        {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                    <div className="p-3 sm:p-5">
                        {children}
                    </div>
                </div>
            )}
        </section>
    );
};

// Image Card for Source Selection Gallery
const SourceImageCard = ({ image, isSelected, onClick, imageUrl, loading, error }) => (
    <div
        onClick={onClick}
        className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 border-2 ${isSelected
            ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg scale-[1.02]'
            : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            }`}
    >
        <div className="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
            {loading ? (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ) : error ? (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <FiAlertTriangle size={24} />
                </div>
            ) : (
                <img
                    src={imageUrl}
                    alt={image.filename}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                />
            )}
        </div>

        {isSelected && (
            <div className="absolute top-2 right-2 bg-emerald-600 text-white p-1.5 rounded-full shadow-lg">
                <FiCheck size={14} strokeWidth={3} />
            </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <p className="text-white text-xs font-medium truncate">{image.filename}</p>
            {image.imageType?.length > 0 && (
                <div className="flex gap-1 mt-1 overflow-hidden">
                    {image.imageType.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-white/20 text-white rounded">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    </div>
);

// Status Badge component
const StatusBadge = ({ status, t }) => {
    const getStatusStyle = () => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'processing':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'failed':
                return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    const getStatusLabel = () => {
        switch (status) {
            case 'completed': return t('provenance.completed');
            case 'processing': return t('provenance.processing');
            case 'pending': return t('provenance.pending');
            case 'failed': return t('provenance.failed');
            default: return status;
        }
    };

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ml-2 ${getStatusStyle()}`}>
            {getStatusLabel()}
        </span>
    );
};

// Matched Pair Card
const MatchedPairCard = ({ pair, getImageUrl }) => {
    const img1Url = getImageUrl(pair.image1_id);
    const img2Url = getImageUrl(pair.image2_id);
    const sourceIsImg1 = pair.source_image_id ? pair.source_image_id === pair.image1_id : true; // Heuristic if not provided

    return (
        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500/30 transition-colors">
            {/* Image 1 */}
            <div className="flex-shrink-0 relative group">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 ring-1 ring-gray-900/5 dark:ring-white/10">
                    {img1Url ? (
                        <img src={img1Url} alt="Image 1" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">IMG</div>
                    )}
                </div>
                <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                    {pair.image1_filename || 'Image 1'}
                </div>
                <p className="text-[10px] text-gray-500 mt-1 text-center truncate w-16 font-medium">
                    {pair.shared_area_img1?.toFixed(1) || 0}%
                </p>
            </div>

            {/* Connection indicator */}
            <div className="flex flex-col items-center gap-1 flex-1">
                <div className="w-full h-px bg-gray-300 dark:bg-gray-600 relative">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-50 dark:bg-gray-800 px-2">
                        <FiGitBranch className="text-emerald-500 rotate-90" size={16} />
                    </div>
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-1">
                    {pair.matched_keypoints} pts
                </span>
            </div>

            {/* Image 2 */}
            <div className="flex-shrink-0 relative group">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 ring-1 ring-gray-900/5 dark:ring-white/10">
                    {img2Url ? (
                        <img src={img2Url} alt="Image 2" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">IMG</div>
                    )}
                </div>
                <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                    {pair.image2_filename || 'Image 2'}
                </div>
                <p className="text-[10px] text-gray-500 mt-1 text-center truncate w-16 font-medium">
                    {pair.shared_area_img2?.toFixed(1) || 0}%
                </p>
            </div>
        </div>
    );
};

// --- Main Component ---

const ProvenancePage = () => {
    const { t } = useLanguage();

    // Gallery State
    const [images, setImages] = useState([]);
    const [imageUrls, setImageUrls] = useState({});
    const [loadingImages, setLoadingImages] = useState(true);
    const [loadingUrls, setLoadingUrls] = useState({});
    const [errorImages, setErrorImages] = useState(null);

    // Selection State
    const [selectedImage, setSelectedImage] = useState(null);

    // Analysis Parameters
    const [topK, setTopK] = useState(10);
    const [topQ, setTopQ] = useState(5);
    const [maxDepth, setMaxDepth] = useState(3);
    const [descriptorType, setDescriptorType] = useState('cv_rsift');

    // Analysis State
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisId, setAnalysisId] = useState(null);
    const [analysisStatus, setAnalysisStatus] = useState(null);
    const [analysisResults, setAnalysisResults] = useState(null);

    // Service Health
    const [serviceHealthy, setServiceHealthy] = useState(null);

    // Pagination States
    const [galleryPage, setGalleryPage] = useState(1);
    const [totalImages, setTotalImages] = useState(0);
    const [pairsPage, setPairsPage] = useState(1); // For matched pairs pagination
    const [gravity, setGravity] = useState(0.05);

    // Polling ref
    const pollIntervalRef = useRef(null);

    // Check service health on mount
    useEffect(() => {
        const checkHealth = async () => {
            try {
                const health = await api.checkProvenanceHealth();
                setServiceHealthy(health.healthy);
            } catch {
                setServiceHealthy(false);
            }
        };
        checkHealth();
    }, []);

    // Fetch images
    useEffect(() => {
        fetchImages(galleryPage);
    }, [galleryPage]);

    // Load image URLs
    useEffect(() => {
        const loadImageUrls = async () => {
            for (const img of images) {
                if (!imageUrls[img.id] && !loadingUrls[img.id]) {
                    setLoadingUrls(p => ({ ...p, [img.id]: true }));
                    try {
                        const blob = await api.download(`/images/${img.id}/download`);
                        const url = URL.createObjectURL(blob);
                        setImageUrls(p => ({ ...p, [img.id]: url }));
                    } catch (_err) {
                        console.error(`Error loading image ${img.id}:`, _err);
                    } finally {
                        setLoadingUrls(p => ({ ...p, [img.id]: false }));
                    }
                }
            }
        };

        if (images.length > 0) {
            loadImageUrls();
        }
    }, [images]);

    // Poll for analysis status
    useEffect(() => {
        if (analysisId && analyzing) {
            pollIntervalRef.current = setInterval(async () => {
                try {
                    const result = await api.getAnalysisById(analysisId);
                    setAnalysisStatus(result.status);

                    if (result.status === 'completed') {
                        console.log('Provenance API response:', JSON.stringify(result, null, 2));
                        setAnalysisResults(result.results || {});
                        setAnalyzing(false);
                        clearInterval(pollIntervalRef.current);
                        showToast(t('provenance.completed'), 'success');
                    } else if (result.status === 'failed') {
                        setAnalyzing(false);
                        clearInterval(pollIntervalRef.current);
                        showAlert(t('common.error'), result.error || t('provenance.failed'), 'error');
                    }
                } catch (err) {
                    console.error('Error polling analysis:', err);
                }
            }, POLL_INTERVAL);
        }

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [analysisId, analyzing, t]);

    // Fetch images for analysis results (graph nodes) that might not be in the current gallery page
    useEffect(() => {
        const loadResultImages = async () => {
            if (!analysisResults?.graph?.nodes) return;

            const nodesToLoad = analysisResults.graph.nodes.filter(
                node => !imageUrls[node.id] && !loadingUrls[node.id]
            );

            if (nodesToLoad.length === 0) return;

            // Mark all as loading to prevent duplicate fetches
            setLoadingUrls(prev => {
                const next = { ...prev };
                nodesToLoad.forEach(n => next[n.id] = true);
                return next;
            });

            // Fetch concurrently
            await Promise.all(nodesToLoad.map(async (node) => {
                try {
                    const blob = await api.download(`/images/${node.id}/download`);
                    const url = URL.createObjectURL(blob);
                    setImageUrls(prev => ({ ...prev, [node.id]: url }));
                } catch (err) {
                    console.error(`Error loading graph node image ${node.id}:`, err);
                } finally {
                    setLoadingUrls(prev => ({ ...prev, [node.id]: false }));
                }
            }));
        };

        loadResultImages();
    }, [analysisResults]);

    const fetchImages = useCallback(async (page = 1) => {
        setLoadingImages(true);
        setErrorImages(null);
        try {
            const data = await api.get('/images', { page, per_page: IMAGES_PER_PAGE });

            let imageList = [];
            let total = 0;

            if (Array.isArray(data)) {
                imageList = data;
                total = data.length >= IMAGES_PER_PAGE ? page * IMAGES_PER_PAGE + 1 : (page - 1) * IMAGES_PER_PAGE + data.length;
            } else if (data && typeof data === 'object') {
                imageList = data.items || data.images || [];
                total = data.total || data.total_count || imageList.length;
            }

            const limitedImageList = imageList.slice(0, IMAGES_PER_PAGE);

            const transformed = limitedImageList.map(img => ({
                id: img._id,
                imageId: img._id,
                filename: img.filename,
                uploadedDate: img.uploaded_date,
                fileSize: img.file_size,
                sourceType: img.source_type,
                imageType: img.image_type || []
            }));

            setImages(transformed);
            setTotalImages(total);
        } catch (err) {
            console.error('Error fetching images:', err);
            setErrorImages(err.message);
        } finally {
            setLoadingImages(false);
        }
    }, []);

    const handleAnalyze = async () => {
        if (!selectedImage) {
            showAlert(t('common.warning'), t('provenance.selectImageFirst'), 'warning');
            return;
        }

        setAnalyzing(true);
        setAnalysisResults(null);
        setAnalysisStatus('pending');
        setPairsPage(1); // Reset pairs pagination

        try {
            const response = await api.startProvenanceAnalysis(selectedImage.id, {
                k: topK,
                q: topQ,
                max_depth: maxDepth,
                descriptor_type: descriptorType
            });

            setAnalysisId(response.analysis_id);
            showToast(t('provenance.analyzing'), 'info');
        } catch (err) {
            console.error('Provenance analysis error:', err);
            setAnalyzing(false);
            setAnalysisStatus(null);
            showAlert(t('common.error'), err.message || t('provenance.failed'), 'error');
        }
    };

    const handleClearResults = () => {
        setAnalysisResults(null);
        setAnalysisId(null);
        setAnalysisStatus(null);
        setSelectedImage(null);
        setPairsPage(1);
    };

    const totalGalleryPages = Math.ceil(totalImages / IMAGES_PER_PAGE);

    const handlePageChange = useCallback((newPage) => {
        const maxPage = Math.max(1, totalGalleryPages);
        const boundedPage = Math.min(Math.max(1, newPage), maxPage);
        if (boundedPage !== galleryPage) {
            setGalleryPage(boundedPage);
        }
    }, [galleryPage, totalGalleryPages]);

    const handlePairsPageChange = useCallback((newPage) => {
        if (!analysisResults?.matched_pairs) return;
        const maxPage = Math.ceil(analysisResults.matched_pairs.length / PAIRS_PER_PAGE);
        const boundedPage = Math.min(Math.max(1, newPage), maxPage);
        if (boundedPage !== pairsPage) {
            setPairsPage(boundedPage);
        }
    }, [pairsPage, analysisResults]);

    const getImageUrl = useCallback((imageId) => {
        return imageUrls[imageId] || null;
    }, [imageUrls]);

    // Calculate pagination for matched pairs
    const currentPairs = analysisResults?.matched_pairs
        ? analysisResults.matched_pairs.slice((pairsPage - 1) * PAIRS_PER_PAGE, pairsPage * PAIRS_PER_PAGE)
        : [];
    const totalPairs = analysisResults?.matched_pairs?.length || 0;
    const totalPairsPages = Math.ceil(totalPairs / PAIRS_PER_PAGE);

    return (
        <div className="flex flex-col h-full bg-bg-main dark:bg-bg-main overflow-hidden">
            {/* Header */}
            <header className="flex-none px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200 dark:border-gray-800 bg-bg-main dark:bg-bg-main z-30">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2 sm:gap-3">
                            <FiShare2 className="text-emerald-600" />
                            {t('provenance.title')}
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">
                            {t('provenance.subtitle')}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Service Health Indicator */}
                        {serviceHealthy !== null && (
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${serviceHealthy
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                <span className={`w-2 h-2 rounded-full ${serviceHealthy ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                {serviceHealthy ? 'Service Online' : t('provenance.serviceUnavailable')}
                            </div>
                        )}

                        {analysisResults && (
                            <button
                                onClick={handleClearResults}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                <FiX /> {t('cbir.clearSearch')}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
                    {/* Step 1: Select Query Image */}
                    <CollapsibleSection
                        title={t('provenance.selectQuery')}
                        description={t('provenance.selectQueryDesc')}
                        stepNumber={1}
                        defaultOpen={!analysisResults}
                        headerActions={
                            totalImages > IMAGES_PER_PAGE && (
                                <div className="flex items-center gap-2 mr-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePageChange(galleryPage - 1); }}
                                        disabled={galleryPage <= 1 || loadingImages}
                                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                                    >
                                        <FiChevronLeft size={16} />
                                    </button>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        {galleryPage}/{totalGalleryPages}
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePageChange(galleryPage + 1); }}
                                        disabled={galleryPage >= totalGalleryPages || loadingImages}
                                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                                    >
                                        <FiChevronRight size={16} />
                                    </button>
                                </div>
                            )
                        }
                    >
                        {loadingImages ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                {[...Array(IMAGES_PER_PAGE)].map((_, i) => <SkeletonCard key={i} />)}
                            </div>
                        ) : errorImages ? (
                            <div className="text-center py-8">
                                <FiAlertTriangle className="text-4xl text-red-400 mx-auto mb-3" />
                                <p className="text-gray-600 dark:text-gray-400">{errorImages}</p>
                                <button
                                    onClick={() => fetchImages(galleryPage)}
                                    className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                                >
                                    {t('common.tryAgain')}
                                </button>
                            </div>
                        ) : images.length === 0 ? (
                            <EmptyState
                                title={t('cbir.noImages')}
                                description={t('cbir.noImagesDescription')}
                                icon="image"
                                actionLabel={t('common.update')}
                                onAction={() => fetchImages(1)}
                                showAction={true}
                            />
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                {images.map((img) => (
                                    <SourceImageCard
                                        key={img.id}
                                        image={img}
                                        isSelected={selectedImage?.id === img.id}
                                        onClick={() => setSelectedImage(img)}
                                        imageUrl={imageUrls[img.id]}
                                        loading={loadingUrls[img.id]}
                                        error={!imageUrls[img.id] && !loadingUrls[img.id]}
                                    />
                                ))}
                            </div>
                        )}
                    </CollapsibleSection>

                    {/* Step 2: Analysis Parameters */}
                    <CollapsibleSection
                        title={t('provenance.parameters')}
                        description={t('provenance.parametersDesc')}
                        stepNumber={2}
                        defaultOpen={!analysisResults}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Top-K Parameter */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <FiTarget className="text-emerald-500" />
                                    {t('provenance.topK')}
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={topK}
                                    onChange={(e) => setTopK(Math.min(100, Math.max(1, parseInt(e.target.value) || 10)))}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('provenance.topKDesc')}
                                </p>
                            </div>

                            {/* Top-Q Parameter */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <FiZap className="text-emerald-500" />
                                    {t('provenance.topQ')}
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={topQ}
                                    onChange={(e) => setTopQ(Math.min(50, Math.max(1, parseInt(e.target.value) || 5)))}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('provenance.topQDesc')}
                                </p>
                            </div>

                            {/* Max Depth Parameter */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <FiLayers className="text-emerald-500" />
                                    {t('provenance.maxDepth')}
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={maxDepth}
                                    onChange={(e) => setMaxDepth(Math.min(5, Math.max(1, parseInt(e.target.value) || 3)))}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('provenance.maxDepthDesc')}
                                </p>
                            </div>

                            {/* Descriptor Type */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <FiInfo className="text-emerald-500" />
                                    {t('provenance.descriptorType')}
                                </label>
                                <select
                                    value={descriptorType}
                                    onChange={(e) => setDescriptorType(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all cursor-pointer"
                                >
                                    {DESCRIPTOR_TYPES.map(dt => (
                                        <option key={dt.value} value={dt.value}>{dt.label}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('provenance.descriptorDesc')}
                                </p>
                            </div>
                        </div>

                        {/* Selected Image Preview & Analyze Button */}
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                            {selectedImage ? (
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-emerald-500 flex-shrink-0">
                                        {imageUrls[selectedImage.id] ? (
                                            <img
                                                src={imageUrls[selectedImage.id]}
                                                alt={selectedImage.filename}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                                            {t('provenance.queryImage')}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                                            {selectedImage.filename}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                                    {t('cbir.noImageSelected')}
                                </p>
                            )}

                            <button
                                onClick={handleAnalyze}
                                disabled={!selectedImage || analyzing || !serviceHealthy}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/20 disabled:shadow-none"
                            >
                                {analyzing ? (
                                    <>
                                        <FiRefreshCw className="animate-spin" />
                                        {t('provenance.analyzing')}
                                    </>
                                ) : (
                                    <>
                                        <FiShare2 />
                                        {t('provenance.analyze')}
                                    </>
                                )}
                            </button>
                        </div>
                    </CollapsibleSection>

                    {/* Step 3: Results */}
                    {(analysisStatus || analysisResults) && (
                        <CollapsibleSection
                            title={t('provenance.results')}
                            description={analysisResults?.graph ?
                                `${analysisResults.graph.nodes?.length || 0} ${t('provenance.nodes')}, ${analysisResults.graph.edges?.length || 0} ${t('provenance.edges')}`
                                : t('provenance.analyzing')}
                            stepNumber={analysisStatus === 'completed' ? <FiCheck /> : 3}
                            defaultOpen={true}
                            statusBadge={<StatusBadge status={analysisStatus} t={t} />}
                        >
                            {analyzing && !analysisResults && (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
                                    <p className="text-gray-600 dark:text-gray-400">{t('provenance.processing')}</p>
                                    <p className="text-xs text-gray-400 mt-2">Analysis ID: {analysisId}</p>
                                </div>
                            )}

                            {analysisResults && (
                                <div className="space-y-6">
                                    {/* Visualization Controls */}
                                    <div className="flex items-center justify-end gap-4 px-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Graph Tightness:</span>
                                            <input
                                                type="range"
                                                min="0.01"
                                                max="0.2"
                                                step="0.01"
                                                value={gravity}
                                                onChange={(e) => setGravity(parseFloat(e.target.value))}
                                                className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-emerald-500"
                                                title={`Gravity: ${gravity}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Graph Visualization */}
                                    {analysisResults.graph?.nodes?.length > 0 ? (
                                        <ProvenanceGraph
                                            nodes={analysisResults.graph.nodes}
                                            edges={analysisResults.graph.edges}
                                            spanningTreeEdges={analysisResults.graph.spanning_tree_edges}
                                            queryImageId={selectedImage?.id}
                                            getImageUrl={getImageUrl}
                                            onNodeClick={(node) => console.log('Node clicked:', node)}
                                            gravity={gravity}
                                        />
                                    ) : (
                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 min-h-[400px] flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                                            <EmptyState
                                                title={t('provenance.noResults')}
                                                description={t('provenance.noResultsDesc')}
                                                icon="search"
                                                showAction={false}
                                            />
                                        </div>
                                    )}

                                    {/* Matched Pairs List with Pagination */}
                                    {analysisResults.matched_pairs?.length > 0 && (
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <FiGitBranch className="text-emerald-500" />
                                                    {t('provenance.matchedPairs')} ({totalPairs})
                                                </h4>

                                                {/* Pagination Controls */}
                                                {totalPairs > PAIRS_PER_PAGE && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handlePairsPageChange(pairsPage - 1)}
                                                            disabled={pairsPage <= 1}
                                                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            <FiChevronLeft className="w-4 h-4" />
                                                        </button>
                                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                            {pairsPage} / {totalPairsPages}
                                                        </span>
                                                        <button
                                                            onClick={() => handlePairsPageChange(pairsPage + 1)}
                                                            disabled={pairsPage >= totalPairsPages}
                                                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            <FiChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {currentPairs.map((pair, index) => (
                                                    <MatchedPairCard key={`${pairsPage}-${index}`} pair={pair} getImageUrl={getImageUrl} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CollapsibleSection>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProvenancePage;
