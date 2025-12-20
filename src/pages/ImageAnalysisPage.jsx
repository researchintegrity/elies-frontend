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
    FiZoomOut
} from 'react-icons/fi';
import { api } from '../services/api';
import { showToast } from '../utils/alert';
import { useLanguage } from '../context/LanguageContext';
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

    // Refs
    const resultCanvasRef = useRef(null);
    const analysisTimeoutRef = useRef(null);
    const zoomContainerRef = useRef(null);

    // Fetch images
    useEffect(() => {
        fetchImages(galleryPage);
    }, [galleryPage]);

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

    const fetchImages = useCallback(async (page = 1) => {
        setLoadingImages(true);
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
    }, []);

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

                    {/* Attribution */}
                    <a
                        href="https://29a.ch/photo-forensics/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-500 transition-colors whitespace-nowrap"
                    >
                        <span>Forensically</span>
                        <FiExternalLink size={10} />
                    </a>
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
                            <button
                                onClick={() => setGalleryCollapsed(!galleryCollapsed)}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                            >
                                {galleryCollapsed ? <FiMaximize2 size={14} /> : <FiMinimize2 size={14} />}
                            </button>
                        </div>

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
                                        <img
                                            src={originalCanvas.toDataURL()}
                                            alt="Original"
                                            className="rounded-lg shadow-lg"
                                            style={{
                                                maxWidth: zoomLevel === 1 ? 'calc(100vw - 450px)' : 'none',
                                                maxHeight: zoomLevel === 1 ? 'calc(100vh - 250px)' : 'none',
                                                objectFit: 'contain'
                                            }}
                                        />
                                    ) : resultCanvas ? (
                                        <canvas
                                            ref={resultCanvasRef}
                                            className="rounded-lg shadow-lg"
                                            style={{
                                                maxWidth: zoomLevel === 1 ? 'calc(100vw - 450px)' : 'none',
                                                maxHeight: zoomLevel === 1 ? 'calc(100vh - 250px)' : 'none'
                                            }}
                                        />
                                    ) : originalCanvas ? (
                                        <img
                                            src={originalCanvas.toDataURL()}
                                            alt="Original"
                                            className="rounded-lg shadow-lg opacity-50"
                                            style={{
                                                maxWidth: zoomLevel === 1 ? 'calc(100vw - 450px)' : 'none',
                                                maxHeight: zoomLevel === 1 ? 'calc(100vh - 250px)' : 'none',
                                                objectFit: 'contain'
                                            }}
                                        />
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
                            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                {t('analysis.parameters') || 'Parameters'}
                            </h3>
                        </div>

                        <div className="flex-1 p-3 overflow-y-auto">
                            {renderParameters()}
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
        </div>
    );
};

export default ImageAnalysisPage;
