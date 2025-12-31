import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '../services/api';
import { showToast } from '../utils/alert';
import {
    loadImageToCanvas,
    applyErrorLevelAnalysis,
    applyNoiseAnalysis,
    applyLuminanceGradient,
    applyLevelSweep,
    applyCloneDetection,
    getImageInfo
} from '../utils/imageAnalysis';
import { ANALYSIS_TOOLS } from '../constants/analysisTools';

export const useImageAnalysis = (selectedImage, t) => {
    // Tool Selection
    const [selectedTool, setSelectedTool] = useState('ela');

    // Tool Parameters
    const [params, setParams] = useState({
        // ELA
        elaQuality: 75,
        elaScale: 15,
        elaOpacity: 100,
        // Noise
        noiseAmplitude: 20,
        noiseEqualize: false,
        noiseOpacity: 100,
        // Gradient
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
    const [loadedImageId, setLoadedImageId] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Refs
    const analysisTimeoutRef = useRef(null);

    // Load source image when selection changes
    useEffect(() => {
        if (!selectedImage) {
            setOriginalCanvas(null);
            setResultCanvas(null);
            setLoadedImageId(null);
            return;
        }

        // If the same image is already loaded, don't reload
        if (loadedImageId === selectedImage.id && originalCanvas) {
            return;
        }

        let isMounted = true;

        const loadSource = async () => {
            setAnalyzing(true);
            setResultCanvas(null);
            setOriginalCanvas(null);

            try {
                // Download image
                const blob = await api.download(`/images/${selectedImage.id}/download`);
                if (!isMounted) return;

                const imageUrl = URL.createObjectURL(blob);
                const { canvas } = await loadImageToCanvas(imageUrl);
                URL.revokeObjectURL(imageUrl); // Clean up

                if (isMounted) {
                    setOriginalCanvas(canvas);
                    setLoadedImageId(selectedImage.id);
                }
            } catch (err) {
                console.error('Failed to load source image:', err);
                if (isMounted) {
                    showToast(t('analysis.errorLoadImage'), 'error');
                }
            } finally {
                if (isMounted) {
                    setAnalyzing(false);
                }
            }
        };

        loadSource();

        return () => {
            isMounted = false;
        };
    }, [selectedImage, loadedImageId, originalCanvas, t]);

    // Metadata extraction
    useEffect(() => {
        if (selectedTool === 'metadata' && selectedImage && originalCanvas) {
            const info = getImageInfo(originalCanvas, selectedImage.mimeType);
            const rawExifData = selectedImage.exifMetadata || {};
            const fieldsToExclude = ['SourceFile', 'File:Directory', 'Directory'];
            const exifData = Object.fromEntries(
                Object.entries(rawExifData).filter(([key]) => !fieldsToExclude.includes(key))
            );

            setMetadata({
                filename: selectedImage.filename,
                sourceType: selectedImage.sourceType,
                ...info,
                ...exifData
            });
        }
    }, [selectedTool, selectedImage, originalCanvas]);

    // Run Analysis Function
    const runAnalysis = useCallback(async (forcedOpacity = null) => {
        if (!selectedImage || !originalCanvas || selectedImage.id !== loadedImageId) return;

        const tool = ANALYSIS_TOOLS[selectedTool];
        if (!tool || !tool.hasCanvas) return;

        setAnalyzing(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 10)); // Yield to UI

            let result = null;
            const resolveOpacity = (val) => (forcedOpacity !== null ? forcedOpacity : val);

            switch (selectedTool) {
                case 'ela':
                    result = await applyErrorLevelAnalysis(
                        originalCanvas,
                        params.elaQuality,
                        params.elaScale,
                        resolveOpacity(params.elaOpacity)
                    );
                    break;
                case 'noise':
                    result = applyNoiseAnalysis(
                        originalCanvas,
                        params.noiseAmplitude,
                        params.noiseEqualize,
                        resolveOpacity(params.noiseOpacity)
                    );
                    break;
                case 'gradient':
                    result = applyLuminanceGradient(
                        originalCanvas,
                        params.gradientIntensity,
                        resolveOpacity(params.gradientOpacity) / 100,
                        params.gradientNormalize,
                        params.gradientEqualize
                    );
                    break;
                case 'levelSweep':
                    result = applyLevelSweep(
                        originalCanvas,
                        params.sweepPosition,
                        params.sweepWidth,
                        resolveOpacity(params.sweepOpacity)
                    );
                    break;
                case 'cloneDetection':
                    result = applyCloneDetection(originalCanvas, {
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
    }, [selectedImage, originalCanvas, loadedImageId, selectedTool, params, t]);


    // Auto-run analysis when tool or params change (debounced)
    useEffect(() => {
        if (!selectedImage || !originalCanvas) return;

        if (analysisTimeoutRef.current) {
            clearTimeout(analysisTimeoutRef.current);
        }

        // Debounce
        analysisTimeoutRef.current = setTimeout(() => {
            runAnalysis();
        }, 300);

        return () => {
            if (analysisTimeoutRef.current) {
                clearTimeout(analysisTimeoutRef.current);
            }
        };
    }, [runAnalysis, selectedImage, originalCanvas]);

    const saveAnalysisToDashboard = useCallback(async () => {
        if (!selectedImage || !resultCanvas) {
            showToast(t('analysis.selectImageFirst') || 'Select an image first', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            const blob = await new Promise((resolve) => resultCanvas.toBlob(resolve, 'image/png'));

            // Construct parameters object
            const toolParams = {};
            switch (selectedTool) {
                case 'ela':
                    toolParams.quality = params.elaQuality;
                    toolParams.scale = params.elaScale;
                    toolParams.opacity = params.elaOpacity;
                    break;
                case 'noise':
                    toolParams.amplitude = params.noiseAmplitude;
                    toolParams.equalize = params.noiseEqualize;
                    toolParams.opacity = params.noiseOpacity;
                    break;
                case 'gradient':
                    toolParams.intensity = params.gradientIntensity;
                    toolParams.opacity = params.gradientOpacity;
                    toolParams.normalize = params.gradientNormalize;
                    toolParams.equalize = params.gradientEqualize;
                    break;
                case 'levelSweep':
                    toolParams.position = params.sweepPosition;
                    toolParams.width = params.sweepWidth;
                    toolParams.opacity = params.sweepOpacity;
                    break;
                case 'cloneDetection':
                    toolParams.minSimilarity = params.cloneMinSimilarity;
                    toolParams.minDetail = params.cloneMinDetail;
                    toolParams.minClusterSize = params.cloneMinClusterSize;
                    toolParams.blockSize = params.cloneBlockSize;
                    toolParams.maxImageSize = params.cloneMaxImageSize;
                    toolParams.showQuantized = params.cloneShowQuantized;
                    break;
                default: break;
            }

            await api.saveImageAnalysis({
                image_id: selectedImage.id,
                analysis_subtype: selectedTool,
                parameters: toolParams,
                notes: `${ANALYSIS_TOOLS[selectedTool]?.name} analysis of ${selectedImage.filename}`,
                result_image: blob
            });

            showToast(t('analysis.savedToDashboard') || 'Analysis saved to dashboard!', 'success');
        } catch (err) {
            console.error('Error saving analysis:', err);
            showToast(t('analysis.saveError') || 'Failed to save analysis', 'error');
        } finally {
            setIsSaving(false);
        }
    }, [selectedImage, resultCanvas, selectedTool, params, t]);

    return useMemo(() => ({
        selectedTool,
        setSelectedTool,
        params,
        setParams,
        analyzing,
        resultCanvas,
        originalCanvas,
        metadata,
        runAnalysis,
        saveAnalysisToDashboard,
        isSaving,
        setResultCanvas,
        setOriginalCanvas,
        setLoadedImageId
    }), [
        selectedTool,
        params,
        analyzing,
        resultCanvas,
        originalCanvas,
        metadata,
        runAnalysis,
        saveAnalysisToDashboard,
        isSaving
    ]);
};
