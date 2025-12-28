// src/components/annotation/AnnotationModal.jsx
/**
 * Annotation Modal Component
 * 
 * A full-screen modal for image annotation that opens from the analysis page.
 * Provides a focused annotation experience without leaving the analysis context.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    FiX,
    FiHelpCircle,
    FiCopy,
    FiEye,
    FiEyeOff,
} from 'react-icons/fi';
import {
    AnnotationProvider,
    useAnnotation,
    ShapeTypes,
    ToolTypes,
    DefaultLabels,
} from '../../context/AnnotationContext';
import {
    findAnnotationAtPoint,
    getHandleAtPoint,
    findClosestPolygonPoint,
    moveAnnotation,
    resizeAnnotation,
    movePolygonPoint,
    toPercentCoords,
    exportAnnotationsToJSON,
    isValidAnnotation,
    distance,
} from '../../utils/annotationHelpers';
import SVGAnnotationLayer from './SVGAnnotationLayer';
import AnnotationToolbar from './AnnotationToolbar';
import LabelsPanel from './LabelsPanel';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { showToast } from '../../utils/alert';

// Helper component for hotkey display
const HotkeyRow = ({ shortcut, description }) => (
    <div className="flex items-center justify-between">
        <span className="text-gray-300 text-sm">{description}</span>
        <kbd className="px-2 py-1 bg-gray-700 rounded text-xs font-mono text-gray-200 min-w-[60px] text-center">
            {shortcut}
        </kbd>
    </div>
);

// Inner modal content
const AnnotationModalInner = ({
    imageUrl,
    imageId,
    imageName,
    existingAnnotations = [],
    onClose,
    onSaveSuccess,
    // Analysis overlay props
    analysisCanvas = null,
    analysisToolId = '',
    analysisToolName = '',
    analysisParams = {},
    onAnalysisParamsChange = null,
    onRunAnalysis = null,
    availableAnalysisTools = [],
}) => {
    const { t } = useLanguage();
    const { state, actions } = useAnnotation();
    const { activeTool, isDrawing, currentShape, selectedId, annotations } = state;

    // Refs
    const containerRef = useRef(null);
    const imageRef = useRef(null);

    // State
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [zoom, setZoom] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [showPanel, setShowPanel] = useState(true);
    const [clipboard, setClipboard] = useState(null);
    const [showHotkeys, setShowHotkeys] = useState(false);
    const [showAnalysisOverlay, setShowAnalysisOverlay] = useState(false);
    const [analysisOpacity, setAnalysisOpacity] = useState(1.0); // Start at 100% opacity

    // Interaction state
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(null);
    const [dragType, setDragType] = useState(null);
    const [activeHandle, setActiveHandle] = useState(null);
    const [activePointIndex, setActivePointIndex] = useState(null);
    const [draggedAnnotation, setDraggedAnnotation] = useState(null);

    // Initialize
    useEffect(() => {
        if (imageId) {
            actions.setImage({ id: imageId });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageId]);

    // Load existing annotations
    useEffect(() => {
        if (existingAnnotations.length > 0 && imageSize.width > 0) {
            // Map API format to internal format
            const mappedAnnotations = existingAnnotations.map(ann => {
                const label = DefaultLabels.find(l => l.id === ann.type) || {
                    id: ann.type || 'manipulation',
                    name: ann.type || 'Manipulation',
                    color: '#EF4444',
                };

                // Determine shape type from saved data
                const shapeType = ann.shape_type || ShapeTypes.RECTANGLE;

                // Base annotation data
                const mappedAnn = {
                    id: ann._id || ann.id,
                    type: shapeType,
                    label,
                    groupId: ann.group_id || null,
                    description: ann.text || '',
                    createdAt: ann.created_at,
                };

                // Convert coordinates based on shape type
                if (shapeType === ShapeTypes.POLYGON && ann.coords?.points) {
                    // Polygon: convert points array
                    mappedAnn.points = ann.coords.points.map(p => ({
                        x: (p.x / 100) * imageSize.width,
                        y: (p.y / 100) * imageSize.height,
                    }));
                    // Set bounding box for selection
                    mappedAnn.x = 0;
                    mappedAnn.y = 0;
                    mappedAnn.width = 0;
                    mappedAnn.height = 0;
                } else {
                    // Rectangle/Ellipse: use x, y, width, height
                    mappedAnn.x = (ann.coords?.x / 100) * imageSize.width;
                    mappedAnn.y = (ann.coords?.y / 100) * imageSize.height;
                    mappedAnn.width = (ann.coords?.width / 100) * imageSize.width;
                    mappedAnn.height = (ann.coords?.height / 100) * imageSize.height;
                }

                return mappedAnn;
            });

            actions.setAnnotations(mappedAnnotations);

            // Set next group ID
            const maxGroupId = existingAnnotations
                .filter(a => a.group_id)
                .reduce((max, a) => Math.max(max, a.group_id), 0);
            if (maxGroupId > 0) {
                actions.setNextGroupId(maxGroupId + 1);
            }
        }
    }, [existingAnnotations, imageSize, actions]);

    // Image load handler
    const handleImageLoad = useCallback((e) => {
        const { naturalWidth, naturalHeight } = e.target;
        setImageSize({ width: naturalWidth, height: naturalHeight });
        setImageLoaded(true);
        actions.setImageDimensions({ width: naturalWidth, height: naturalHeight });
    }, [actions]);

    // Get mouse position
    const getMousePosition = useCallback((e) => {
        if (!imageRef.current) return { x: 0, y: 0 };
        const rect = imageRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / zoom,
            y: (e.clientY - rect.top) / zoom,
        };
    }, [zoom]);

    // Mouse handlers
    const handleMouseDown = useCallback((e) => {
        if (e.button !== 0) return;

        const pos = getMousePosition(e);
        setDragStart(pos);

        if (activeTool === ToolTypes.SELECT) {
            const clickedAnnotation = findAnnotationAtPoint(pos, annotations);

            if (clickedAnnotation) {
                if (selectedId === clickedAnnotation.id) {
                    const handle = getHandleAtPoint(pos, clickedAnnotation);
                    if (handle) {
                        setDragType('resize');
                        setActiveHandle(handle);
                        setDraggedAnnotation({ ...clickedAnnotation });
                        setIsDragging(true);
                        return;
                    }

                    if (clickedAnnotation.type === ShapeTypes.POLYGON) {
                        const pointIdx = findClosestPolygonPoint(pos, clickedAnnotation.points, 15);
                        if (pointIdx >= 0) {
                            setDragType('polygon-point');
                            setActivePointIndex(pointIdx);
                            setDraggedAnnotation({ ...clickedAnnotation });
                            setIsDragging(true);
                            return;
                        }
                    }
                }

                actions.selectAnnotation(clickedAnnotation.id);
                setDragType('move');
                setDraggedAnnotation({ ...clickedAnnotation });
                setIsDragging(true);
            } else {
                actions.clearSelection();
            }
        } else if (activeTool === ToolTypes.RECTANGLE || activeTool === ToolTypes.ELLIPSE) {
            setDragType('draw');
            setIsDragging(true);
            actions.startDrawing({
                type: activeTool === ToolTypes.RECTANGLE ? ShapeTypes.RECTANGLE : ShapeTypes.ELLIPSE,
                x: pos.x,
                y: pos.y,
                width: 0,
                height: 0,
            });
        } else if (activeTool === ToolTypes.POLYGON) {
            if (!isDrawing) {
                actions.startDrawing({
                    type: ShapeTypes.POLYGON,
                    points: [pos],
                    previewPoint: pos,
                });
            } else {
                const firstPoint = currentShape?.points?.[0];
                if (firstPoint && currentShape.points.length >= 3) {
                    const distToFirst = distance(pos, firstPoint);
                    if (distToFirst < 15) {
                        actions.finishDrawing();
                        return;
                    }
                }
                actions.addPolygonPoint(pos);
            }
        } else if (activeTool === ToolTypes.DELETE) {
            const clickedAnnotation = findAnnotationAtPoint(pos, annotations);
            if (clickedAnnotation) {
                actions.deleteAnnotation(clickedAnnotation.id);
            }
        }
    }, [activeTool, annotations, selectedId, isDrawing, currentShape, getMousePosition, actions]);

    const handleMouseMove = useCallback((e) => {
        const pos = getMousePosition(e);

        if (isDrawing && activeTool === ToolTypes.POLYGON) {
            actions.updateDrawing({ previewPoint: pos });
        }

        if (isDragging && dragStart) {
            const delta = { x: pos.x - dragStart.x, y: pos.y - dragStart.y };

            if (dragType === 'draw') {
                actions.updateDrawing({ width: delta.x, height: delta.y });
            } else if (dragType === 'move' && draggedAnnotation) {
                const moved = moveAnnotation(draggedAnnotation, delta);
                actions.updateAnnotation(moved);
            } else if (dragType === 'resize' && draggedAnnotation && activeHandle) {
                const resized = resizeAnnotation(draggedAnnotation, activeHandle, delta);
                actions.updateAnnotation(resized);
            } else if (dragType === 'polygon-point' && draggedAnnotation && activePointIndex !== null) {
                const updated = movePolygonPoint(draggedAnnotation, activePointIndex, pos);
                actions.updateAnnotation(updated);
            }
        }

        if (activeTool === ToolTypes.SELECT && !isDragging) {
            const hoveredAnnotation = findAnnotationAtPoint(pos, annotations);
            actions.hoverAnnotation(hoveredAnnotation?.id || null);
        }
    }, [isDragging, dragStart, dragType, draggedAnnotation, activeHandle, activePointIndex, activeTool, isDrawing, getMousePosition, annotations, actions]);

    const handleMouseUp = useCallback(() => {
        if (dragType === 'draw' && currentShape) {
            if (isValidAnnotation(currentShape)) {
                actions.finishDrawing();
            } else {
                actions.cancelDrawing();
            }
        }

        if (activeTool !== ToolTypes.POLYGON || dragType !== null) {
            setIsDragging(false);
            setDragStart(null);
            setDragType(null);
            setActiveHandle(null);
            setActivePointIndex(null);
            setDraggedAnnotation(null);
        }
    }, [dragType, currentShape, activeTool, actions]);

    const handleDoubleClick = useCallback(() => {
        if (isDrawing && activeTool === ToolTypes.POLYGON && currentShape?.points?.length >= 3) {
            actions.finishDrawing();
        }
    }, [isDrawing, activeTool, currentShape, actions]);

    const handleMouseLeave = useCallback(() => {
        actions.hoverAnnotation(null);
    }, [actions]);

    // Click handlers for SVG layer
    const handleAnnotationMouseDown = useCallback((e, annotation) => {
        e.stopPropagation();
        if (activeTool === ToolTypes.DELETE) {
            actions.deleteAnnotation(annotation.id);
            return;
        }
        if (activeTool === ToolTypes.SELECT) {
            const pos = getMousePosition(e);
            if (selectedId === annotation.id) {
                const handle = getHandleAtPoint(pos, annotation);
                if (handle) {
                    setDragStart(pos);
                    setDragType('resize');
                    setActiveHandle(handle);
                    setDraggedAnnotation({ ...annotation });
                    setIsDragging(true);
                    return;
                }
            }
            actions.selectAnnotation(annotation.id);
            setDragStart(pos);
            setDragType('move');
            setDraggedAnnotation({ ...annotation });
            setIsDragging(true);
        }
    }, [activeTool, selectedId, getMousePosition, actions]);

    const handleHandleMouseDown = useCallback((e, annotation, handle) => {
        e.stopPropagation();
        const pos = getMousePosition(e);
        setDragStart(pos);
        setDragType('resize');
        setActiveHandle(handle);
        setDraggedAnnotation({ ...annotation });
        setIsDragging(true);
    }, [getMousePosition]);

    const handlePolygonPointMouseDown = useCallback((e, annotation, pointIndex) => {
        e.stopPropagation();
        const pos = getMousePosition(e);
        setDragStart(pos);
        setDragType('polygon-point');
        setActivePointIndex(pointIndex);
        setDraggedAnnotation({ ...annotation });
        setIsDragging(true);
    }, [getMousePosition]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            if (e.key === 'Escape') {
                e.stopPropagation(); // Prevent bubbling to parent (FlaggedImagesPage)
                if (isDrawing) {
                    actions.cancelDrawing();
                } else if (selectedId) {
                    actions.clearSelection();
                } else {
                    onClose();
                }
            }

            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !isDrawing) {
                e.preventDefault();
                actions.deleteSelected();
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                actions.undo();
            }

            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                actions.redo();
            }

            // Copy selected annotation
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedId) {
                e.preventDefault();
                const selected = annotations.find(a => a.id === selectedId);
                if (selected) {
                    setClipboard({ ...selected });
                    showToast('Annotation copied', 'success');
                }
            }

            // Paste annotation
            if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard) {
                e.preventDefault();
                const offset = 20; // Offset to make pasted annotation visible
                const newAnnotation = {
                    ...clipboard,
                    id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    x: clipboard.x + offset,
                    y: clipboard.y + offset,
                    createdAt: new Date().toISOString(),
                };
                // Handle polygon points offset
                if (newAnnotation.type === ShapeTypes.POLYGON && newAnnotation.points) {
                    newAnnotation.points = newAnnotation.points.map(p => ({
                        x: p.x + offset,
                        y: p.y + offset,
                    }));
                }
                actions.addAnnotation(newAnnotation);
                actions.selectAnnotation(newAnnotation.id);
                showToast('Annotation pasted', 'success');
            }

            // Toggle hotkeys help with ?
            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                setShowHotkeys(prev => !prev);
            }

            // Toggle analysis overlay with 'a' (only if analysis is available)
            if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'a' && analysisCanvas) {
                e.preventDefault();
                setShowAnalysisOverlay(prev => !prev);
            }

            if (!e.ctrlKey && !e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'v': actions.setTool(ToolTypes.SELECT); break;
                    case 'r': actions.setTool(ToolTypes.RECTANGLE); break;
                    case 'e': actions.setTool(ToolTypes.ELLIPSE); break;
                    case 'p': actions.setTool(ToolTypes.POLYGON); break;
                    // 'a' handled above for analysis toggle
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDrawing, selectedId, annotations, clipboard, analysisCanvas, actions, onClose]);

    // Zoom
    const handleZoomIn = useCallback(() => setZoom(z => Math.min(4, z + 0.25)), []);
    const handleZoomOut = useCallback(() => setZoom(z => Math.max(0.25, z - 0.25)), []);
    const handleFitToScreen = useCallback(() => setZoom(1), []);

    // Wheel zoom
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const handleWheel = (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                setZoom(z => Math.min(4, Math.max(0.25, z + delta)));
            }
        };
        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, []);

    // Save handler
    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            // Delete existing annotations
            for (const existing of existingAnnotations) {
                try {
                    await api.deleteAnnotation(existing._id || existing.id);
                } catch (e) {
                    console.warn('Error deleting old annotation:', e);
                }
            }

            // Save new annotations
            const savedAnnotations = [];
            for (const ann of annotations) {
                // Convert to API format (percentage coordinates)
                const percentCoords = {
                    x: (ann.x / imageSize.width) * 100,
                    y: (ann.y / imageSize.height) * 100,
                    width: (ann.width / imageSize.width) * 100,
                    height: (ann.height / imageSize.height) * 100,
                };

                // For polygons, convert points
                if (ann.type === ShapeTypes.POLYGON && ann.points) {
                    percentCoords.points = ann.points.map(p => ({
                        x: (p.x / imageSize.width) * 100,
                        y: (p.y / imageSize.height) * 100,
                    }));
                }

                const payload = {
                    image_id: imageId,
                    text: ann.description || '',
                    coords: percentCoords,
                    type: ann.label?.id || 'manipulation',
                    group_id: ann.groupId || null,
                    shape_type: ann.type,
                };

                const saved = await api.createAnnotation(payload);
                savedAnnotations.push(saved);
            }

            actions.setModified(false);
            showToast(t('common.success'), 'success');

            if (onSaveSuccess) {
                onSaveSuccess(savedAnnotations);
            }
        } catch (err) {
            console.error('Error saving annotations:', err);
            showToast(t('analysis.error'), 'error');
        } finally {
            setIsSaving(false);
        }
    }, [annotations, imageSize, imageId, existingAnnotations, actions, t, onSaveSuccess]);

    // Export handler
    const handleExport = useCallback(() => {
        const exportData = exportAnnotationsToJSON(
            annotations.map(ann => toPercentCoords(ann, imageSize)),
            { id: imageId, filename: imageName, width: imageSize.width, height: imageSize.height }
        );

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `annotations-${imageName || imageId}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [annotations, imageSize, imageId, imageName]);

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-gray-900">
            {/* Header */}
            <div className="flex-none flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-white">
                        {t('annotation.title') || 'Image Annotation'}
                    </h2>
                    {imageName && (
                        <span className="text-sm text-gray-400 truncate max-w-[200px]">
                            {imageName}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Analysis Overlay Toggle */}
                    {analysisCanvas && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-gray-700/50 rounded-lg">
                            <button
                                onClick={() => setShowAnalysisOverlay(!showAnalysisOverlay)}
                                className={`p-2 rounded-lg transition-colors ${showAnalysisOverlay
                                    ? 'bg-indigo-600 text-white'
                                    : 'hover:bg-gray-600 text-gray-400 hover:text-white'
                                    }`}
                                title={showAnalysisOverlay ? 'Hide Analysis Overlay' : 'Show Analysis Overlay'}
                            >
                                {showAnalysisOverlay ? <FiEye size={18} /> : <FiEyeOff size={18} />}
                            </button>
                            {showAnalysisOverlay && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">Opacity</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={analysisOpacity}
                                        onChange={(e) => setAnalysisOpacity(parseFloat(e.target.value))}
                                        className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                    <span className="text-xs text-indigo-400 w-8">{Math.round(analysisOpacity * 100)}%</span>
                                </div>
                            )}
                            {analysisToolName && (
                                <span className="text-xs text-indigo-400 px-2 py-0.5 bg-indigo-500/20 rounded">
                                    {analysisToolName}
                                </span>
                            )}
                        </div>
                    )}

                    {clipboard && (
                        <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded flex items-center gap-1">
                            <FiCopy size={12} />
                            {t('annotation.actions.copied') || 'Copied'}
                        </span>
                    )}
                    {state.isModified && (
                        <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                            {t('common.unsaved')}
                        </span>
                    )}
                    <button
                        onClick={() => setShowHotkeys(true)}
                        className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                        title={t('annotation.help.shortcuts') || 'Keyboard Shortcuts'}
                    >
                        <FiHelpCircle size={20} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                        title={t('common.close') || 'Close'}
                    >
                        <FiX size={20} />
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <AnnotationToolbar
                onSave={handleSave}
                onExport={handleExport}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onFitToScreen={handleFitToScreen}
                zoom={zoom}
                isSaving={isSaving}
                hasUnsavedChanges={state.isModified}
            />

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Image Area */}
                <div
                    ref={containerRef}
                    className="flex-1 overflow-auto flex items-center justify-center p-6 bg-gray-900"
                >
                    <div
                        className="relative"
                        style={{
                            transform: `scale(${zoom})`,
                            transformOrigin: 'center center',
                            transition: 'transform 0.1s ease-out',
                        }}
                    >
                        <img
                            ref={imageRef}
                            src={imageUrl}
                            alt="Annotation target"
                            onLoad={handleImageLoad}
                            className="max-w-full rounded-lg shadow-2xl select-none"
                            draggable={false}
                            style={{
                                maxWidth: zoom === 1 ? 'calc(100vw - 350px)' : 'none',
                                maxHeight: zoom === 1 ? 'calc(100vh - 180px)' : 'none',
                            }}
                        />

                        {/* Analysis Overlay */}
                        {imageLoaded && showAnalysisOverlay && analysisCanvas && (
                            <img
                                src={analysisCanvas.toDataURL()}
                                alt="Analysis overlay"
                                className="absolute inset-0 w-full h-full rounded-lg pointer-events-none"
                                style={{
                                    opacity: analysisOpacity,
                                    mixBlendMode: 'normal',
                                }}
                            />
                        )}

                        {imageLoaded && (
                            <SVGAnnotationLayer
                                width={imageSize.width}
                                height={imageSize.height}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseLeave}
                                onDoubleClick={handleDoubleClick}
                                onAnnotationMouseDown={handleAnnotationMouseDown}
                                onHandleMouseDown={handleHandleMouseDown}
                                onPolygonPointMouseDown={handlePolygonPointMouseDown}
                            />
                        )}
                    </div>
                </div>

                {/* Labels Panel */}
                {showPanel && (
                    <div className="w-80 flex-none bg-gray-800">
                        <LabelsPanel
                            onClose={() => setShowPanel(false)}
                            analysisToolId={analysisToolId}
                            analysisToolName={analysisToolName}
                            analysisParams={analysisParams}
                            onAnalysisParamsChange={onAnalysisParamsChange}
                            onRunAnalysis={onRunAnalysis}
                            availableAnalysisTools={availableAnalysisTools}
                            showAnalysisOverlay={showAnalysisOverlay}
                            onToggleAnalysisOverlay={() => setShowAnalysisOverlay(!showAnalysisOverlay)}
                        />
                    </div>
                )}
            </div>

            {/* Polygon Drawing Instructions */}
            {isDrawing && activeTool === ToolTypes.POLYGON && (
                <div className="flex-none px-4 py-2 bg-indigo-600 text-white text-sm text-center">
                    {t('annotation.polygonHint') || 'Click to add points. Double-click or click the first point to close. Press Esc to cancel.'}
                </div>
            )}

            {/* Keyboard Shortcuts Modal */}
            {showHotkeys && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowHotkeys(false)}
                >
                    <div
                        className="bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <FiHelpCircle className="text-indigo-400" />
                                {t('annotation.help.shortcuts') || 'Keyboard Shortcuts'}
                            </h3>
                            <button
                                onClick={() => setShowHotkeys(false)}
                                className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                            >
                                <FiX size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            {/* Tools */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
                                    {t('annotation.sections.tools') || 'Tools'}
                                </h4>
                                <div className="space-y-2">
                                    <HotkeyRow shortcut="V" description={t('annotation.tools.select') || 'Select / Move tool'} />
                                    <HotkeyRow shortcut="R" description={t('annotation.tools.rectangle') || 'Rectangle tool'} />
                                    <HotkeyRow shortcut="E" description={t('annotation.tools.ellipse') || 'Ellipse tool'} />
                                    <HotkeyRow shortcut="P" description={t('annotation.tools.polygon') || 'Polygon tool'} />
                                </div>
                            </div>

                            {/* Actions */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
                                    {t('annotation.sections.actions') || 'Actions'}
                                </h4>
                                <div className="space-y-2">
                                    <HotkeyRow shortcut="Ctrl + C" description={t('annotation.shortcuts.copy') || 'Copy selected annotation'} />
                                    <HotkeyRow shortcut="Ctrl + V" description={t('annotation.shortcuts.paste') || 'Paste annotation'} />
                                    <HotkeyRow shortcut="Ctrl + Z" description={t('annotation.actions.undo') || 'Undo'} />
                                    <HotkeyRow shortcut="Ctrl + Y" description={t('annotation.actions.redo') || 'Redo'} />
                                    <HotkeyRow shortcut="Delete" description={t('annotation.tools.delete') || 'Delete selected annotation'} />
                                </div>
                            </div>

                            {/* Navigation */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
                                    {t('annotation.sections.navigation') || 'Navigation'}
                                </h4>
                                <div className="space-y-2">
                                    <HotkeyRow shortcut="Ctrl + Scroll" description={t('annotation.shortcuts.zoom') || 'Zoom in/out'} />
                                    <HotkeyRow shortcut="Esc" description={t('annotation.shortcuts.cancel') || 'Cancel drawing / Deselect / Close'} />
                                    <HotkeyRow shortcut="?" description={t('annotation.shortcuts.help') || 'Show this help'} />
                                </div>
                            </div>

                            {/* Analysis */}
                            {analysisCanvas && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
                                        {t('annotation.sections.analysis') || 'Analysis'}
                                    </h4>
                                    <div className="space-y-2">
                                        <HotkeyRow shortcut="A" description={t('annotation.shortcuts.toggleOverlay') || 'Toggle analysis overlay'} />
                                    </div>
                                </div>
                            )}

                            {/* Polygon specific */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
                                    {t('annotation.sections.polygonTool') || 'Polygon Tool'}
                                </h4>
                                <div className="space-y-2">
                                    <HotkeyRow shortcut="Click" description={t('annotation.shortcuts.addPoint') || 'Add point'} />
                                    <HotkeyRow shortcut="Double-click" description={t('annotation.shortcuts.closePolygon') || 'Close polygon'} />
                                    <HotkeyRow shortcut="Click first point" description={t('annotation.shortcuts.closePolygonFirst') || 'Close polygon'} />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-3 bg-gray-900/50 text-center text-sm text-gray-500">
                            {t('annotation.help.togglePanel') || 'Press ? anytime to toggle this panel'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Wrapper with Provider
const AnnotationModal = ({ isOpen, ...props }) => {
    if (!isOpen) return null;

    return (
        <AnnotationProvider>
            <AnnotationModalInner {...props} />
        </AnnotationProvider>
    );
};

export default AnnotationModal;
