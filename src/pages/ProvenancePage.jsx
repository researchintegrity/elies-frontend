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
    FiTag,
    FiCalendar,
    FiGrid,
    FiSearch,
    FiArrowRight,
    FiArrowLeft,
    FiImage,
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

// Wizard Steps
const STEPS = {
    SELECT: 0,
    CONFIGURE: 1,
    RESULTS: 2
};
const STEP_LABELS = ['select', 'configure', 'results'];

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

// Step Indicator for Wizard Navigation
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
                            <span className="hidden sm:inline">{t(`provenance.step.${step}`)}</span>
                        </button>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

// --- Main Component ---

const ProvenancePage = () => {
    const { t } = useLanguage();

    // Wizard State
    const [currentStep, setCurrentStep] = useState(STEPS.SELECT);

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
    const [loadingReproduce, setLoadingReproduce] = useState(false);

    // Service Health
    const [serviceHealthy, setServiceHealthy] = useState(null);

    // Pagination States
    const [galleryPage, setGalleryPage] = useState(1);
    const [totalImages, setTotalImages] = useState(0);
    const [pairsPage, setPairsPage] = useState(1); // For matched pairs pagination
    const [gravity, setGravity] = useState(0.02);

    // Query Gallery Filter (for finding query image quickly) - now server-side
    const [galleryFilters, setGalleryFilters] = useState({
        search: '',
        imageType: [],
        sourceType: 'all'
    });

    // Available categories for dropdown (fetched once on mount, shows all tags)
    const [availableCategories, setAvailableCategories] = useState([]);

    // Filter State
    const [filterMode, setFilterMode] = useState('all'); // 'all' | 'tags' | 'date' | 'manual' | 'similarity'
    const [filterTags, setFilterTags] = useState([]);
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [manuallySelectedIds, setManuallySelectedIds] = useState([]);
    const [filterSearch, setFilterSearch] = useState('');
    const [filterGridPage, setFilterGridPage] = useState(1);
    const FILTER_GRID_PAGE_SIZE = 36; // 6x6 grid

    // Similarity filter state
    const [similarityTopK, setSimilarityTopK] = useState(24);
    const [similarityThreshold, setSimilarityThreshold] = useState(0.5);
    const [similarityResults, setSimilarityResults] = useState([]);
    const [loadingSimilarity, setLoadingSimilarity] = useState(false);

    // Filter Gallery State (server-side paginated, replaces allImages)
    const [filterGalleryImages, setFilterGalleryImages] = useState([]);
    const [filterGalleryUrls, setFilterGalleryUrls] = useState({});
    const [loadingFilterGallery, setLoadingFilterGallery] = useState(false);
    const [totalFilterImages, setTotalFilterImages] = useState(0);

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

    // Fetch all available categories on mount (for dropdown)
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                // Fetch a large batch to get all unique tags
                const data = await api.get('/images', { page: 1, per_page: 100 });
                const imageList = Array.isArray(data) ? data : (data.items || data.images || []);
                const categories = new Set();
                imageList.forEach(img => {
                    (img.image_type || []).forEach(type => categories.add(type));
                });
                setAvailableCategories(Array.from(categories).sort());
            } catch (err) {
                console.error('Error fetching categories:', err);
            }
        };
        fetchCategories();
    }, []);

    // Handle reproduce analysis from Analysis Dashboard
    useEffect(() => {
        const reproduceData = sessionStorage.getItem('reproduceAnalysis');
        if (!reproduceData) return;

        const loadReproduceData = async () => {
            setLoadingReproduce(true); // Show loading indicator
            try {
                const { imageId, parameters, type } = JSON.parse(reproduceData);
                sessionStorage.removeItem('reproduceAnalysis'); // Clear after reading

                // Only handle provenance type
                if (type !== 'provenance') {
                    setLoadingReproduce(false);
                    return;
                }

                // Load source image info
                if (imageId) {
                    try {
                        const img = await api.get(`/images/${imageId}`);
                        setSelectedImage({
                            id: img._id,
                            imageId: img._id,
                            filename: img.filename,
                            imageType: img.image_type || []
                        });
                    } catch (err) {
                        console.error('Failed to load source image:', err);
                        showAlert(
                            t('common.warning'),
                            t('provenance.sourceImageDeleted') || 'Source image no longer exists',
                            'warning'
                        );
                        return; // Can't proceed without source image
                    }
                }

                // Apply parameters
                if (parameters) {
                    if (parameters.k !== undefined) setTopK(parameters.k);
                    if (parameters.q !== undefined) setTopQ(parameters.q);
                    if (parameters.max_depth !== undefined) setMaxDepth(parameters.max_depth);
                    if (parameters.descriptor_type) setDescriptorType(parameters.descriptor_type);

                    // Handle search_image_ids - validate they still exist
                    if (parameters.search_image_ids && parameters.search_image_ids.length > 0) {
                        const validImageIds = [];
                        let deletedCount = 0;

                        // Check each image exists
                        for (const imgId of parameters.search_image_ids) {
                            try {
                                await api.get(`/images/${imgId}`);
                                validImageIds.push(imgId);
                            } catch (err) {
                                deletedCount++;
                                console.warn(`Image ${imgId} no longer exists`);
                            }
                        }

                        if (validImageIds.length > 0) {
                            setFilterMode('manual');
                            setManuallySelectedIds(validImageIds);
                        }

                        // Navigate to configure step after a short delay, then show warning
                        setTimeout(() => {
                            setCurrentStep(STEPS.CONFIGURE);
                            showToast(t('analysisDashboard.parametersLoaded'), 'success');

                            // Show warning about deleted images after the success toast
                            if (deletedCount > 0) {
                                setTimeout(() => {
                                    showAlert(
                                        t('common.warning'),
                                        `${deletedCount} ${t('provenance.imagesDeleted') || 'image(s) from original analysis no longer exist'}`,
                                        'warning'
                                    );
                                }, 300);
                            }
                            setLoadingReproduce(false);
                        }, 500);
                        return; // Already handled navigation
                    }
                }

                // Navigate to configure step after a short delay (no search_image_ids case)
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
            setLoadingReproduce(true); // Reuse loading state
            try {
                const { analysisId, imageId, parameters, type, results } = JSON.parse(viewResultsData);
                sessionStorage.removeItem('viewResultsAnalysis'); // Clear after reading

                // Only handle provenance type
                if (type !== 'provenance') {
                    setLoadingReproduce(false);
                    return;
                }

                // Load source image info (might be deleted but we continue anyway)
                let sourceImageDeleted = false;
                if (imageId) {
                    try {
                        const img = await api.get(`/images/${imageId}`);
                        setSelectedImage({
                            id: img._id,
                            imageId: img._id,
                            filename: img.filename,
                            imageType: img.image_type || []
                        });
                    } catch (err) {
                        console.error('Source image no longer exists:', err);
                        sourceImageDeleted = true;
                    }
                }

                // Apply parameters
                if (parameters) {
                    if (parameters.k !== undefined) setTopK(parameters.k);
                    if (parameters.q !== undefined) setTopQ(parameters.q);
                    if (parameters.max_depth !== undefined) setMaxDepth(parameters.max_depth);
                    if (parameters.descriptor_type) setDescriptorType(parameters.descriptor_type);
                }

                // Load analysis results from backend
                if (analysisId) {
                    try {
                        const analysisData = await api.get(`/analyses/${analysisId}`);
                        if (analysisData.results?.graph) {
                            setAnalysisResults(analysisData.results);
                            setAnalysisId(analysisId);
                            setAnalysisStatus('completed');
                        }
                    } catch (err) {
                        console.error('Failed to load analysis results:', err);
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
                                t('provenance.sourceImageDeletedButResultsAvailable') || 'Source image was deleted but cached results are available',
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

    // Fetch images with filters
    useEffect(() => {
        fetchImages(galleryPage, galleryFilters);
    }, [galleryPage, galleryFilters]);

    // Reset to page 1 when filters change
    const prevGalleryFiltersRef = useRef(galleryFilters);
    useEffect(() => {
        const prev = prevGalleryFiltersRef.current;
        if (JSON.stringify(prev) !== JSON.stringify(galleryFilters) && galleryPage !== 1) {
            setGalleryPage(1);
        }
        prevGalleryFiltersRef.current = galleryFilters;
    }, [galleryFilters, galleryPage]);

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

    const fetchImages = useCallback(async (page = 1, filters = {}) => {
        setLoadingImages(true);
        setErrorImages(null);
        try {
            // Build query params with filters
            const queryParams = { page, per_page: IMAGES_PER_PAGE };
            if (filters.imageType && filters.imageType.length > 0) {
                queryParams.image_type = filters.imageType.join(',');
            }
            if (filters.sourceType && filters.sourceType !== 'all') {
                queryParams.source_type = filters.sourceType;
            }
            if (filters.search) {
                queryParams.search = filters.search;
            }

            const data = await api.get('/images', queryParams);

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

    // Fetch filter gallery images with server-side filtering and pagination
    const fetchFilterGalleryImages = useCallback(async (page = 1) => {
        setLoadingFilterGallery(true);
        try {
            // Build query params based on current filter mode
            const queryParams = { page, per_page: FILTER_GRID_PAGE_SIZE };

            // Apply tag filter
            if (filterMode === 'tags' && filterTags.length > 0) {
                queryParams.image_type = filterTags.join(',');
            }

            // Apply date filter
            if (filterMode === 'date') {
                if (filterDateFrom) queryParams.date_from = filterDateFrom;
                if (filterDateTo) queryParams.date_to = filterDateTo;
            }

            // Apply search filter (for manual mode or combined with tags/date)
            if (filterSearch) {
                queryParams.search = filterSearch;
            }

            const data = await api.get('/images', queryParams);

            let imageList = [];
            let total = 0;

            if (Array.isArray(data)) {
                imageList = data;
                total = data.length >= FILTER_GRID_PAGE_SIZE ? page * FILTER_GRID_PAGE_SIZE + 1 : (page - 1) * FILTER_GRID_PAGE_SIZE + data.length;
            } else if (data && typeof data === 'object') {
                imageList = data.items || data.images || [];
                total = data.total || data.total_count || imageList.length;
            }

            const transformed = imageList.map(img => ({
                id: img._id,
                imageId: img._id,
                filename: img.filename,
                uploadedDate: img.uploaded_date,
                fileSize: img.file_size,
                sourceType: img.source_type,
                imageType: img.image_type || []
            }));

            setFilterGalleryImages(transformed);
            setTotalFilterImages(total);

            // Load thumbnails for this page
            for (const img of transformed) {
                if (!filterGalleryUrls[img.id] && !imageUrls[img.id]) {
                    try {
                        const blob = await api.download(`/images/${img.id}/download`);
                        const url = URL.createObjectURL(blob);
                        setFilterGalleryUrls(prev => ({ ...prev, [img.id]: url }));
                    } catch (err) {
                        console.error(`Error loading filter gallery image ${img.id}:`, err);
                    }
                }
            }

        } catch (err) {
            console.error('Error fetching filter gallery images:', err);
        } finally {
            setLoadingFilterGallery(false);
        }
    }, [filterMode, filterTags, filterDateFrom, filterDateTo, filterSearch, filterGalleryUrls, imageUrls]);

    // Fetch filter gallery when filter mode changes or filters change
    useEffect(() => {
        if (filterMode !== 'all' && filterMode !== 'similarity') {
            fetchFilterGalleryImages(filterGridPage);
        }
    }, [filterMode, filterGridPage, filterTags, filterDateFrom, filterDateTo, filterSearch]);

    // Reset filter grid page when filters change
    const prevFilterState = useRef({ filterMode, filterTags, filterDateFrom, filterDateTo, filterSearch });
    useEffect(() => {
        const prev = prevFilterState.current;
        const changed = prev.filterMode !== filterMode ||
            JSON.stringify(prev.filterTags) !== JSON.stringify(filterTags) ||
            prev.filterDateFrom !== filterDateFrom ||
            prev.filterDateTo !== filterDateTo ||
            prev.filterSearch !== filterSearch;

        if (changed && filterGridPage !== 1) {
            setFilterGridPage(1);
        }
        prevFilterState.current = { filterMode, filterTags, filterDateFrom, filterDateTo, filterSearch };
    }, [filterMode, filterTags, filterDateFrom, filterDateTo, filterSearch, filterGridPage]);

    // Load thumbnails for similarity results
    useEffect(() => {
        const loadSimilarityThumbnails = async () => {
            if (similarityResults.length === 0) return;

            for (const result of similarityResults) {
                const imageId = result.image_id;
                // Skip if already loaded
                if (filterGalleryUrls[imageId] || imageUrls[imageId]) continue;

                try {
                    const blob = await api.download(`/images/${imageId}/download`);
                    const url = URL.createObjectURL(blob);
                    setFilterGalleryUrls(prev => ({ ...prev, [imageId]: url }));
                } catch (err) {
                    console.error(`Error loading similarity thumbnail ${imageId}:`, err);
                }
            }
        };

        loadSimilarityThumbnails();
    }, [similarityResults]);

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
            // Compute search_image_ids based on filter mode
            // - If user made manual selections (manuallySelectedIds), use those directly
            // - For similarity mode, use the CBIR results
            // - Otherwise, use the current page of filter gallery images
            let searchImageIds = null;

            if (filterMode !== 'all') {
                if (manuallySelectedIds.length > 0) {
                    // User made explicit selections - use them
                    searchImageIds = manuallySelectedIds;
                } else if (filterMode === 'similarity' && similarityResults.length > 0) {
                    // Use similarity search results
                    searchImageIds = similarityResults.map(r => r.image_id);
                } else if ((filterMode === 'tags' && filterTags.length > 0) ||
                    (filterMode === 'date' && (filterDateFrom || filterDateTo)) ||
                    filterMode === 'manual') {
                    // Use current page's filtered images
                    // Note: This only uses the current page, not all matching images
                    if (filterGalleryImages.length > 0) {
                        searchImageIds = filterGalleryImages.map(img => img.id);
                        showToast(t('provenance.usingCurrentPage') || 'Using current page images. Select manually for more control.', 'info');
                    }
                }
            }

            const response = await api.startProvenanceAnalysis(selectedImage.id, {
                k: topK,
                q: topQ,
                max_depth: maxDepth,
                descriptor_type: descriptorType,
                search_image_ids: searchImageIds
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
        setCurrentStep(STEPS.SELECT);
    };

    // Wizard Navigation
    const canNavigateToStep = (step) => {
        if (step === STEPS.SELECT) return true;
        if (step === STEPS.CONFIGURE) return !!selectedImage;
        if (step === STEPS.RESULTS) return analysisId !== null;
        return false;
    };

    const goToNextStep = () => { if (currentStep < STEPS.RESULTS) setCurrentStep(prev => prev + 1); };
    const goToPrevStep = () => { if (currentStep > STEPS.SELECT) setCurrentStep(prev => prev - 1); };
    const canProceed = currentStep === STEPS.SELECT ? !!selectedImage : currentStep === STEPS.CONFIGURE;

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
        <div className="flex flex-col h-full bg-bg-main dark:bg-bg-main overflow-hidden relative">
            {/* Loading overlay for reproduce */}
            {loadingReproduce && (
                <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center gap-4 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-4 border-emerald-100 dark:border-emerald-900/30" />
                            <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-gray-900 dark:text-white">{t('provenance.loadingParameters') || 'Loading parameters...'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('provenance.validatingImages') || 'Validating images from previous analysis'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="flex-none px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200 dark:border-gray-800 bg-bg-main dark:bg-bg-main z-30">
                <div className="flex justify-between items-center gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                            <FiShare2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('provenance.title')}</h1>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{t('provenance.subtitle')}</p>
                        </div>
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

                        {currentStep > STEPS.SELECT && (
                            <button onClick={handleClearResults} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <FiRefreshCw size={16} />{t('provenance.startOver')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Step Indicator with Navigation */}
                <div className="flex items-center justify-between gap-4">
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
                            <button onClick={() => { handleAnalyze(); setCurrentStep(STEPS.RESULTS); }} disabled={analyzing || !serviceHealthy}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {analyzing ? <><FiRefreshCw className="animate-spin" size={16} />{t('provenance.analyzing')}</> : <><FiShare2 size={16} />{t('provenance.analyze')}</>}
                            </button>
                        )}
                        {currentStep === STEPS.RESULTS && (
                            <button onClick={handleClearResults} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700">
                                <FiRefreshCw size={16} />{t('provenance.newAnalysis')}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
                    {/* Step 1: Select Query Image - show when on SELECT step */}
                    {currentStep === STEPS.SELECT && (
                        <>
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
                                {/* Query Gallery Filters */}
                                <div className="mb-4 flex flex-wrap items-center gap-3">
                                    {/* Search input */}
                                    <div className="relative flex-1 min-w-[200px] max-w-md">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            value={galleryFilters.search}
                                            onChange={(e) => setGalleryFilters(f => ({ ...f, search: e.target.value }))}
                                            placeholder={t('gallery.searchPlaceholder')}
                                            className="w-full pl-10 pr-8 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                        />
                                        {galleryFilters.search && (
                                            <button
                                                onClick={() => setGalleryFilters(f => ({ ...f, search: '' }))}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                <FiX size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Tag filter dropdown - uses available categories fetched on mount */}
                                    <select
                                        value={galleryFilters.imageType.length > 0 ? galleryFilters.imageType[0] : 'all'}
                                        onChange={(e) => setGalleryFilters(f => ({
                                            ...f,
                                            imageType: e.target.value === 'all' ? [] : [e.target.value]
                                        }))}
                                        className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="all">{t('cbir.allTypes') || 'All Types'}</option>
                                        {/* Use pre-fetched available categories to always show all tags */}
                                        {availableCategories.map(tag => (
                                            <option key={tag} value={tag}>{tag}</option>
                                        ))}
                                    </select>

                                    {/* Clear filters button */}
                                    {(galleryFilters.search || galleryFilters.imageType.length > 0) && (
                                        <button
                                            onClick={() => setGalleryFilters({ search: '', imageType: [], sourceType: 'all' })}
                                            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                        >
                                            <FiX size={14} />
                                            {t('filters.clearFilters')}
                                        </button>
                                    )}
                                </div>

                                {loadingImages ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                        {[...Array(IMAGES_PER_PAGE)].map((_, i) => <SkeletonCard key={i} />)}
                                    </div>
                                ) : errorImages ? (
                                    <div className="text-center py-8">
                                        <FiAlertTriangle className="text-4xl text-red-400 mx-auto mb-3" />
                                        <p className="text-gray-600 dark:text-gray-400">{errorImages}</p>
                                        <button
                                            onClick={() => fetchImages(galleryPage, galleryFilters)}
                                            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                                        >
                                            {t('common.tryAgain')}
                                        </button>
                                    </div>
                                ) : images.length === 0 ? (
                                    <EmptyState
                                        title={(galleryFilters.search || galleryFilters.imageType.length > 0) ? t('common.noResults') : t('cbir.noImages')}
                                        description={(galleryFilters.search || galleryFilters.imageType.length > 0) ? t('provenance.noFilterResults') : t('cbir.noImagesDescription')}
                                        icon="image"
                                        actionLabel={(galleryFilters.search || galleryFilters.imageType.length > 0) ? t('filters.clearFilters') : t('common.update')}
                                        onAction={() => (galleryFilters.search || galleryFilters.imageType.length > 0)
                                            ? setGalleryFilters({ search: '', imageType: [], sourceType: 'all' })
                                            : fetchImages(1, galleryFilters)
                                        }
                                        showAction={true}
                                    />
                                ) : (
                                    /* Server-side filtering now handles all filtering, just render images */
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
                        </>
                    )}

                    {/* Step 2: Configure - show when on CONFIGURE step */}
                    {currentStep === STEPS.CONFIGURE && (
                        <>
                            {/* Query Image Preview - Large */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                                <div className="flex items-center gap-6">
                                    <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-emerald-500 flex-shrink-0 shadow-lg">
                                        {selectedImage && imageUrls[selectedImage.id] ? (
                                            <img src={imageUrls[selectedImage.id]} alt={selectedImage.filename} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                <FiImage className="w-12 h-12 text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">{t('provenance.queryImage')}</span>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{selectedImage?.filename || t('manipulation.notSelected')}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('provenance.queryImageConfigureHint')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Filter Gallery (Optional) - refine search scope */}
                            <CollapsibleSection
                                title={`${t('provenance.filterGallery')} (${t('common.optional')})`}
                                description={t('provenance.filterGalleryDesc')}
                                stepNumber="⚙"
                                defaultOpen={false}
                            >
                                {/* Filter Mode Tabs */}
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {[
                                        { mode: 'similarity', icon: FiTarget, label: t('provenance.filterBySimilarity'), hasActiveFilter: similarityResults.length > 0 },
                                        { mode: 'tags', icon: FiTag, label: t('provenance.filterByTag'), hasActiveFilter: filterTags.length > 0 },
                                        { mode: 'date', icon: FiCalendar, label: t('provenance.filterByDate'), hasActiveFilter: filterDateFrom !== '' || filterDateTo !== '' },
                                        { mode: 'manual', icon: FiCheck, label: t('provenance.filterManual'), hasActiveFilter: manuallySelectedIds.length > 0 },
                                        { mode: 'all', icon: FiGrid, label: t('provenance.filterAll'), hasActiveFilter: false },
                                    ].map(({ mode, icon: Icon, label, hasActiveFilter }) => (
                                        <button
                                            key={mode}
                                            onClick={() => {
                                                // Warn if no query selected (except for 'all' mode)
                                                if (mode !== 'all' && !selectedImage) {
                                                    showAlert(t('common.warning'), t('provenance.selectQueryFirst'), 'warning');
                                                    return;
                                                }
                                                setFilterMode(mode);
                                                // Reset manual selection when switching modes
                                                if (mode === 'all') {
                                                    setManuallySelectedIds([]);
                                                    setFilterTags([]);
                                                    setFilterDateFrom('');
                                                    setFilterDateTo('');
                                                    setSimilarityResults([]);
                                                }
                                            }}
                                            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterMode === mode
                                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            <Icon size={16} />
                                            {label}
                                            {/* Green underline indicator when filter is active but not selected */}
                                            {hasActiveFilter && filterMode !== mode && (
                                                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-500 rounded-full" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Filter Content based on mode */}
                                {filterMode === 'all' && (
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                        <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                                            {t('provenance.allImagesPrefix')} {totalImages} {t('provenance.allImagesSuffix')}
                                        </p>
                                    </div>
                                )}

                                {/* Query Image Suggestions - show when query image is selected and NOT in 'all' mode */}
                                {filterMode !== 'all' && selectedImage && (selectedImage.imageType?.length > 0 || selectedImage.filename) && (
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                                {t('provenance.queryLabel')}
                                            </span>
                                            {/* Query tags as filter suggestions - toggle active/inactive */}
                                            {selectedImage.imageType?.map(tag => (
                                                <button
                                                    key={tag}
                                                    onClick={() => {
                                                        // Only switch to tags mode if in 'all' mode
                                                        if (filterMode === 'all') setFilterMode('tags');
                                                        // Toggle tag in filterTags (works as secondary filter in any mode)
                                                        setFilterTags(prev =>
                                                            prev.includes(tag)
                                                                ? prev.filter(t => t !== tag)
                                                                : [...prev, tag]
                                                        );
                                                        setFilterGridPage(1);
                                                    }}
                                                    className={`px-2 py-1 text-xs rounded transition-colors ${filterTags.includes(tag)
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                                        : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/60'
                                                        }`}
                                                >
                                                    #{tag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {filterMode !== 'all' && (
                                    <div className="space-y-4">
                                        {/* Loading indicator */}
                                        {loadingFilterGallery && (
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <FiRefreshCw className="animate-spin" />
                                                {t('common.loading')}
                                            </div>
                                        )}

                                        {/* Query Image Suggestions - shown outside mode check so always visible */}

                                        {/* Tag Selection */}
                                        {filterMode === 'tags' && (
                                            <div className="space-y-3">
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {t('provenance.filterTagsDesc')}
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {availableCategories.map(tag => {
                                                        const isSelected = filterTags.includes(tag);
                                                        return (
                                                            <button
                                                                key={tag}
                                                                onClick={() => {
                                                                    // Toggle tag in filterTags
                                                                    setFilterTags(prev =>
                                                                        isSelected
                                                                            ? prev.filter(t => t !== tag)
                                                                            : [...prev, tag]
                                                                    );
                                                                    setFilterGridPage(1);
                                                                }}
                                                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${isSelected
                                                                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-500/30 dark:text-emerald-300'
                                                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                                                    }`}
                                                            >
                                                                #{tag}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Date Range Selection */}
                                        {filterMode === 'date' && (
                                            <div className="space-y-3">
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {t('provenance.filterDateDesc')}
                                                </p>
                                                <div className="grid grid-cols-2 gap-4 max-w-md">
                                                    <div>
                                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                            {t('filters.dateFrom')}
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={filterDateFrom}
                                                            onChange={(e) => setFilterDateFrom(e.target.value)}
                                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                            {t('filters.dateTo')}
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={filterDateTo}
                                                            onChange={(e) => setFilterDateTo(e.target.value)}
                                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Similarity Search Mode */}
                                        {filterMode === 'similarity' && (
                                            <div className="space-y-4">
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {t('provenance.filterSimilarityDesc')}
                                                </p>

                                                {/* Similarity parameters */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
                                                    {/* Top-K slider */}
                                                    <div>
                                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                            {t('cbir.topK')}: {similarityTopK}
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="5"
                                                            max="100"
                                                            value={similarityTopK}
                                                            onChange={(e) => setSimilarityTopK(parseInt(e.target.value))}
                                                            className="w-full accent-emerald-600"
                                                        />
                                                    </div>
                                                    {/* Threshold slider */}
                                                    <div>
                                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                            {t('cbir.minSimilarity')}: {Math.round(similarityThreshold * 100)}%
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="100"
                                                            value={Math.round(similarityThreshold * 100)}
                                                            onChange={(e) => setSimilarityThreshold(parseInt(e.target.value) / 100)}
                                                            className="w-full accent-emerald-600"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Search button and results count in a row */}
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={async () => {
                                                            if (!selectedImage) {
                                                                showAlert(t('common.warning'), t('provenance.selectQueryFirst'), 'warning');
                                                                return;
                                                            }
                                                            setLoadingSimilarity(true);
                                                            setSimilarityResults([]);
                                                            try {
                                                                const response = await api.post('/cbir/search/sync', {
                                                                    image_id: selectedImage.id,
                                                                    top_k: similarityTopK
                                                                });
                                                                // Filter by threshold and exclude query image
                                                                const filtered = (response.matches || []).filter(
                                                                    m => m.image_id !== selectedImage.id && m.similarity_score >= similarityThreshold
                                                                );
                                                                setSimilarityResults(filtered);
                                                                // Don't auto-select - just show the results
                                                                setFilterGridPage(1);
                                                                if (filtered.length === 0) {
                                                                    showToast(t('cbir.noResultsWithCriteria'), 'info');
                                                                } else {
                                                                    showToast(`${t('similarity.found')} ${filtered.length} ${t('similarity.similarImages')}`, 'success');
                                                                }
                                                            } catch (err) {
                                                                console.error('Similarity search error:', err);
                                                                showAlert(t('common.error'), err.message, 'error');
                                                            } finally {
                                                                setLoadingSimilarity(false);
                                                            }
                                                        }}
                                                        disabled={loadingSimilarity || !selectedImage}
                                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {loadingSimilarity ? <FiRefreshCw className="animate-spin" size={16} /> : <FiTarget size={16} />}
                                                        {loadingSimilarity ? t('cbir.searching') : t('provenance.findSimilar')}
                                                    </button>

                                                    {/* Reset Results button - only show when there are results */}
                                                    {similarityResults.length > 0 && (
                                                        <button
                                                            onClick={() => {
                                                                setSimilarityResults([]);
                                                                setFilterGridPage(1);
                                                                showToast(t('similarity.resultsCleared') || 'Results cleared', 'info');
                                                            }}
                                                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                        >
                                                            <FiX size={16} />
                                                            {t('cbir.clearSearch', 'Clear Search')}
                                                        </button>
                                                    )}

                                                    {/* Results count - inline with button */}
                                                    {similarityResults.length > 0 && (
                                                        <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                                            {t('similarity.found')} {similarityResults.length} {t('similarity.similarImages')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Manual mode description */}
                                        {filterMode === 'manual' && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {t('provenance.filterManualDesc')}
                                            </p>
                                        )}

                                        {/* Search input for text filtering - hidden in similarity mode */}
                                        {filterMode !== 'similarity' && (
                                            <div className="relative max-w-md">
                                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                <input
                                                    type="text"
                                                    value={filterSearch}
                                                    onChange={(e) => { setFilterSearch(e.target.value); setFilterGridPage(1); }}
                                                    placeholder={t('gallery.searchPlaceholder')}
                                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                />
                                            </div>
                                        )}

                                        {/* Selection summary */}
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">
                                                {(() => {
                                                    if (filterMode === 'similarity') {
                                                        // Apply tag filter to similarity results for count
                                                        let count = similarityResults.length;
                                                        if (filterTags.length > 0) {
                                                            count = similarityResults.filter(r =>
                                                                r.image_type?.some(tag => filterTags.includes(tag))
                                                            ).length;
                                                        }
                                                        return `${count} ${t('provenance.imagesAvailable')}`;
                                                    }
                                                    return `${totalFilterImages} ${t('provenance.imagesAvailable')}`;
                                                })()}
                                            </span>
                                            {manuallySelectedIds.length > 0 && (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                    {manuallySelectedIds.length} {t('provenance.imagesSelected')}
                                                </span>
                                            )}
                                        </div>

                                        {/* Similarity mode placeholder - show when no search has been done yet */}
                                        {filterMode === 'similarity' && similarityResults.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                                <FiTarget size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
                                                <p className="text-gray-500 dark:text-gray-400 text-center mb-2 font-medium">
                                                    {t('provenance.similarityNotSearched')}
                                                </p>
                                                <p className="text-gray-400 dark:text-gray-500 text-sm text-center">
                                                    {t('provenance.similarityNotSearchedHint')}
                                                </p>
                                            </div>
                                        )}

                                        {/* Refinement Grid with pagination */}
                                        {filterMode !== 'similarity' || similarityResults.length > 0 ? (() => {
                                            // For similarity mode, use CBIR results; otherwise use server-filtered filterGalleryImages
                                            let pageImages = filterGalleryImages;
                                            let totalFilteredPages = Math.ceil(totalFilterImages / FILTER_GRID_PAGE_SIZE);

                                            if (filterMode === 'similarity' && similarityResults.length > 0) {
                                                // For similarity mode, we need to map CBIR results to image objects
                                                // Use imageUrls or filterGalleryUrls for thumbnails
                                                let simImages = similarityResults.map(r => ({
                                                    id: r.image_id,
                                                    imageId: r.image_id,
                                                    filename: r.filename || 'Unknown',
                                                    similarityScore: r.similarity_score,
                                                    imageType: r.image_type || []
                                                }));

                                                // Apply tag filter if set (from query suggestions)
                                                if (filterTags.length > 0) {
                                                    simImages = simImages.filter(img =>
                                                        img.imageType?.some(tag => filterTags.includes(tag))
                                                    );
                                                }

                                                totalFilteredPages = Math.ceil(simImages.length / FILTER_GRID_PAGE_SIZE);
                                                const startIdx = (filterGridPage - 1) * FILTER_GRID_PAGE_SIZE;
                                                pageImages = simImages.slice(startIdx, startIdx + FILTER_GRID_PAGE_SIZE);
                                            }

                                            return (
                                                <>
                                                    {/* Grid */}
                                                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-12 gap-2 p-1">
                                                        {pageImages.map((img) => (
                                                            <div
                                                                key={img.id}
                                                                onClick={() => {
                                                                    setManuallySelectedIds(prev =>
                                                                        prev.includes(img.id)
                                                                            ? prev.filter(id => id !== img.id)
                                                                            : [...prev, img.id]
                                                                    );
                                                                }}
                                                                title={img.filename}
                                                                className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${manuallySelectedIds.includes(img.id)
                                                                    ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                                                                    : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                                                    }`}
                                                            >
                                                                {(filterGalleryUrls[img.id] || imageUrls[img.id]) ? (
                                                                    <img
                                                                        src={filterGalleryUrls[img.id] || imageUrls[img.id]}
                                                                        alt={img.filename}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-400 animate-pulse" />
                                                                )}
                                                                {manuallySelectedIds.includes(img.id) && (
                                                                    <div className="absolute top-1 right-1 bg-emerald-600 text-white p-0.5 rounded-full">
                                                                        <FiCheck size={10} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Pagination Controls */}
                                                    {totalFilteredPages > 1 && (
                                                        <div className="flex items-center justify-center gap-2 pt-2">
                                                            <button
                                                                onClick={() => setFilterGridPage(p => Math.max(1, p - 1))}
                                                                disabled={filterGridPage === 1}
                                                                className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                <FiChevronLeft size={16} />
                                                            </button>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[80px] text-center">
                                                                {filterGridPage} / {totalFilteredPages}
                                                            </span>
                                                            <button
                                                                onClick={() => setFilterGridPage(p => Math.min(totalFilteredPages, p + 1))}
                                                                disabled={filterGridPage === totalFilteredPages}
                                                                className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                <FiChevronRight size={16} />
                                                            </button>
                                                            <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                                                            <button
                                                                onClick={() => {
                                                                    const pageIds = pageImages.map(img => img.id);
                                                                    setManuallySelectedIds(prev => {
                                                                        const newSet = new Set(prev);
                                                                        pageIds.forEach(id => newSet.add(id));
                                                                        return [...newSet];
                                                                    });
                                                                }}
                                                                className="px-3 py-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
                                                            >
                                                                {t('provenance.selectAllOnPage')}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const pageIds = new Set(pageImages.map(img => img.id));
                                                                    setManuallySelectedIds(prev => prev.filter(id => !pageIds.has(id)));
                                                                }}
                                                                className="px-3 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                                                            >
                                                                {t('provenance.clearPageSelection')}
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })() : null}

                                        {/* Quick selection buttons */}
                                        {(filterMode === 'tags' && filterTags.length > 0) || (filterMode === 'date' && (filterDateFrom || filterDateTo)) || (filterMode === 'similarity' && similarityResults.length > 0) ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={async () => {
                                                        // For similarity mode, select all CBIR results (optionally filtered by tags)
                                                        if (filterMode === 'similarity' && similarityResults.length > 0) {
                                                            let toSelect = similarityResults;
                                                            if (filterTags.length > 0) {
                                                                toSelect = toSelect.filter(r =>
                                                                    r.image_type?.some(tag => filterTags.includes(tag))
                                                                );
                                                            }
                                                            setManuallySelectedIds(toSelect.map(r => r.image_id));
                                                        } else if (filterMode === 'tags' && filterTags.length > 0) {
                                                            // For tags mode, fetch ALL images matching the tags (paginated) and select them
                                                            try {
                                                                let allMatchingIds = [];
                                                                let page = 1;
                                                                const perPage = 100;
                                                                let hasMore = true;

                                                                while (hasMore) {
                                                                    const queryParams = { page, per_page: perPage, image_type: filterTags.join(',') };
                                                                    const data = await api.get('/images', queryParams);
                                                                    const imageList = Array.isArray(data) ? data : (data.items || data.images || []);
                                                                    const pageIds = imageList.map(img => img._id);
                                                                    allMatchingIds = [...allMatchingIds, ...pageIds];

                                                                    // Check if we got fewer than perPage, meaning no more pages
                                                                    hasMore = imageList.length >= perPage;
                                                                    page++;

                                                                    // Safety limit to avoid infinite loops
                                                                    if (page > 20) break;
                                                                }

                                                                setManuallySelectedIds(prev => {
                                                                    const combined = new Set([...prev, ...allMatchingIds]);
                                                                    return Array.from(combined);
                                                                });
                                                                showToast(`${allMatchingIds.length} ${t('provenance.imagesSelected')}`, 'success');
                                                            } catch (err) {
                                                                console.error('Error fetching all tagged images:', err);
                                                                showToast(t('common.error') || 'Error', 'error');
                                                            }
                                                        } else {
                                                            // For date mode, select current page
                                                            setManuallySelectedIds(prev => {
                                                                const currentPageIds = filterGalleryImages.map(img => img.id);
                                                                const combined = new Set([...prev, ...currentPageIds]);
                                                                return Array.from(combined);
                                                            });
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
                                                >
                                                    {filterMode === 'similarity' ? t('provenance.selectAllFiltered') : filterMode === 'tags' ? t('provenance.selectAllWithTags') : t('provenance.selectAllOnPage')}
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (filterMode === 'tags' && filterTags.length > 0) {
                                                            // For tags mode, fetch ALL images matching the tags (paginated) and remove them from selection
                                                            try {
                                                                let allMatchingIds = [];
                                                                let page = 1;
                                                                const perPage = 100;
                                                                let hasMore = true;

                                                                while (hasMore) {
                                                                    const queryParams = { page, per_page: perPage, image_type: filterTags.join(',') };
                                                                    const data = await api.get('/images', queryParams);
                                                                    const imageList = Array.isArray(data) ? data : (data.items || data.images || []);
                                                                    const pageIds = imageList.map(img => img._id);
                                                                    allMatchingIds = [...allMatchingIds, ...pageIds];

                                                                    hasMore = imageList.length >= perPage;
                                                                    page++;
                                                                    if (page > 20) break;
                                                                }

                                                                const idsToRemove = new Set(allMatchingIds);
                                                                setManuallySelectedIds(prev => prev.filter(id => !idsToRemove.has(id)));
                                                            } catch (err) {
                                                                console.error('Error fetching all tagged images:', err);
                                                                showToast(t('common.error') || 'Error', 'error');
                                                            }
                                                        } else {
                                                            // For other modes, clear current page selection
                                                            const currentPageIds = new Set(filterGalleryImages.map(img => img.id));
                                                            setManuallySelectedIds(prev => prev.filter(id => !currentPageIds.has(id)));
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                                                >
                                                    {filterMode === 'tags' ? t('provenance.clearTagSelection') : t('provenance.clearPageSelection')}
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </CollapsibleSection>

                            {/* Analysis Parameters */}
                            <CollapsibleSection
                                title={t('provenance.parameters')}
                                description={t('provenance.parametersDesc')}
                                stepNumber={2}
                                defaultOpen={true}
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

                                {/* Analyze Button */}
                                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                                    <button
                                        onClick={() => { handleAnalyze(); setCurrentStep(STEPS.RESULTS); }}
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
                        </>
                    )}

                    {/* Step 3: Results - show when on RESULTS step */}
                    {currentStep === STEPS.RESULTS && (analysisStatus || analysisResults) && (
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
            </div >
        </div >
    );
};

export default ProvenancePage;
