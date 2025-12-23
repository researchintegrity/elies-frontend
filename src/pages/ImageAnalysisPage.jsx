// src/pages/ImageAnalysisPage.jsx
/**
 * Image Analysis Page
 * 
 * A dedicated page for forensics analysis of images, inspired by
 * Forensically by Jonas Wagner (https://29a.ch/photo-forensics/).
 * 
 * ELIS Scientific Integrity Platform
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    FiZap,
    FiActivity,
    FiSun,
    FiSliders,
    FiCopy,
    FiInfo,
    FiChevronLeft,
    FiChevronRight,
    FiAlertTriangle,
    FiCheck,
    FiDownload,
    FiExternalLink,
    FiRefreshCw,
    FiMaximize2,
    FiMinimize2,
    FiEye,
    FiEyeOff,
    FiSearch,
    FiZoomIn,
    FiZoomOut,
    FiCalendar,
    FiTag,
    FiX,
    FiFilter,
    FiEdit,
    FiEdit2,
    FiLayers,
    FiTrash2,
    FiPlus,
    FiSave,
    FiCheckSquare,
    FiSquare,
    FiPenTool
} from 'react-icons/fi';
import { api } from '../services/api';
import { showToast } from '../utils/alert';
import { useLanguage } from '../context/LanguageContext';
import AnnotationOverlay from '../components/AnnotationOverlay';
import { AnnotationModal } from '../components/annotation';
import { SkeletonCard, EmptyState } from '../components/common';
import {
    loadImageToCanvas,
    applyErrorLevelAnalysis,
    applyNoiseAnalysis,
    applyLuminanceGradient,
    applyLevelSweep,
    applyCloneDetection,
    getImageInfo
} from '../utils/imageAnalysis';

// --- Constants ---
const IMAGES_PER_PAGE = 24;

// Tool definitions (removed strings)
const ANALYSIS_TOOLS = {
    ela: {
        id: 'ela',
        name: 'Error Level Analysis',
        description: 'Compares the image to a recompressed version to detect manipulation',
        icon: FiZap,
        category: 'forensics',
        hasCanvas: true
    },
    noise: {
        id: 'noise',
        name: 'Noise Analysis',
        description: 'Extracts and visualizes the noise pattern of the image',
        icon: FiActivity,
        category: 'forensics',
        hasCanvas: true
    },
    gradient: {
        id: 'gradient',
        name: 'Luminance Gradient',
        description: 'Visualizes brightness changes to detect lighting inconsistencies',
        icon: FiSun,
        category: 'forensics',
        hasCanvas: true
    },
    levelSweep: {
        id: 'levelSweep',
        name: 'Level Sweep',
        description: 'Highlights specific brightness levels to reveal hidden details',
        icon: FiSliders,
        category: 'forensics',
        hasCanvas: true
    },
    cloneDetection: {
        id: 'cloneDetection',
        name: 'Clone Detection',
        description: 'Identifies potentially copied and pasted regions',
        icon: FiCopy,
        category: 'forensics',
        hasCanvas: true
    },
    metadata: {
        id: 'metadata',
        name: 'Metadata',
        description: 'View image properties and embedded EXIF information',
        icon: FiInfo,
        category: 'inspection',
        hasCanvas: false
    }
};

// --- Sub-Components ---

// Compact Image Card for Source Selection
const SourceImageCard = ({ image, isSelected, onClick, imageUrl, loading }) => (
    <div
        onClick={onClick}
        className={`relative rounded-lg overflow-hidden cursor-pointer transition-all duration-200 border-2 ${isSelected
            ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-md'
            : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            }`}
    >
        <div className="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
            {loading ? (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ) : imageUrl ? (
                <img
                    src={imageUrl}
                    alt={image.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <FiAlertTriangle size={16} />
                </div>
            )}
        </div>
        {isSelected && (
            <div className="absolute top-1 right-1 bg-indigo-600 text-white p-1 rounded-full">
                <FiCheck size={10} strokeWidth={3} />
            </div>
        )}
    </div>
);

// Tool Button
const ToolButton = ({ tool, isSelected, onClick, t }) => {
    const Icon = tool.icon;
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${isSelected
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            title={t(`analysis.tools.${tool.id}.description`) || tool.description}
        >
            <Icon size={16} />
            <span>{t(`analysis.tools.${tool.id}`) || tool.name}</span>
        </button>
    );
};

// Parameter Slider with real-time update
const ParamSlider = ({ label, value, min, max, step = 1, unit = '', onChange }) => (
    <div className="space-y-1">
        <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                {value}{unit}
            </span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
    </div>
);

// Parameter Checkbox
const ParamCheckbox = ({ label, checked, onChange }) => (
    <label className="flex items-center gap-2 cursor-pointer">
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
    </label>
);

// --- Main Component ---

const ImageAnalysisPage = () => {
    const { t } = useLanguage();

    // Gallery State
    const [images, setImages] = useState([]);
    const [imageUrls, setImageUrls] = useState({});
    const [imageBlobs, setImageBlobs] = useState({});
    const [loadingImages, setLoadingImages] = useState(true);
    const [loadingUrls, setLoadingUrls] = useState({});

    // Selection State
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedTool, setSelectedTool] = useState('ela');

    // Tool Parameters (with defaults matching Forensically)
    const [params, setParams] = useState({
        // ELA (Error Level Analysis)
        elaQuality: 75,
        elaScale: 15,
        elaOpacity: 100,
        // Noise Analysis
        noiseAmplitude: 20,
        noiseEqualize: false,
        noiseOpacity: 100,
        // Luminance Gradient
        gradientIntensity: 5,
        gradientOpacity: 100,
        gradientNormalize: true,
        gradientEqualize: false,
        // Level Sweep
        sweepPosition: 0.5,
        sweepWidth: 32,
        sweepOpacity: 100,
        // Clone Detection
        cloneMinSimilarity: 0.47,
        cloneMinDetail: 0.01,
        cloneMinClusterSize: 8,
        cloneBlockSize: 4,
        cloneMaxImageSize: 1024,
        cloneShowQuantized: false
    });

    // Analysis State
    const [analyzing, setAnalyzing] = useState(false);
    const [resultCanvas, setResultCanvas] = useState(null);
    const [originalCanvas, setOriginalCanvas] = useState(null);
    const [metadata, setMetadata] = useState(null);

    // UI State
    const [showOriginal, setShowOriginal] = useState(false);
    const [galleryCollapsed, setGalleryCollapsed] = useState(false);
    const [galleryPage, setGalleryPage] = useState(1);
    const [totalImages, setTotalImages] = useState(0);
    const [zoomLevel, setZoomLevel] = useState(1); // 1 = fit to container

    // Filter State
    const [filterSearch, setFilterSearch] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterImageType, setFilterImageType] = useState('');
    const [availableCategories, setAvailableCategories] = useState([]);
    const [showFilters, setShowFilters] = useState(false);

    // Annotation State
    const [annotationMode, setAnnotationMode] = useState(false);
    const [showAnnotationModal, setShowAnnotationModal] = useState(false);
    const [annotations, setAnnotations] = useState([]);
    const [crop, setCrop] = useState(null);
    const [annotationType, setAnnotationType] = useState('manipulation');
    const [groupId, setGroupId] = useState(1);
    const [annotationText, setAnnotationText] = useState('');
    const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
    const [copiedAnnotation, setCopiedAnnotation] = useState(null);

    // Helpers
    const getGroupColor = (type, id) => {
        if (type !== 'copy-move') return '#EF4444'; // Red for general manipulation
        const colors = [
            '#3B82F6', // Blue
            '#10B981', // Green
            '#F59E0B', // Amber
            '#8B5CF6', // Purple
            '#EC4899', // Pink
            '#06B6D4', // Cyan
        ];
        return colors[(id - 1) % colors.length] || '#3B82F6';
    };


    // Refs
    const resultCanvasRef = useRef(null);
    const analysisTimeoutRef = useRef(null);
    const zoomContainerRef = useRef(null);

    // Fetch images when page or filters change
    useEffect(() => {
        fetchImages(galleryPage);
    }, [galleryPage, filterSearch, filterDateFrom, filterDateTo, filterImageType]);

    // Fetch available categories on mount
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                // Fetch a batch of images and extract unique types (same as Provenance page)
                const data = await api.get('/images', { page: 1, per_page: 100 });
                const imageList = Array.isArray(data) ? data : (data.items || data.images || []);
                const categories = new Set();
                imageList.forEach(img => {
                    const types = img.image_type || [];
                    types.forEach(type => categories.add(type));
                });
                const sortedCategories = Array.from(categories).sort();
                setAvailableCategories(sortedCategories);
            } catch (err) {
                console.error('Error fetching categories:', err);
            }
        };
        fetchCategories();
    }, []);

    // Handle wheel zoom with non-passive listener to prevent scroll
    useEffect(() => {
        const container = zoomContainerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoomLevel(prevZoom => Math.min(4, Math.max(0.25, prevZoom + delta)));
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [resultCanvas, originalCanvas]);

    // Reset scroll position when zoom returns to 1x to ensure centering
    useEffect(() => {
        const container = zoomContainerRef.current;
        if (zoomLevel <= 1 && container) {
            // Reset scroll to top-left (content is centered via flexbox)
            container.scrollTop = 0;
            container.scrollLeft = 0;
        }
    }, [zoomLevel]);

    // Load image URLs
    useEffect(() => {
        const loadImageUrls = async () => {
            for (const img of images) {
                if (!imageUrls[img.id] && !loadingUrls[img.id]) {
                    setLoadingUrls(prev => ({ ...prev, [img.id]: true }));
                    try {
                        const blob = await api.download(`/images/${img.id}/download`);
                        const url = URL.createObjectURL(blob);
                        setImageUrls(prev => ({ ...prev, [img.id]: url }));
                        setImageBlobs(prev => ({ ...prev, [img.id]: blob }));
                    } catch (err) {
                        console.error(`Error loading image ${img.id}:`, err);
                    } finally {
                        setLoadingUrls(prev => ({ ...prev, [img.id]: false }));
                    }
                }
            }
        };

        if (images.length > 0) {
            loadImageUrls();
        }
    }, [images]);

    // Fetch annotations when image changes
    useEffect(() => {
        if (!selectedImage) {
            setAnnotations([]);
            return;
        }

        const fetchAnnotations = async () => {
            try {
                const data = await api.getAnnotations(selectedImage.id);
                setAnnotations(data || []);

                // Determine next group ID
                if (data && data.length > 0) {
                    const maxGroup = data
                        .filter(a => a.type === 'copy-move')
                        .reduce((max, a) => (a.group_id > max ? a.group_id : max), 0);
                    if (maxGroup > 0) setGroupId(maxGroup + 1);
                }
            } catch (err) {
                console.error('Error fetching annotations:', err);
                setAnnotations([]); // Clear on error or no annotations
            }
        };

        fetchAnnotations();
        // Reset local state
        setCrop(null);
        setSelectedAnnotationId(null);
        setAnnotationText('');
    }, [selectedImage]);


    // Auto-run analysis when tool or params change (debounced)
    useEffect(() => {
        if (!selectedImage || !imageUrls[selectedImage.id]) return;

        // Clear previous timeout
        if (analysisTimeoutRef.current) {
            clearTimeout(analysisTimeoutRef.current);
        }

        // Debounce the analysis
        analysisTimeoutRef.current = setTimeout(() => {
            runAnalysis();
        }, 300);

        return () => {
            if (analysisTimeoutRef.current) {
                clearTimeout(analysisTimeoutRef.current);
            }
        };
    }, [selectedImage, selectedTool, params]);

    // Keyboard shortcuts (Copy/Paste) for Annotations
    useEffect(() => {
        if (!annotationMode) return;

        const handleKeyDown = async (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            // Copy: Ctrl+C
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                if (crop && crop.width > 0) {
                    const info = {
                        coords: crop,
                        type: annotationType,
                        group_id: groupId,
                        text: annotationText
                    };
                    setCopiedAnnotation(info);
                    showToast(t('common.copied') || 'Copied!', 'success');
                } else if (selectedAnnotationId) {
                    const existing = annotations.find(a => a._id === selectedAnnotationId);
                    if (existing) {
                        const info = {
                            coords: existing.coords,
                            type: existing.type,
                            group_id: existing.group_id,
                            text: existing.text
                        };
                        setCopiedAnnotation(info);
                        showToast(t('common.copied') || 'Copied!', 'success');
                    }
                }
            }

            // Paste: Ctrl+V
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                if (copiedAnnotation && selectedImage) {
                    e.preventDefault();
                    const offset = 2; // % offset
                    const copyCoords = copiedAnnotation.coords || {};
                    const newCoords = {
                        ...copyCoords,
                        x: Math.min((copyCoords.x || 0) + offset, 100 - (copyCoords.width || 0)),
                        y: Math.min((copyCoords.y || 0) + offset, 100 - (copyCoords.height || 0)),
                        width: copyCoords.width || 0,
                        height: copyCoords.height || 0
                    };

                    const payload = {
                        image_id: selectedImage.id,
                        text: copiedAnnotation.text,
                        coords: newCoords,
                        type: copiedAnnotation.type,
                        group_id: copiedAnnotation.type === 'copy-move' ? copiedAnnotation.group_id : null
                    };

                    try {
                        const saved = await api.createAnnotation(payload);
                        const newAnno = { ...saved, ...payload, _id: saved._id || saved.id };
                        setAnnotations(prev => [...prev, newAnno]);

                        // Select pasted
                        setCrop(newCoords);
                        setSelectedAnnotationId(newAnno._id);
                        setAnnotationType(newAnno.type);
                        if (newAnno.group_id) setGroupId(newAnno.group_id);
                        setAnnotationText(newAnno.text || '');

                        showToast(t('common.pasted') || 'Pasted!', 'success');
                    } catch (err) {
                        console.error('Error pasting annotation:', err);
                        showToast(t('analysis.error'), 'error');
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [annotationMode, crop, selectedAnnotationId, copiedAnnotation, annotationType, groupId, annotationText, selectedImage, annotations]);


    const fetchImages = useCallback(async (page = 1) => {
        setLoadingImages(true);
        try {
            // Build query params with filters
            const queryParams = { page, per_page: IMAGES_PER_PAGE };
            if (filterSearch) queryParams.search = filterSearch;
            if (filterDateFrom) queryParams.date_from = filterDateFrom;
            if (filterDateTo) queryParams.date_to = filterDateTo;
            if (filterImageType) queryParams.image_type = filterImageType;

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

            const transformed = imageList.slice(0, IMAGES_PER_PAGE).map(img => ({
                id: img._id,
                filename: img.filename,
                fileSize: img.file_size,
                sourceType: img.source_type,
                mimeType: img.mime_type || 'image/jpeg',
                // Include EXIF metadata from API (try both naming conventions)
                exifMetadata: img.exifMetadata || img.exif_metadata || null
            }));

            setImages(transformed);
            setTotalImages(total);
        } catch (err) {
            console.error('Error fetching images:', err);
        } finally {
            setLoadingImages(false);
        }
    }, [filterSearch, filterDateFrom, filterDateTo, filterImageType]);

    // Run analysis
    const runAnalysis = async () => {
        if (!selectedImage || !imageUrls[selectedImage.id]) return;

        const tool = ANALYSIS_TOOLS[selectedTool];
        if (!tool) return;

        // For non-canvas tools, handle separately
        if (!tool.hasCanvas) {
            if (selectedTool === 'metadata') {
                try {
                    const { canvas } = await loadImageToCanvas(imageUrls[selectedImage.id]);
                    setOriginalCanvas(canvas);
                    const info = getImageInfo(canvas, selectedImage.mimeType);

                    // Include EXIF metadata from API if available
                    const rawExifData = selectedImage.exifMetadata || selectedImage.exif_metadata || {};

                    // Filter out sensitive/unnecessary fields
                    const fieldsToExclude = ['SourceFile', 'File:Directory', 'Directory'];
                    const exifData = Object.fromEntries(
                        Object.entries(rawExifData).filter(([key]) => !fieldsToExclude.includes(key))
                    );

                    setMetadata({
                        // Basic info
                        filename: selectedImage.filename,
                        sourceType: selectedImage.sourceType,
                        ...info,
                        // EXIF data from API
                        ...exifData
                    });
                } catch (err) {
                    console.error('Metadata error:', err);
                }
                return;
            }
            return;
        }

        setAnalyzing(true);
        setResultCanvas(null);

        try {
            const imageUrl = imageUrls[selectedImage.id];
            const { canvas } = await loadImageToCanvas(imageUrl);
            setOriginalCanvas(canvas);

            let result = null;

            switch (selectedTool) {
                case 'ela':
                    result = await applyErrorLevelAnalysis(canvas, params.elaQuality, params.elaScale, params.elaOpacity);
                    break;

                case 'noise':
                    result = applyNoiseAnalysis(canvas, params.noiseAmplitude, params.noiseEqualize, params.noiseOpacity);
                    break;

                case 'gradient':
                    result = applyLuminanceGradient(
                        canvas,
                        params.gradientIntensity,
                        params.gradientOpacity / 100,
                        params.gradientNormalize,
                        params.gradientEqualize
                    );
                    break;

                case 'levelSweep':
                    result = applyLevelSweep(canvas, params.sweepPosition, params.sweepWidth, params.sweepOpacity);
                    break;

                case 'cloneDetection':
                    result = applyCloneDetection(canvas, {
                        minSimilarity: params.cloneMinSimilarity,
                        minDetail: params.cloneMinDetail,
                        minClusterSize: params.cloneMinClusterSize,
                        blockSize: params.cloneBlockSize,
                        maxImageSize: params.cloneMaxImageSize,
                        showQuantized: params.cloneShowQuantized
                    });
                    break;

                default:
                    break;
            }

            if (result) {
                setResultCanvas(result);
            }
        } catch (err) {
            console.error('Analysis error:', err);
            showToast(t('analysis.error') || 'Error during analysis', 'error');
        } finally {
            setAnalyzing(false);
        }
    };

    // Draw result to visible canvas
    useEffect(() => {
        if (resultCanvas && resultCanvasRef.current && !showOriginal) {
            const ctx = resultCanvasRef.current.getContext('2d');
            resultCanvasRef.current.width = resultCanvas.width;
            resultCanvasRef.current.height = resultCanvas.height;
            ctx.drawImage(resultCanvas, 0, 0);
        }
    }, [resultCanvas, showOriginal]);

    const totalGalleryPages = Math.ceil(totalImages / IMAGES_PER_PAGE);
    const toolList = Object.values(ANALYSIS_TOOLS);

    // Render parameter controls based on selected tool
    const renderParameters = () => {
        switch (selectedTool) {
            case 'ela':
                return (
                    <div className="space-y-4">
                        <ParamSlider
                            label={t('analysis.params.jpegQuality') || 'JPEG Quality'}
                            value={params.elaQuality}
                            min={50}
                            max={99}
                            onChange={(v) => setParams(p => ({ ...p, elaQuality: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.errorScale') || 'Error Scale'}
                            value={params.elaScale}
                            min={1}
                            max={50}
                            onChange={(v) => setParams(p => ({ ...p, elaScale: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.opacity') || 'Opacity'}
                            value={params.elaOpacity}
                            min={0}
                            max={100}
                            unit="%"
                            onChange={(v) => setParams(p => ({ ...p, elaOpacity: v }))}
                        />
                    </div>
                );

            case 'noise':
                return (
                    <div className="space-y-4">
                        <ParamSlider
                            label={t('analysis.params.noiseAmplitude') || 'Noise Amplitude'}
                            value={params.noiseAmplitude}
                            min={1}
                            max={100}
                            onChange={(v) => setParams(p => ({ ...p, noiseAmplitude: v }))}
                        />
                        <ParamCheckbox
                            label={t('analysis.params.equalizeHistogram') || 'Equalize Histogram'}
                            checked={params.noiseEqualize}
                            onChange={(v) => setParams(p => ({ ...p, noiseEqualize: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.opacity') || 'Opacity'}
                            value={params.noiseOpacity}
                            min={0}
                            max={100}
                            unit="%"
                            onChange={(v) => setParams(p => ({ ...p, noiseOpacity: v }))}
                        />
                    </div>
                );

            case 'gradient':
                return (
                    <div className="space-y-4">
                        <ParamCheckbox
                            label={t('analysis.params.equalizeHistogram') || 'Equalize Histogram'}
                            checked={params.gradientEqualize}
                            onChange={(v) => setParams(p => ({ ...p, gradientEqualize: v }))}
                        />
                        <ParamCheckbox
                            label={t('analysis.params.normalize') || 'Normalize'}
                            checked={params.gradientNormalize}
                            onChange={(v) => setParams(p => ({ ...p, gradientNormalize: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.intensity') || 'Intensity'}
                            value={params.gradientIntensity}
                            min={1}
                            max={20}
                            step={0.1}
                            onChange={(v) => setParams(p => ({ ...p, gradientIntensity: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.opacity') || 'Opacity'}
                            value={params.gradientOpacity}
                            min={0}
                            max={100}
                            unit="%"
                            onChange={(v) => setParams(p => ({ ...p, gradientOpacity: v }))}
                        />

                    </div>
                );

            case 'levelSweep':
                return (
                    <div className="space-y-4">
                        <ParamSlider
                            label={t('analysis.params.sweep') || 'Sweep'}
                            value={Math.round(params.sweepPosition * 100)}
                            min={0}
                            max={100}
                            unit="%"
                            onChange={(v) => setParams(p => ({ ...p, sweepPosition: v / 100 }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.width') || 'Width'}
                            value={params.sweepWidth}
                            min={8}
                            max={128}
                            onChange={(v) => setParams(p => ({ ...p, sweepWidth: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.opacity') || 'Opacity'}
                            value={params.sweepOpacity}
                            min={0}
                            max={100}
                            unit="%"
                            onChange={(v) => setParams(p => ({ ...p, sweepOpacity: v }))}
                        />
                    </div>
                );

            case 'cloneDetection':
                return (
                    <div className="space-y-4">
                        <ParamSlider
                            label={t('analysis.params.minSimilarity') || 'Minimal Similarity'}
                            value={params.cloneMinSimilarity}
                            min={0.1}
                            max={1}
                            step={0.01}
                            onChange={(v) => setParams(p => ({ ...p, cloneMinSimilarity: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.minDetail') || 'Minimal Detail'}
                            value={params.cloneMinDetail}
                            min={0}
                            max={0.5}
                            step={0.01}
                            onChange={(v) => setParams(p => ({ ...p, cloneMinDetail: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.minClusterSize') || 'Minimal Cluster Size'}
                            value={params.cloneMinClusterSize}
                            min={1}
                            max={32}
                            onChange={(v) => setParams(p => ({ ...p, cloneMinClusterSize: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.blockSize') || 'Block Size'}
                            value={params.cloneBlockSize}
                            min={2}
                            max={16}
                            onChange={(v) => setParams(p => ({ ...p, cloneBlockSize: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.maxImageSize') || 'Maximal Image Size'}
                            value={params.cloneMaxImageSize}
                            min={256}
                            max={2048}
                            step={64}
                            unit="px"
                            onChange={(v) => setParams(p => ({ ...p, cloneMaxImageSize: v }))}
                        />
                        <ParamCheckbox
                            label={t('analysis.params.showQuantized') || 'Show Quantized Image'}
                            checked={params.cloneShowQuantized}
                            onChange={(v) => setParams(p => ({ ...p, cloneShowQuantized: v }))}
                        />
                    </div>
                );

            default:
                return (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        {t('analysis.noParams') || 'No adjustable parameters'}
                    </p>
                );
        }
    };

    // Render results for non-canvas tools
    const renderNonCanvasResults = () => {
        if (selectedTool === 'metadata' && metadata) {
            return (
                <div className="grid grid-cols-2 gap-3 p-4">
                    {Object.entries(metadata).map(([key, value]) => (
                        <div key={key} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                            <span className="block text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">{key}</span>
                            <span className="font-medium text-gray-900 dark:text-white text-sm">{value}</span>
                        </div>
                    ))}
                </div>
            );
        }

        return null;
    };

    // Annotation Handlers
    const handleSaveAnnotation = async () => {
        if (!selectedImage) return;

        // If no crop, we can't save a new region unless we are editing??
        // Assuming we creating new or updating...
        // For update we might not need crop if we just edit text.
        // But for now let's assume save = create new from crop OR update existing text.

        let coords = null;
        if (crop && crop.width > 0 && crop.height > 0) {
            coords = {
                x: crop.x,
                y: crop.y,
                width: crop.width,
                height: crop.height
            };
        } else if (selectedAnnotationId) {
            // Keep existing coords
            const existing = annotations.find(a => a._id === selectedAnnotationId);
            if (existing) coords = existing.coords;
        }

        if (!coords) {
            showToast(t('analysis.drawRegion'), 'warning');
            return;
        }

        const annotationData = {
            image_id: selectedImage.id,
            text: annotationText,
            coords: coords,
            type: annotationType,
            group_id: annotationType === 'copy-move' ? parseInt(groupId) : null
        };

        try {
            // If editing, delete old first (naive update) or use update endpoint if exists?
            // API only has create/delete. So delete then create.
            if (selectedAnnotationId) {
                await api.deleteAnnotation(selectedAnnotationId);
            }

            const saved = await api.createAnnotation(annotationData);

            // Optimistic update or refetch? simpler to append
            // But we need the ID.
            // saved should have ID.
            const newAnno = { ...saved, ...annotationData, _id: saved._id || saved.id }; // Fallback

            setAnnotations(prev => {
                const filtered = prev.filter(a => a._id !== selectedAnnotationId);
                return [...filtered, newAnno];
            });

            // Reset
            setCrop(null);
            setAnnotationText('');
            setSelectedAnnotationId(null);
            showToast(t('common.success'), 'success');
        } catch (err) {
            console.error('Error saving annotation:', err);
            showToast(t('analysis.error'), 'error');
        }
    };

    const handleDeleteAnnotation = async (id) => {
        if (!confirm(t('common.confirm'))) return;
        try {
            await api.deleteAnnotation(id);
            setAnnotations(prev => prev.filter(a => a._id !== id));
            if (selectedAnnotationId === id) {
                setSelectedAnnotationId(null);
                setCrop(null);
                setAnnotationText('');
            }
            showToast(t('common.success'), 'success');
        } catch (err) {
            showToast(t('analysis.error'), 'error');
        }
    };

    const handleAnnotationClick = (anno) => {
        if (!annotationMode) return;
        setSelectedAnnotationId(anno._id);
        setAnnotationText(anno.text || '');
        setAnnotationType(anno.type);
        if (anno.group_id) setGroupId(anno.group_id);
        setCrop(anno.coords); // Show the box as selected
    };

    const renderAnnotationControls = () => (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800">
            <h3 className="text-gray-900 dark:text-white text-lg font-semibold px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                {t('annotation.listTitle')}
            </h3>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {/* Input Controls */}
                <div className="space-y-4">
                    {/* Type Selector */}
                    <div className="flex p-1 bg-gray-100 dark:bg-black/30 rounded-lg">
                        <button
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${annotationType === 'manipulation' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                            onClick={() => setAnnotationType('manipulation')}
                        >
                            <FiEdit2 /> {t('annotation.manipulation')}
                        </button>
                        <button
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${annotationType === 'copy-move' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                            onClick={() => setAnnotationType('copy-move')}
                        >
                            <FiCopy /> {t('annotation.copyMove')}
                        </button>
                    </div>

                    {/* Group ID */}
                    {annotationType === 'copy-move' && (
                        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                            <FiLayers className="text-blue-500" />
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                                    {t('annotation.groupId')}
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={groupId}
                                    onChange={(e) => setGroupId(e.target.value)}
                                    className="w-full bg-white dark:bg-black/20 border border-blue-200 dark:border-blue-700 rounded px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Text Description */}
                    <textarea
                        value={annotationText}
                        onChange={(e) => setAnnotationText(e.target.value)}
                        placeholder={t('annotation.placeholder')}
                        className="w-full h-[80px] bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-3 text-gray-900 dark:text-white text-base resize-y focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleSaveAnnotation}
                            disabled={!crop && !selectedAnnotationId}
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <FiSave />
                            {selectedAnnotationId ? t('common.update') : t('analysis.saveAnnotation')}
                        </button>
                        {selectedAnnotationId && (
                            <button
                                onClick={() => {
                                    setSelectedAnnotationId(null);
                                    setCrop(null);
                                    setAnnotationText('');
                                }}
                                className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-bold"
                            >
                                {t('common.cancel')}
                            </button>
                        )}
                    </div>
                </div>

                {/* List */}
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider flex justify-between">
                        <span>{t('analysis.annotationList')} ({annotations.length})</span>
                    </h4>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-custom">
                        {annotations.length === 0 ? (
                            <p className="text-sm text-gray-400 italic text-center py-4">{t('annotation.noAnnotations')}</p>
                        ) : (
                            annotations.map(anno => {
                                const color = getGroupColor(anno.type, anno.group_id);
                                return (
                                    <div
                                        key={anno._id}
                                        onClick={() => handleAnnotationClick(anno)}
                                        className={`group relative flex flex-col rounded-lg p-3 border transition-all cursor-pointer ${selectedAnnotationId === anno._id
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/30'
                                            : 'bg-gray-50 dark:bg-black/20 border-transparent hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full shadow-sm"
                                                    style={{ backgroundColor: color }}
                                                />
                                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                    {anno.type === 'copy-move' ? `${t('annotation.copyMove')} (G${anno.group_id})` : t('annotation.manipulation')}
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteAnnotation(anno._id); }}
                                                className="text-gray-400 hover:text-red-500 px-1 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                        {anno.text && (
                                            <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{anno.text}</p>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );


    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
            {/* Top Bar: Tools */}
            <header className="flex-none px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <FiZap className="text-indigo-600 text-xl" />
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                            {t('analysis.title') || 'Image Analysis'}
                        </h1>
                    </div>

                    {/* Tool Selector - Horizontal scroll */}
                    <div className="flex-1 overflow-x-auto scrollbar-hide">
                        <div className="flex items-center gap-2 px-2">
                            {toolList.map((tool) => (
                                <ToolButton
                                    key={tool.id}
                                    tool={tool}
                                    isSelected={selectedTool === tool.id}
                                    onClick={() => setSelectedTool(tool.id)}
                                    t={t}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content: Split View */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Image Gallery */}
                <div className={`flex-none border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300 ${galleryCollapsed ? 'w-12' : 'w-64'
                    }`}>
                    <div className="h-full flex flex-col">
                        {/* Gallery Header */}
                        <div className="flex-none p-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            {!galleryCollapsed && (
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                    {t('analysis.selectImage') || 'Select Image'}
                                </span>
                            )}
                            <div className="flex items-center gap-1">
                                {!galleryCollapsed && (
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${(filterSearch || filterDateFrom || filterDateTo || filterImageType)
                                            ? 'text-indigo-500'
                                            : 'text-gray-500'
                                            }`}
                                        title={t('filters.toggle', 'Toggle filters')}
                                    >
                                        <FiFilter size={14} />
                                    </button>
                                )}
                                <button
                                    onClick={() => setGalleryCollapsed(!galleryCollapsed)}
                                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                                >
                                    {galleryCollapsed ? <FiMaximize2 size={14} /> : <FiMinimize2 size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Filter Panel */}
                        {!galleryCollapsed && showFilters && (
                            <div className="flex-none p-2 border-b border-gray-100 dark:border-gray-700 space-y-2">
                                {/* Search Input */}
                                <div className="relative">
                                    <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                    <input
                                        type="text"
                                        value={filterSearch}
                                        onChange={(e) => { setFilterSearch(e.target.value); setGalleryPage(1); }}
                                        placeholder={t('gallery.searchPlaceholder', 'Search...')}
                                        className="w-full pl-7 pr-2 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>

                                {/* Image Type Dropdown */}
                                <div className="relative">
                                    <FiTag className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                    <select
                                        value={filterImageType}
                                        onChange={(e) => { setFilterImageType(e.target.value); setGalleryPage(1); }}
                                        className="w-full pl-7 pr-2 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                                    >
                                        <option value="">{t('cbir.allTypes', 'All Types')}</option>
                                        {availableCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Date Range */}
                                <div className="grid grid-cols-2 gap-1">
                                    <div className="relative">
                                        <FiCalendar className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={10} />
                                        <input
                                            type="date"
                                            value={filterDateFrom}
                                            onChange={(e) => { setFilterDateFrom(e.target.value); setGalleryPage(1); }}
                                            className="w-full pl-6 pr-1 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            title={t('filters.dateFrom', 'From date')}
                                        />
                                    </div>
                                    <div className="relative">
                                        <FiCalendar className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={10} />
                                        <input
                                            type="date"
                                            value={filterDateTo}
                                            onChange={(e) => { setFilterDateTo(e.target.value); setGalleryPage(1); }}
                                            className="w-full pl-6 pr-1 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            title={t('filters.dateTo', 'To date')}
                                        />
                                    </div>
                                </div>

                                {/* Clear Filters */}
                                {(filterSearch || filterDateFrom || filterDateTo || filterImageType) && (
                                    <button
                                        onClick={() => {
                                            setFilterSearch('');
                                            setFilterDateFrom('');
                                            setFilterDateTo('');
                                            setFilterImageType('');
                                            setGalleryPage(1);
                                        }}
                                        className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    >
                                        <FiX size={12} />
                                        {t('filters.clearFilters', 'Clear filters')}
                                    </button>
                                )}

                                {/* Results count */}
                                <div className="text-center text-xs text-gray-400">
                                    {totalImages} {t('gallery.images', 'images')}
                                </div>
                            </div>
                        )}

                        {/* Gallery Content */}
                        {!galleryCollapsed && (
                            <div className="flex-1 overflow-y-auto p-2">
                                {loadingImages ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {[...Array(9)].map((_, i) => (
                                            <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                                        ))}
                                    </div>
                                ) : images.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 text-xs">
                                        {t('analysis.noImages') || 'No images'}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                        {images.map((img) => (
                                            <SourceImageCard
                                                key={img.id}
                                                image={img}
                                                isSelected={selectedImage?.id === img.id}
                                                onClick={() => setSelectedImage(img)}
                                                imageUrl={imageUrls[img.id]}
                                                loading={loadingUrls[img.id]}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Pagination */}
                        {!galleryCollapsed && totalImages > IMAGES_PER_PAGE && (
                            <div className="flex-none p-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-center gap-2">
                                <button
                                    onClick={() => setGalleryPage(p => Math.max(1, p - 1))}
                                    disabled={galleryPage <= 1}
                                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                                >
                                    <FiChevronLeft size={14} />
                                </button>
                                <span className="text-xs text-gray-500">{galleryPage}/{totalGalleryPages}</span>
                                <button
                                    onClick={() => setGalleryPage(p => Math.min(totalGalleryPages, p + 1))}
                                    disabled={galleryPage >= totalGalleryPages}
                                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                                >
                                    <FiChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Center: Image Display */}
                <div className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900 min-w-0">
                    {/* Image Container */}
                    <div className="flex-1 flex items-center justify-center p-4 overflow-hidden min-h-0">
                        {!selectedImage ? (
                            <div className="text-center text-gray-400">
                                <FiSearch size={48} className="mx-auto mb-3 opacity-50" />
                                <p className="text-sm">{t('analysis.selectAndRun') || 'Select an image to analyze'}</p>
                            </div>
                        ) : analyzing ? (
                            <div className="text-center">
                                <FiRefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                                <p className="text-sm text-gray-500">{t('analysis.processing') || 'Processing...'}</p>
                            </div>
                        ) : ANALYSIS_TOOLS[selectedTool]?.hasCanvas ? (
                            <div
                                ref={zoomContainerRef}
                                className={`w-full h-full flex items-center justify-center ${zoomLevel > 1 ? 'overflow-auto' : 'overflow-hidden'
                                    }`}
                                style={{
                                    cursor: zoomLevel > 1 ? 'grab' : 'default'
                                }}
                                onDoubleClick={() => setZoomLevel(1)}
                            >
                                <div
                                    style={{
                                        transform: `scale(${zoomLevel})`,
                                        transformOrigin: 'center center',
                                        transition: 'transform 0.15s ease-out',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {showOriginal && originalCanvas ? (
                                        <AnnotationOverlay
                                            isActive={annotationMode}
                                            crop={crop}
                                            onChange={setCrop}
                                            annotations={annotations}
                                            onAnnotationClick={handleAnnotationClick}
                                            selectedAnnotationId={selectedAnnotationId}
                                        >
                                            <img
                                                src={originalCanvas.toDataURL()}
                                                alt="Original"
                                                className="rounded-lg shadow-lg"
                                                draggable={false}
                                                style={{
                                                    maxWidth: zoomLevel === 1 ? 'calc(100vw - 450px)' : 'none',
                                                    maxHeight: zoomLevel === 1 ? 'calc(100vh - 250px)' : 'none',
                                                    objectFit: 'contain'
                                                }}
                                            />
                                        </AnnotationOverlay>
                                    ) : resultCanvas ? (
                                        <AnnotationOverlay
                                            isActive={annotationMode}
                                            crop={crop}
                                            onChange={setCrop}
                                            annotations={annotations}
                                            onAnnotationClick={handleAnnotationClick}
                                            selectedAnnotationId={selectedAnnotationId}
                                        >
                                            <canvas
                                                ref={resultCanvasRef}
                                                className="rounded-lg shadow-lg"
                                                style={{
                                                    maxWidth: zoomLevel === 1 ? 'calc(100vw - 450px)' : 'none',
                                                    maxHeight: zoomLevel === 1 ? 'calc(100vh - 250px)' : 'none'
                                                }}
                                            />
                                        </AnnotationOverlay>
                                    ) : originalCanvas ? (
                                        <AnnotationOverlay
                                            isActive={annotationMode}
                                            crop={crop}
                                            onChange={setCrop}
                                            annotations={annotations}
                                            onAnnotationClick={handleAnnotationClick}
                                            selectedAnnotationId={selectedAnnotationId}
                                        >
                                            <img
                                                src={originalCanvas.toDataURL()}
                                                alt="Original"
                                                className="rounded-lg shadow-lg opacity-50"
                                                draggable={false}
                                                style={{
                                                    maxWidth: zoomLevel === 1 ? 'calc(100vw - 450px)' : 'none',
                                                    maxHeight: zoomLevel === 1 ? 'calc(100vh - 250px)' : 'none',
                                                    objectFit: 'contain'
                                                }}
                                            />
                                        </AnnotationOverlay>
                                    ) : null}
                                </div>
                            </div>
                        ) : (
                            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                                {renderNonCanvasResults() || (
                                    <div className="p-8 text-center text-gray-400">
                                        <p>{t('analysis.selectImageFirst') || 'Select an image'}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Bottom Bar: Controls */}
                    <div className="flex-none px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                {/* Toggle Original */}
                                {ANALYSIS_TOOLS[selectedTool]?.hasCanvas && resultCanvas && (
                                    <button
                                        onClick={() => setShowOriginal(!showOriginal)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${showOriginal
                                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                            }`}
                                    >
                                        {showOriginal ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                                        <span>{showOriginal ? t('analysis.result') || 'Show Result' : t('analysis.original') || 'Show Original'}</span>
                                    </button>
                                )}

                                {/* Zoom Controls */}
                                {ANALYSIS_TOOLS[selectedTool]?.hasCanvas && (resultCanvas || originalCanvas) && (
                                    <>
                                        {/* Quick Annotation Toggle (Simple Mode) */}
                                        <button
                                            onClick={() => setAnnotationMode(!annotationMode)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors border mr-2 ${annotationMode
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50'
                                                }`}
                                            title={t('analysis.quickAnnotate') || 'Quick Annotate (Rectangle only)'}
                                        >
                                            <FiEdit2 size={14} />
                                            <span>{t('analysis.annotate')}</span>
                                        </button>
                                        
                                        {/* Advanced Annotation Button (Opens Modal) */}
                                        <button
                                            onClick={() => setShowAnnotationModal(true)}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors border mr-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-sm hover:from-purple-700 hover:to-indigo-700"
                                            title={t('analysis.advancedAnnotate') || 'Advanced Annotation (Rectangles, Ellipses, Polygons)'}
                                        >
                                            <FiPenTool size={14} />
                                            <span>{t('analysis.advancedAnnotate') || 'Advanced'}</span>
                                        </button>

                                        <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                            <button
                                                onClick={() => setZoomLevel(z => Math.max(0.25, z - 0.25))}
                                                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 transition-colors"
                                                title={t('analysis.zoomOut') || 'Zoom Out'}
                                            >
                                                <FiZoomOut size={16} />
                                            </button>
                                            <button
                                                onClick={() => setZoomLevel(1)}
                                                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${zoomLevel === 1
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
                                                    }`}
                                                title={t('analysis.fitToScreen') || 'Fit to Screen'}
                                            >
                                                Fit
                                            </button>
                                            <span className="text-xs text-gray-500 min-w-[40px] text-center">
                                                {Math.round(zoomLevel * 100)}%
                                            </span>
                                            <button
                                                onClick={() => setZoomLevel(z => Math.min(4, z + 0.25))}
                                                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 transition-colors"
                                                title={t('analysis.zoomIn') || 'Zoom In'}
                                            >
                                                <FiZoomIn size={16} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Download */}
                                {resultCanvas && (
                                    <button
                                        onClick={() => {
                                            const link = document.createElement('a');
                                            link.download = `analysis-${selectedTool}-${Date.now()}.png`;
                                            link.href = resultCanvas.toDataURL('image/png');
                                            link.click();
                                        }}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <FiDownload size={14} />
                                        <span>{t('common.download') || 'Download'}</span>
                                    </button>
                                )}

                                {/* Selected filename */}
                                {selectedImage && (
                                    <span className="text-xs text-gray-500 truncate max-w-[200px]">
                                        {selectedImage.filename}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Parameters */}
                <div className="flex-none w-64 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="h-full flex flex-col">
                        <div className="flex-none p-3 border-b border-gray-100 dark:border-gray-700">
                            {annotationMode ? null : (
                                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                    {t('analysis.parameters') || 'Parameters'}
                                </h3>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {annotationMode ? renderAnnotationControls() : (
                                <div className="p-3">
                                    {renderParameters()}
                                </div>
                            )}
                        </div>

                        {/* Tool Description */}
                        <div className="flex-none p-3 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {t(`analysis.tools.${selectedTool}.description`) || ANALYSIS_TOOLS[selectedTool]?.description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Advanced Annotation Modal */}
            <AnnotationModal
                isOpen={showAnnotationModal}
                imageUrl={selectedImage ? imageUrls[selectedImage.id] : null}
                imageId={selectedImage?.id}
                imageName={selectedImage?.filename}
                existingAnnotations={annotations}
                onClose={() => setShowAnnotationModal(false)}
                onSaveSuccess={(savedAnnotations) => {
                    // Refresh annotations from API
                    if (selectedImage) {
                        api.getAnnotations(selectedImage.id)
                            .then(data => setAnnotations(data || []))
                            .catch(err => console.error('Error refreshing annotations:', err));
                    }
                    setShowAnnotationModal(false);
                }}
            />
        </div>
    );
};

export default ImageAnalysisPage;
