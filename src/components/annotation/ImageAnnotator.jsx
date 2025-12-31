// src/components/annotation/ImageAnnotator.jsx
/**
 * Image Annotator Component
 * 
 * Main annotation component that combines:
 * - Image display with zoom/pan
 * - SVG overlay for drawing shapes
 * - Toolbar for tool selection
 * - Labels panel for managing annotations
 * 
 * Replicates Label Studio-style UX for image annotation.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    useAnnotation,
    AnnotationProvider,
    ShapeTypes,
    ToolTypes,
} from '../../context/AnnotationContext';
import {
    findAnnotationAtPoint,
    getHandleAtPoint,
    findClosestPolygonPoint,
    moveAnnotation,
    resizeAnnotation,
    movePolygonPoint,
    distance,
    toPercentCoords,
    fromPercentCoords,
    exportAnnotationsToJSON,
    isValidAnnotation,
} from '../../utils/annotationHelpers';
import SVGAnnotationLayer from './SVGAnnotationLayer';
import AnnotationToolbar from './AnnotationToolbar';
import LabelsPanel from './LabelsPanel';
import { useLanguage } from '../../context/LanguageContext';
import { FiAlertCircle } from 'react-icons/fi';

// Inner component that uses the annotation context
const ImageAnnotatorInner = ({
    imageUrl,
    imageId,
    imageDimensions,
    existingAnnotations = [],
    onSave,
    onExport,
    showLabelsPanel: initialShowLabelsPanel = true,
    readOnly = false,
}) => {
    const { t } = useLanguage();
    const { state, actions } = useAnnotation();
    const { activeTool, isDrawing, currentShape, selectedId, annotations } = state;

    // Refs
    const containerRef = useRef(null);
    const imageRef = useRef(null);

    // Local state
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [zoom, setZoom] = useState(1);
    const [setPan] = useState({ x: 0, y: 0 });
    const [isSaving, setIsSaving] = useState(false);
    const [showPanel, setShowPanel] = useState(initialShowLabelsPanel);

    // Interaction state
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(null);
    const [dragType, setDragType] = useState(null); // 'draw', 'move', 'resize', 'polygon-point'
    const [activeHandle, setActiveHandle] = useState(null);
    const [activePointIndex, setActivePointIndex] = useState(null);
    const [draggedAnnotation, setDraggedAnnotation] = useState(null);

    // Initialize with existing annotations
    useEffect(() => {
        if (imageId) {
            actions.setImage({ id: imageId, dimensions: imageDimensions });
        }
    }, [imageId, actions, imageDimensions]);

    useEffect(() => {
        if (existingAnnotations.length > 0 && imageSize.width > 0) {
            // Convert from percent to pixel coordinates
            const pixelAnnotations = existingAnnotations.map(ann =>
                fromPercentCoords(ann, imageSize)
            );
            actions.setAnnotations(pixelAnnotations);

            // Set next group ID based on existing annotations
            const maxGroupId = existingAnnotations
                .filter(a => a.groupId)
                .reduce((max, a) => Math.max(max, a.groupId), 0);
            if (maxGroupId > 0) {
                actions.setNextGroupId(maxGroupId + 1);
            }
        }
    }, [existingAnnotations, imageSize, actions]);

    // Handle image load
    const handleImageLoad = useCallback((e) => {
        const { naturalWidth, naturalHeight } = e.target;
        setImageSize({ width: naturalWidth, height: naturalHeight });
        setImageLoaded(true);
        actions.setImageDimensions({ width: naturalWidth, height: naturalHeight });
    }, [actions]);

    // Get mouse position relative to image
    const getMousePosition = useCallback((e) => {
        if (!imageRef.current) return { x: 0, y: 0 };

        const rect = imageRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / zoom,
            y: (e.clientY - rect.top) / zoom,
        };
    }, [zoom]);

    // Mouse down handler
    const handleMouseDown = useCallback((e) => {
        if (readOnly || e.button !== 0) return; // Left click only

        const pos = getMousePosition(e);
        setDragStart(pos);

        // Handle based on active tool
        if (activeTool === ToolTypes.SELECT) {
            // Check if clicking on an annotation
            const clickedAnnotation = findAnnotationAtPoint(pos, annotations);

            if (clickedAnnotation) {
                // Check for resize handle
                if (selectedId === clickedAnnotation.id) {
                    const handle = getHandleAtPoint(pos, clickedAnnotation);
                    if (handle) {
                        setDragType('resize');
                        setActiveHandle(handle);
                        setDraggedAnnotation({ ...clickedAnnotation });
                        setIsDragging(true);
                        return;
                    }

                    // Check for polygon point
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

                // Start move
                actions.selectAnnotation(clickedAnnotation.id);
                setDragType('move');
                setDraggedAnnotation({ ...clickedAnnotation });
                setIsDragging(true);
            } else {
                // Clicked on empty space - clear selection
                actions.clearSelection();
            }
        } else if (activeTool === ToolTypes.RECTANGLE || activeTool === ToolTypes.ELLIPSE) {
            // Start drawing rectangle or ellipse
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
            // Polygon: add point on click
            if (!isDrawing) {
                // Start new polygon
                actions.startDrawing({
                    type: ShapeTypes.POLYGON,
                    points: [pos],
                    previewPoint: pos,
                });
            } else {
                // Check if clicking near first point to close
                const firstPoint = currentShape?.points?.[0];
                if (firstPoint && currentShape.points.length >= 3) {
                    const distToFirst = distance(pos, firstPoint);
                    if (distToFirst < 15) {
                        // Close polygon
                        actions.finishDrawing();
                        return;
                    }
                }

                // Add new point
                actions.addPolygonPoint(pos);
            }
        } else if (activeTool === ToolTypes.DELETE) {
            // Delete clicked annotation
            const clickedAnnotation = findAnnotationAtPoint(pos, annotations);
            if (clickedAnnotation) {
                actions.deleteAnnotation(clickedAnnotation.id);
            }
        }
    }, [activeTool, annotations, selectedId, isDrawing, currentShape, getMousePosition, actions, readOnly]);

    // Mouse move handler
    const handleMouseMove = useCallback((e) => {
        const pos = getMousePosition(e);

        // Update polygon preview
        if (isDrawing && activeTool === ToolTypes.POLYGON) {
            actions.updateDrawing({ previewPoint: pos });
        }

        // Handle drag operations
        if (isDragging && dragStart) {
            const delta = {
                x: pos.x - dragStart.x,
                y: pos.y - dragStart.y,
            };

            if (dragType === 'draw') {
                // Update shape size while drawing
                actions.updateDrawing({
                    width: delta.x,
                    height: delta.y,
                });
            } else if (dragType === 'move' && draggedAnnotation) {
                // Move annotation
                const moved = moveAnnotation(draggedAnnotation, delta);
                actions.updateAnnotation(moved);
            } else if (dragType === 'resize' && draggedAnnotation && activeHandle) {
                // Resize annotation
                const resized = resizeAnnotation(draggedAnnotation, activeHandle, delta);
                actions.updateAnnotation(resized);
            } else if (dragType === 'polygon-point' && draggedAnnotation && activePointIndex !== null) {
                // Move polygon point
                const updated = movePolygonPoint(draggedAnnotation, activePointIndex, pos);
                actions.updateAnnotation(updated);
            }
        }

        // Hover detection (only in select mode)
        if (activeTool === ToolTypes.SELECT && !isDragging) {
            const hoveredAnnotation = findAnnotationAtPoint(pos, annotations);
            actions.hoverAnnotation(hoveredAnnotation?.id || null);
        }
    }, [isDragging, dragStart, dragType, draggedAnnotation, activeHandle, activePointIndex, activeTool, isDrawing, getMousePosition, annotations, actions]);

    // Mouse up handler
    const handleMouseUp = useCallback(() => {
        if (dragType === 'draw' && currentShape) {
            // Finish drawing (if valid)
            if (isValidAnnotation(currentShape)) {
                actions.finishDrawing();
            } else {
                actions.cancelDrawing();
            }
        }

        // Reset drag state (but not for polygon which uses clicks)
        if (activeTool !== ToolTypes.POLYGON || dragType !== null) {
            setIsDragging(false);
            setDragStart(null);
            setDragType(null);
            setActiveHandle(null);
            setActivePointIndex(null);
            setDraggedAnnotation(null);
        }
    }, [dragType, currentShape, activeTool, actions]);

    // Double click to finish polygon
    const handleDoubleClick = useCallback(() => {
        if (isDrawing && activeTool === ToolTypes.POLYGON && currentShape?.points?.length >= 3) {
            actions.finishDrawing();
        }
    }, [isDrawing, activeTool, currentShape, actions]);

    // Mouse leave handler
    const handleMouseLeave = useCallback(() => {
        actions.hoverAnnotation(null);
    }, [actions]);

    // Annotation click handler (from SVG layer)
    const handleAnnotationMouseDown = useCallback((e, annotation) => {
        e.stopPropagation();

        if (activeTool === ToolTypes.DELETE) {
            actions.deleteAnnotation(annotation.id);
            return;
        }

        if (activeTool === ToolTypes.SELECT) {
            const pos = getMousePosition(e);

            // Check for resize handle first
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

            // Select and start move
            actions.selectAnnotation(annotation.id);
            setDragStart(pos);
            setDragType('move');
            setDraggedAnnotation({ ...annotation });
            setIsDragging(true);
        }
    }, [activeTool, selectedId, getMousePosition, actions]);

    // Handle resize handle mouse down
    const handleHandleMouseDown = useCallback((e, annotation, handle) => {
        e.stopPropagation();
        const pos = getMousePosition(e);

        setDragStart(pos);
        setDragType('resize');
        setActiveHandle(handle);
        setDraggedAnnotation({ ...annotation });
        setIsDragging(true);
    }, [getMousePosition]);

    // Handle polygon point mouse down
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
            if (readOnly) return;

            // Ignore if typing in input
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            // Escape - cancel drawing
            if (e.key === 'Escape') {
                if (isDrawing) {
                    actions.cancelDrawing();
                } else {
                    actions.clearSelection();
                }
            }

            // Delete - delete selected
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedId && !isDrawing) {
                    e.preventDefault();
                    actions.deleteSelected();
                }
            }

            // Ctrl+Z - Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                actions.undo();
            }

            // Ctrl+Y or Ctrl+Shift+Z - Redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                actions.redo();
            }

            // Tool shortcuts
            if (!e.ctrlKey && !e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'v':
                        actions.setTool(ToolTypes.SELECT);
                        break;
                    case 'r':
                        actions.setTool(ToolTypes.RECTANGLE);
                        break;
                    case 'e':
                        actions.setTool(ToolTypes.ELLIPSE);
                        break;
                    case 'p':
                        actions.setTool(ToolTypes.POLYGON);
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDrawing, selectedId, actions, readOnly]);

    // Zoom controls
    const handleZoomIn = useCallback(() => {
        setZoom(z => Math.min(4, z + 0.25));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoom(z => Math.max(0.25, z - 0.25));
    }, []);

    const handleFitToScreen = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, [setPan]);

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
        if (!onSave) return;

        setIsSaving(true);
        try {
            // Convert to percent coordinates for storage
            const percentAnnotations = annotations.map(ann =>
                toPercentCoords(ann, imageSize)
            );
            await onSave(percentAnnotations);
            actions.setModified(false);
        } catch (err) {
            console.error('Error saving annotations:', err);
        } finally {
            setIsSaving(false);
        }
    }, [onSave, annotations, imageSize, actions]);

    // Export handler
    const handleExport = useCallback(() => {
        const exportData = exportAnnotationsToJSON(
            annotations.map(ann => toPercentCoords(ann, imageSize)),
            { id: imageId, filename: '', width: imageSize.width, height: imageSize.height }
        );

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `annotations-${imageId || 'image'}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        if (onExport) {
            onExport(exportData);
        }
    }, [annotations, imageSize, imageId, onExport]);

    if (!imageUrl) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900">
                <div className="text-center text-gray-400">
                    <FiAlertCircle size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">{t('analysis.selectImageFirst')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
            {/* Toolbar */}
            {!readOnly && (
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
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Image Canvas Area */}
                <div
                    ref={containerRef}
                    className={`flex-1 overflow-auto flex items-center justify-center p-4 ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''
                        }`}
                >
                    <div
                        className="relative"
                        style={{
                            transform: `scale(${zoom})`,
                            transformOrigin: 'center center',
                            transition: 'transform 0.1s ease-out',
                        }}
                    >
                        {/* Image */}
                        <img
                            ref={imageRef}
                            src={imageUrl}
                            alt="Annotation target"
                            onLoad={handleImageLoad}
                            className="max-w-full max-h-full rounded-lg shadow-lg select-none"
                            draggable={false}
                            style={{
                                maxWidth: zoom === 1 ? 'calc(100vw - 400px)' : 'none',
                                maxHeight: zoom === 1 ? 'calc(100vh - 200px)' : 'none',
                            }}
                        />

                        {/* SVG Annotation Layer */}
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
                {showPanel && !readOnly && (
                    <div className="w-72 flex-none">
                        <LabelsPanel onClose={() => setShowPanel(false)} />
                    </div>
                )}
            </div>

            {/* Instructions Footer */}
            {isDrawing && activeTool === ToolTypes.POLYGON && (
                <div className="px-4 py-2 bg-indigo-600 text-white text-sm text-center">
                    {t('annotation.polygonHint') || 'Click to add points. Double-click or click the first point to close the polygon. Press Esc to cancel.'}
                </div>
            )}
        </div>
    );
};

// Wrapper component with provider
const ImageAnnotator = (props) => {
    return (
        <AnnotationProvider>
            <ImageAnnotatorInner {...props} />
        </AnnotationProvider>
    );
};

export default ImageAnnotator;
