import { useEffect, useRef } from 'react';
import { api } from '../../../services/api';
import { showAlert, showToast } from '../../../utils/alert';
import { STEPS } from '../constants';

export const useCopyMoveInitialization = ({
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
}) => {
    // Refs to prevent double execution in React Strict Mode or due to re-renders
    const initializedReproduce = useRef(false);
    const initializedViewResults = useRef(false);
    const initializedStartAnalysis = useRef(false);

    // Handle reproduce analysis from Analysis Dashboard
    useEffect(() => {
        if (initializedReproduce.current) return;
        const reproduceData = sessionStorage.getItem('reproduceAnalysis');
        if (!reproduceData) return;

        const loadReproduceData = async () => {
            initializedReproduce.current = true;
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
    }, [t, setDenseMethod, setDescriptor, setLoadingReproduce, setMethodType, setMode, setSourceImage, setTargetImage, setCurrentStep]);

    // Handle view results from Analysis Dashboard (load stored results)
    useEffect(() => {
        if (initializedViewResults.current) return;
        const viewResultsData = sessionStorage.getItem('viewResultsAnalysis');
        if (!viewResultsData) return;

        const loadViewResultsData = async () => {
            initializedViewResults.current = true;
            setLoadingReproduce(true);
            try {
                const { analysisId, imageId, targetImageId, type } = JSON.parse(viewResultsData);
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
    }, [t, setAnalysisId, setAnalysisResults, setAnalysisStatus, setCurrentStep, setLoadingReproduce, setMode, setSourceImage, setTargetImage]);

    // Handle start analysis from Gallery (Analyze button)
    useEffect(() => {
        if (initializedStartAnalysis.current) return;
        const startAnalysisData = sessionStorage.getItem('startAnalysis');
        if (!startAnalysisData) return;

        const loadStartAnalysisData = async () => {
            initializedStartAnalysis.current = true;
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

                // Set default method: Cross -> Keypoint, Single -> Dense
                if (isCrossMode) {
                    setMethodType('keypoint');
                } else {
                    setMethodType('dense');
                }

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
    }, [t, setBatchImages, setBatchMode, setCurrentStep, setDenseMethod, setLoadingReproduce, setMethodType, setMode, setSourceImage, setTargetImage]);
};
