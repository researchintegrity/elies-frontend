// src/components/annotation/DualImageComparisonModal.jsx
/**
 * Dual Image Comparison Modal
 * 
 * Full-screen modal for comparing two images side-by-side with:
 * - Cross-image annotation linking
 * - Copy-move detection
 * - Image manipulation tools
 * - Collapsible gallery/results panel
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    FiX, FiSave, FiDownload, FiHelpCircle, FiLink2, FiXCircle,
    FiChevronDown, FiChevronUp, FiChevronRight, FiChevronLeft,
    FiRotateCw, FiZoomIn, FiZoomOut, FiMaximize2, FiCrop,
    FiSquare, FiCircle, FiEdit3, FiMousePointer, FiTrash2,
    FiRefreshCw, FiGrid, FiLayers, FiPlay, FiSearch, FiEye, FiEyeOff,
} from 'react-icons/fi';
import { DualAnnotationProvider, useDualAnnotation, ShapeTypes, ToolTypes, DefaultLabels } from '../../context/DualAnnotationContext';
import DualSVGAnnotationLayer from './DualSVGAnnotationLayer';
// import { useLanguage } from '../../context/LanguageContext'; // Removed unused import
import { api } from '../../services/api';
import { showToast } from '../../utils/alert';
import { API_BASE_URL } from '../../config/api';
import {
    findAnnotationAtPoint,
    getHandleAtPoint,
    findClosestPolygonPoint,
    moveAnnotation,
    resizeAnnotation,
    movePolygonPoint,
    isValidAnnotation,
    distance,
} from '../../utils/annotationHelpers';

// Helper to get image URL
const getImageUrl = (imageId) => {
    const token = localStorage.getItem('authToken');
    return `${API_BASE_URL}/images/${imageId}/download${token ? `?token=${token}` : ''}`;
};

const getThumbnailUrl = (imageId) => {
    const token = localStorage.getItem('authToken');
    return `${API_BASE_URL}/images/${imageId}/thumbnail${token ? `?token=${token}&size=200` : '?size=200'}`;
};

// --- Sub-Components ---

// Toolbar Button
const ToolButton = ({ icon: Icon, label, isActive, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
            ${isActive
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title={label}
    >
        <Icon size={16} />
        <span className="hidden xl:inline">{label}</span>
    </button>
);

// Image Viewer Panel
const ImageViewerPanel = ({
    side,
    image,
    annotations,
    onImageClick,
    placeholder,
}) => {
    const { state, actions, computed } = useDualAnnotation();
    const containerRef = useRef(null);
    const imageRef = useRef(null);

    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [focusRegion, setFocusRegion] = useState(null);

    // Interaction state
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(null);
    const [dragType, setDragType] = useState(null);
    const [activeHandle, setActiveHandle] = useState(null);
    const [activePointIndex, setActivePointIndex] = useState(null);
    const [draggedAnnotation, setDraggedAnnotation] = useState(null);

    // Rotation mode state (Alt key or 'O' key toggles it)
    const [isRotationMode, setIsRotationMode] = useState(false);
    const [rotationDragStart, setRotationDragStart] = useState(null);

    const isActive = state.activeSide === side;
    const { activeTool, isDrawing, currentShape, selectedId, selectedSide, isLinkingMode, pendingLinkAnnotation } = state;

    // Handle image load
    // Handle image load and initial fit
    const handleImageLoad = useCallback((e) => {
        const { naturalWidth, naturalHeight } = e.target;
        setImageSize({ width: naturalWidth, height: naturalHeight });
        setImageLoaded(true);

        // Auto-fit logic
        if (containerRef.current) {
            const { clientWidth, clientHeight } = containerRef.current;
            const padding = 40;
            const availW = clientWidth - padding;
            const availH = clientHeight - padding;

            if (naturalWidth > availW || naturalHeight > availH) {
                const scale = Math.min(availW / naturalWidth, availH / naturalHeight);
                setZoom(Math.min(1, scale * 0.9)); // 0.9 safety factor
            } else {
                setZoom(1);
            }
        }
    }, []);

    // Get mouse position relative to image
    // Get mouse position relative to image, accounting for zoom AND rotation
    const getMousePosition = useCallback((e) => {
        if (!imageRef.current) return { x: 0, y: 0 };

        const rect = imageRef.current.getBoundingClientRect();

        // Center of the bounding box (which corresponds to the center of the image due to center transform-origin)
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        // Coordinates relative to center
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;

        // Convert rotation to radians (inverse rotation to map back to local space)
        const rad = -rotation * (Math.PI / 180);

        // Rotate
        const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ry = dx * Math.sin(rad) + dy * Math.cos(rad);

        // Scale (un-zoom) and translate back to top-left from center
        // Note: We use imageSize (natural dimensions) because that's our local coordinate space
        return {
            x: (rx / zoom) + (imageSize.width / 2),
            y: (ry / zoom) + (imageSize.height / 2),
        };
    }, [zoom, rotation, imageSize]);

    // Mouse handlers
    const handleMouseDown = useCallback((e) => {
        if (e.button !== 0) return;

        // Set this side as active
        actions.setActiveSide(side);

        const pos = getMousePosition(e);
        setDragStart(pos);

        // Handle linking mode
        if (isLinkingMode) {
            const clickedAnnotation = findAnnotationAtPoint(pos, annotations);
            if (clickedAnnotation) {
                if (pendingLinkAnnotation && pendingLinkAnnotation.side !== side) {
                    actions.completeLink(clickedAnnotation.id, side);
                } else {
                    actions.startLinking(clickedAnnotation.id, side);
                }
            }
            return;
        }

        if (activeTool === ToolTypes.SELECT) {
            const clickedAnnotation = findAnnotationAtPoint(pos, annotations);

            if (clickedAnnotation) {
                if (selectedId === clickedAnnotation.id && selectedSide === side) {
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

                actions.selectAnnotation(clickedAnnotation.id, side);
                setDragType('move');
                setDraggedAnnotation({ ...clickedAnnotation });
                setIsDragging(true);
            } else {
                actions.clearSelection();
            }
        } else if (activeTool === ToolTypes.RECTANGLE || activeTool === ToolTypes.ELLIPSE) {
            setDragType('draw');
            setIsDragging(true);
            actions.startDrawing(side, {
                type: activeTool === ToolTypes.RECTANGLE ? ShapeTypes.RECTANGLE : ShapeTypes.ELLIPSE,
                x: pos.x,
                y: pos.y,
                width: 0,
                height: 0,
            });
        } else if (activeTool === ToolTypes.POLYGON) {
            if (!isDrawing || state.activeSide !== side) {
                actions.startDrawing(side, {
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
                actions.deleteAnnotation(side, clickedAnnotation.id);
            }
        }
    }, [
        side, actions, annotations, getMousePosition, activeTool, selectedId, selectedSide,
        isDrawing, currentShape, isLinkingMode, pendingLinkAnnotation, state.activeSide
    ]);

    const handleMouseMove = useCallback((e) => {
        const pos = getMousePosition(e);

        if (isDrawing && state.activeSide === side && activeTool === ToolTypes.POLYGON) {
            actions.updateDrawing({ previewPoint: pos });
        }

        if (isDragging && dragStart) {
            const delta = { x: pos.x - dragStart.x, y: pos.y - dragStart.y };

            if (dragType === 'draw') {
                actions.updateDrawing({ width: delta.x, height: delta.y });
            } else if (dragType === 'move' && draggedAnnotation) {
                const moved = moveAnnotation(draggedAnnotation, delta);
                actions.updateAnnotation(side, moved);
            } else if (dragType === 'resize' && draggedAnnotation && activeHandle) {
                const resized = resizeAnnotation(draggedAnnotation, activeHandle, delta);
                actions.updateAnnotation(side, resized);
            } else if (dragType === 'polygon-point' && draggedAnnotation && activePointIndex !== null) {
                const updated = movePolygonPoint(draggedAnnotation, activePointIndex, pos);
                actions.updateAnnotation(side, updated);
            }
        }

        if (activeTool === ToolTypes.SELECT && !isDragging) {
            const hoveredAnnotation = findAnnotationAtPoint(pos, annotations);
            actions.hoverAnnotation(hoveredAnnotation?.id || null, side);
        }
    }, [
        isDragging, dragStart, dragType, draggedAnnotation, activeHandle, activePointIndex,
        activeTool, isDrawing, getMousePosition, annotations, actions, side, state.activeSide
    ]);

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
        if (isDrawing && state.activeSide === side && activeTool === ToolTypes.POLYGON && currentShape?.points?.length >= 3) {
            actions.finishDrawing();
        }
    }, [isDrawing, activeTool, currentShape, actions, side, state.activeSide]);

    // Zoom handlers
    const handleZoomIn = () => setZoom(z => Math.min(4, z + 0.25));
    const handleZoomOut = () => setZoom(z => Math.max(0.25, z - 0.25));
    const handleResetZoom = () => { setZoom(1); setRotation(0); setFocusRegion(null); setIsRotationMode(false); };
    const handleRotate = () => setRotation(r => (r + 90) % 360);

    // Wheel event handler with passive:false to prevent browser zoom
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const wheelHandler = (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
                const delta = e.deltaY > 0 ? -0.15 : 0.15;
                setZoom(z => Math.min(4, Math.max(0.25, z + delta)));
            } else if (e.shiftKey) {
                e.preventDefault();
                const degreeDelta = e.deltaY > 0 ? -2 : 2;
                setRotation(r => (r + degreeDelta + 360) % 360);
            }
        };

        container.addEventListener('wheel', wheelHandler, { passive: false });
        return () => container.removeEventListener('wheel', wheelHandler);
    }, [image]);

    // Rotation mode toggle (O key) - hold O and drag mouse to rotate
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'o' || e.key === 'O') {
                if (!e.repeat) {
                    setIsRotationMode(true);
                }
            }
        };
        const handleKeyUp = (e) => {
            if (e.key === 'o' || e.key === 'O') {
                setIsRotationMode(false);
                setRotationDragStart(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Handle rotation mode mouse drag
    const handleRotationMouseDown = useCallback((e) => {
        if (isRotationMode) {
            e.preventDefault();
            setRotationDragStart({ x: e.clientX, y: e.clientY, startRotation: rotation });
        }
    }, [isRotationMode, rotation]);

    const handleRotationMouseMove = useCallback((e) => {
        if (isRotationMode && rotationDragStart) {
            const deltaX = e.clientX - rotationDragStart.x;
            // 1 pixel = 0.5 degree rotation
            const newRotation = (rotationDragStart.startRotation + deltaX * 0.5 + 360) % 360;
            setRotation(newRotation);
        }
    }, [isRotationMode, rotationDragStart]);

    const handleRotationMouseUp = useCallback(() => {
        setRotationDragStart(null);
    }, []);

    // Get link color for annotation
    const getAnnotationLinkColor = (annId) => {
        const link = computed.getLinkForAnnotation(annId, side);
        return link?.color || null;
    };

    if (!image) {
        return (
            <div
                onClick={onImageClick}
                className={`
                    flex-1 flex items-center justify-center bg-gray-800/50 rounded-lg border-2 border-dashed
                    ${side === 'right' ? 'border-gray-600 cursor-pointer hover:border-indigo-500 hover:bg-gray-800' : 'border-gray-700'}
                `}
            >
                <div className="text-center text-gray-400">
                    {placeholder || (side === 'left' ? 'Selected Image' : 'Click to select candidate image')}
                </div>
            </div>
        );
    }

    return (
        <div className={`
            flex-1 flex flex-col min-w-0 bg-gray-900 rounded-lg overflow-hidden
            ${isActive ? 'ring-2 ring-indigo-500' : ''}
        `}>
            {/* Image Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`
                        px-2 py-0.5 text-xs rounded font-medium
                        ${side === 'left' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}
                    `}>
                        {side === 'left' ? 'Selected' : 'Candidate'}
                    </span>
                    <span className="text-sm text-gray-300 truncate">{image.filename}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={handleZoomOut} className="p-1.5 rounded hover:bg-gray-700 text-gray-400" title="Zoom Out (Ctrl+Scroll)">
                        <FiZoomOut size={14} />
                    </button>
                    <span className="text-xs text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={handleZoomIn} className="p-1.5 rounded hover:bg-gray-700 text-gray-400" title="Zoom In (Ctrl+Scroll)">
                        <FiZoomIn size={14} />
                    </button>
                    <span className="w-px h-4 bg-gray-600 mx-1" />
                    <button onClick={handleRotate} className="p-1.5 rounded hover:bg-gray-700 text-gray-400" title="Rotate 90° (or Shift+Scroll/Hold O+Drag)">
                        <FiRotateCw size={14} />
                    </button>
                    <span className={`text-xs w-10 text-center ${rotation !== 0 ? 'text-amber-400' : 'text-gray-500'}`}>{Math.round(rotation)}°</span>
                    <button onClick={handleResetZoom} className="p-1.5 rounded hover:bg-gray-700 text-gray-400" title="Reset">
                        <FiMaximize2 size={14} />
                    </button>
                    {isRotationMode && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-500/30 text-amber-400 rounded animate-pulse">
                            ROTATE
                        </span>
                    )}
                </div>
            </div>

            {/* Image Container */}
            <div
                ref={containerRef}
                className={`flex-1 overflow-auto flex items-center justify-center p-4 bg-gray-900 ${isRotationMode ? 'cursor-grab' : ''}`}
                onMouseDown={isRotationMode ? handleRotationMouseDown : undefined}
                onMouseMove={isRotationMode ? handleRotationMouseMove : undefined}
                onMouseUp={isRotationMode ? handleRotationMouseUp : undefined}
                onMouseLeave={isRotationMode ? handleRotationMouseUp : undefined}
            >
                <div
                    className="relative"
                    style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.1s ease-out',
                    }}
                >
                    <img
                        ref={imageRef}
                        src={getImageUrl(image.id)}
                        alt={image.filename}
                        onLoad={handleImageLoad}
                        className="rounded shadow-lg select-none"
                        draggable={false}
                    />

                    {/* Focus Region Overlay */}
                    {focusRegion && (
                        <div
                            className="absolute inset-0 bg-black/60 pointer-events-none"
                            style={{
                                clipPath: `polygon(
                                    0% 0%, 100% 0%, 100% 100%, 0% 100%,
                                    0% ${focusRegion.y}%,
                                    ${focusRegion.x}% ${focusRegion.y}%,
                                    ${focusRegion.x}% ${focusRegion.y + focusRegion.height}%,
                                    0% ${focusRegion.y + focusRegion.height}%
                                )`,
                            }}
                        />
                    )}

                    {/* Annotation Layer */}
                    {imageLoaded && state.annotationsVisible && (
                        <DualSVGAnnotationLayer
                            width={imageSize.width}
                            height={imageSize.height}
                            annotations={annotations}
                            currentShape={state.activeSide === side ? currentShape : null}
                            selectedId={selectedSide === side ? selectedId : null}
                            hoveredId={state.hoveredSide === side ? state.hoveredId : null}
                            isDrawing={isDrawing && state.activeSide === side}
                            activeLabel={state.activeLabel}
                            activeTool={state.activeTool}
                            getAnnotationColor={getAnnotationLinkColor}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={() => actions.hoverAnnotation(null, null)}
                            onDoubleClick={handleDoubleClick}
                        />
                    )}
                </div>
            </div>

            {/* Annotation Count */}
            <div className="px-3 py-1.5 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
                {annotations.length} annotations
            </div>
        </div>
    );
};

// Predefined colors for linked pairs
const PAIR_COLORS = [
    '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

// Linked Pair Item with editable name and color
const LinkedPairItem = ({ pair, index, onUpdate, onDelete, rightImage }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(pair.name || `Pair ${index + 1}`);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });

    const inputRef = useRef(null);
    const buttonRef = useRef(null);
    const pickerRef = useRef(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Close color picker when clicking outside or scrolling
    useEffect(() => {
        const handleInteraction = (e) => {
            // Check if click is inside the picker or the toggle button
            if (showColorPicker &&
                pickerRef.current &&
                !pickerRef.current.contains(e.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target)) {
                setShowColorPicker(false);
            }
        };

        const handleScroll = () => {
            if (showColorPicker) setShowColorPicker(false);
        };

        if (showColorPicker) {
            document.addEventListener('mousedown', handleInteraction);
            // Capture scroll events on the window (including sub-scrollers) to close picker
            document.addEventListener('scroll', handleScroll, true);
            window.addEventListener('resize', handleScroll);
        }
        return () => {
            document.removeEventListener('mousedown', handleInteraction);
            document.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [showColorPicker]);

    const handleNameSubmit = () => {
        if (editName.trim() && editName !== pair.name) {
            onUpdate(pair.linkId, { name: editName.trim() });
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleNameSubmit();
        if (e.key === 'Escape') {
            setEditName(pair.name || `Pair ${index + 1}`);
            setIsEditing(false);
        }
    };

    const togglePicker = () => {
        if (!showColorPicker) {
            // Calculate position
            const rect = buttonRef.current.getBoundingClientRect();
            // Default: Position to the left of the button
            let top = rect.top;
            let left = rect.left - 200; // 200px (w-48 + padding)

            // Boundary checks
            const pickerHeight = 150;
            if (top + pickerHeight > window.innerHeight) {
                top = rect.bottom - pickerHeight; // Align bottom edges
            }
            if (left < 10) {
                left = rect.right + 10; // Flip to right if not enough space on left
            }

            setPickerPos({ top, left });
            setShowColorPicker(true);
        } else {
            setShowColorPicker(false);
        }
    };

    const handleColorSelect = (color) => {
        onUpdate(pair.linkId, { color });
        setShowColorPicker(false);
    };

    // Helper to get short display name for image
    const getImageDisplayName = (img) => {
        if (!img) return 'Unknown';
        if (img.filename) {
            const name = img.filename;
            return name.length > 15 ? name.substring(0, 12) + '...' : name;
        }
        return img.id?.substring(0, 8) || 'Unknown';
    };

    return (
        <div className="bg-gray-700/50 rounded-lg p-2">
            <div className="flex items-center gap-2">
                {/* Color Swatch */}
                <button
                    ref={buttonRef}
                    onClick={togglePicker}
                    className="w-5 h-5 rounded-full border-2 border-gray-500 hover:border-white transition-colors flex-shrink-0"
                    style={{ backgroundColor: pair.color }}
                    title="Change color"
                />

                {/* Name */}
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleNameSubmit}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-gray-600 text-white text-xs px-2 py-1 rounded outline-none focus:ring-1 focus:ring-indigo-500"
                            maxLength={30}
                        />
                    ) : (
                        <>
                            <span
                                onClick={() => setIsEditing(true)}
                                className="block text-xs text-gray-200 cursor-pointer hover:text-white truncate"
                                title="Click to edit name"
                            >
                                {pair.name || `Pair ${index + 1}`}
                            </span>
                            {/* Show linked target image */}
                            <span
                                className={`block text-[10px] truncate ${pair.targetImageId === rightImage?.id ? 'text-green-500' : 'text-gray-500'}`}
                                title={`Target: ${pair.targetFilename || pair.targetImageId || rightImage?.filename || 'Unknown'}`}
                            >
                                → {getImageDisplayName({ filename: pair.targetFilename, id: pair.targetImageId }) || getImageDisplayName(rightImage)}
                                {pair.targetImageId !== rightImage?.id && <span className="ml-1 text-amber-500">(other)</span>}
                            </span>
                        </>
                    )}
                </div>

                {/* Visibility Toggle */}
                <button
                    onClick={() => onUpdate(pair.linkId, { visible: pair.visible === false ? true : false })}
                    className={`p-1 rounded hover:bg-gray-600 flex-shrink-0 ${pair.visible === false ? 'text-gray-600' : 'text-green-400'}`}
                    title={pair.visible === false ? 'Show this pair' : 'Hide this pair'}
                >
                    {pair.visible === false ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                </button>

                {/* Delete Button */}
                <button
                    onClick={() => onDelete(pair.linkId)}
                    className="p-1 rounded hover:bg-gray-600 text-gray-400 hover:text-red-400 flex-shrink-0"
                    title="Remove link"
                >
                    <FiXCircle size={14} />
                </button>
            </div>

            {/* Fixed Position Color Picker Dropdown */}
            {showColorPicker && (
                <div
                    ref={pickerRef}
                    className="fixed p-2 bg-gray-800 rounded-lg border border-gray-600 shadow-xl w-48 z-[9999]"
                    style={{ top: pickerPos.top, left: pickerPos.left }}
                >
                    <div className="grid grid-cols-5 gap-1 mb-2">
                        {PAIR_COLORS.map((color) => (
                            <button
                                key={color}
                                onClick={() => handleColorSelect(color)}
                                className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${pair.color === color ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800' : ''}`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                    {/* Custom Color Native Picker */}
                    <div className="pt-2 border-t border-gray-700 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">Custom Color:</span>
                        <div className="relative overflow-hidden w-8 h-6 rounded border border-gray-600 cursor-pointer hover:border-gray-400">
                            <input
                                type="color"
                                value={pair.color}
                                onChange={(e) => handleColorSelect(e.target.value)}
                                className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer p-0 border-0 opacity-0"
                            />
                            {/* Visual indicator of current custom color */}
                            <div className="w-full h-full" style={{ backgroundColor: pair.color }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Right Toolbar Panel
const ToolbarPanel = ({ onTriggerDetection }) => {
    const { state, actions, computed } = useDualAnnotation();
    // const { t } = useLanguage(); // Removed unused var

    const { activeTool, linkedPairs, toolbarExpanded, isLinkingMode, annotationsVisible } = state;

    if (!toolbarExpanded) {
        return (
            <div className="w-10 flex flex-col items-center py-4 bg-gray-800 border-l border-gray-700">
                <button
                    onClick={actions.toggleToolbar}
                    className="p-2 rounded hover:bg-gray-700 text-gray-400"
                    title="Expand Toolbar"
                >
                    <FiChevronLeft size={16} />
                </button>
            </div>
        );
    }

    return (
        <div className="w-72 flex flex-col bg-gray-800 border-l border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-white">Tools</h3>
                <button
                    onClick={actions.toggleToolbar}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400"
                    title="Collapse"
                >
                    <FiChevronRight size={16} />
                </button>
            </div>

            {/* Shape Tools */}
            <div className="p-3 border-b border-gray-700">
                <div className="text-xs font-medium text-gray-400 uppercase mb-2">Shapes</div>
                <div className="grid grid-cols-4 gap-1">
                    <button
                        onClick={() => actions.setTool(ToolTypes.SELECT)}
                        className={`p-2 rounded ${activeTool === ToolTypes.SELECT ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        title="Select"
                    >
                        <FiMousePointer size={16} />
                    </button>
                    <button
                        onClick={() => actions.setTool(ToolTypes.RECTANGLE)}
                        className={`p-2 rounded ${activeTool === ToolTypes.RECTANGLE ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        title="Rectangle"
                    >
                        <FiSquare size={16} />
                    </button>
                    <button
                        onClick={() => actions.setTool(ToolTypes.ELLIPSE)}
                        className={`p-2 rounded ${activeTool === ToolTypes.ELLIPSE ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        title="Ellipse"
                    >
                        <FiCircle size={16} />
                    </button>
                    <button
                        onClick={() => actions.setTool(ToolTypes.POLYGON)}
                        className={`p-2 rounded ${activeTool === ToolTypes.POLYGON ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        title="Polygon"
                    >
                        <FiEdit3 size={16} />
                    </button>
                </div>
            </div>

            {/* Link Annotations */}
            <div className="p-3 border-b border-gray-700">
                <div className="text-xs font-medium text-gray-400 uppercase mb-2">Link Annotations</div>
                <button
                    onClick={() => {
                        if (isLinkingMode) {
                            actions.cancelLinking();
                        } else if (state.selectedId && state.selectedSide) {
                            actions.startLinking(state.selectedId, state.selectedSide);
                        }
                    }}
                    disabled={!state.selectedId && !isLinkingMode}
                    className={`
                        w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium
                        ${isLinkingMode
                            ? 'bg-amber-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
                        ${!state.selectedId && !isLinkingMode ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    <FiLink2 size={14} />
                    {isLinkingMode ? 'Click target annotation...' : 'Link Selected'}
                </button>
                {isLinkingMode && (
                    <p className="mt-2 text-xs text-amber-400">
                        Click an annotation on the other image to create a link
                    </p>
                )}
            </div>

            {/* Linked Pairs List */}
            <div className="flex-1 overflow-auto p-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-400 uppercase">
                        Linked Pairs ({linkedPairs.length})
                    </span>
                    <button
                        onClick={actions.toggleAnnotationsVisibility}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${annotationsVisible ? 'text-green-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-700'}`}
                        title={annotationsVisible ? 'Hide all annotations' : 'Show all annotations'}
                    >
                        {annotationsVisible ? <FiEye size={12} /> : <FiEyeOff size={12} />}
                        <span>{annotationsVisible ? 'Hide All' : 'Show All'}</span>
                    </button>
                </div>
                {linkedPairs.length === 0 ? (
                    <p className="text-xs text-gray-500">No linked pairs yet</p>
                ) : (
                    <div className="space-y-2">
                        {linkedPairs.map((pair, idx) => (
                            <LinkedPairItem
                                key={pair.linkId}
                                pair={pair}
                                index={idx}
                                onUpdate={actions.updateLink}
                                onDelete={actions.deleteLink}
                                rightImage={state.rightImage}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Cross Detection */}
            <div className="p-3 border-t border-gray-700">
                <button
                    onClick={onTriggerDetection}
                    disabled={!state.rightImage}
                    className={`
                        w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium
                        bg-indigo-600 text-white hover:bg-indigo-500
                        ${!state.rightImage ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    <FiLayers size={14} />
                    Run Cross Detection
                </button>
            </div>

            {/* Actions */}
            <div className="p-3 border-t border-gray-700 flex gap-2">
                <button
                    onClick={actions.undo}
                    disabled={!computed.canUndo}
                    className="flex-1 p-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50"
                    title="Undo"
                >
                    <FiRefreshCw size={14} className="mx-auto transform -scale-x-100" />
                </button>
                <button
                    onClick={actions.redo}
                    disabled={!computed.canRedo}
                    className="flex-1 p-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50"
                    title="Redo"
                >
                    <FiRefreshCw size={14} className="mx-auto" />
                </button>
                <button
                    onClick={actions.deleteSelected}
                    disabled={!state.selectedId}
                    className="flex-1 p-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-red-400 disabled:opacity-50"
                    title="Delete Selected"
                >
                    <FiTrash2 size={14} className="mx-auto" />
                </button>
            </div>
        </div >
    );
};

// Bottom Panel (Gallery / Detection Results)
const GALLERY_PAGE_SIZE = 20;

// BottomPanel with Linked Image Visualization
const BottomPanel = ({
    onSelectImage,
    images,
    isLoading,
    detectionResults,
    totalImages,
    currentPage,
    onPageChange,
    linkedImageIds = [],
    isRunningDetection,
    analysisHistory = [],
    isLoadingAnalyses = false,
    onSelectAnalysis
}) => {
    const { state, actions } = useDualAnnotation();
    const [activeTab, setActiveTab] = useState('gallery');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
    const [showLinkedOnly, setShowLinkedOnly] = useState(false);
    const [expandedImage, setExpandedImage] = useState(null);
    const [panelHeight, setPanelHeight] = useState(256); // Default height in pixels (h-64 = 16rem = 256px)
    const [isResizing, setIsResizing] = useState(false);
    const panelRef = useRef(null);

    const getAnalysisResultUrl = (id, type) => {
        const token = localStorage.getItem('authToken');
        return `${API_BASE_URL}/analyses/${id}/results/${type}/download${token ? `?token=${token}` : ''}`;
    };

    const { bottomPanelExpanded } = state;

    // Handle resize drag
    const handleResizeStart = useCallback((e) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e) => {
            if (!panelRef.current) return;
            const containerRect = panelRef.current.parentElement?.getBoundingClientRect();
            if (!containerRect) return;

            // Calculate new height based on mouse position from bottom
            const newHeight = containerRect.bottom - e.clientY;
            // Clamp between min (100px) and max (70% of container height)
            const clampedHeight = Math.max(100, Math.min(newHeight, containerRect.height * 0.7));
            setPanelHeight(clampedHeight);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Get image ID (handles both id and _id)
    const getImageId = (img) => img.id || img._id;

    const filteredImages = images?.filter(img => {
        if (showFlaggedOnly && !img.is_flagged) return false;

        const imgId = getImageId(img);

        // Linked Only Filter
        if (showLinkedOnly && !linkedImageIds.includes(imgId)) return false;

        if (searchQuery && !img.filename?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        // Don't show the left image in the gallery
        if (state.leftImage && imgId === state.leftImage.id) return false;
        return true;
    }) || [];

    const totalPages = Math.ceil((totalImages || filteredImages.length) / GALLERY_PAGE_SIZE);
    const page = currentPage || 1;

    return (
        <div
            ref={panelRef}
            className={`bg-gray-800 border-t border-gray-700 flex flex-col ${isResizing ? '' : 'transition-all duration-300'}`}
            style={{ height: bottomPanelExpanded ? `${panelHeight}px` : '48px' }}
        >
            {/* Resize Handle - only visible when expanded */}
            {bottomPanelExpanded && (
                <div
                    className="h-1.5 cursor-ns-resize bg-gray-700 hover:bg-indigo-500/50 transition-colors flex items-center justify-center group"
                    onMouseDown={handleResizeStart}
                >
                    <div className="w-12 h-1 bg-gray-500 rounded group-hover:bg-indigo-400 transition-colors" />
                </div>
            )}

            {/* Tab Bar */}
            <div className="flex items-center justify-between px-4 h-12 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={actions.toggleBottomPanel}
                        className="p-1.5 rounded hover:bg-gray-700 text-gray-400"
                    >
                        {bottomPanelExpanded ? <FiChevronDown size={16} /> : <FiChevronUp size={16} />}
                    </button>
                    <button
                        onClick={() => setActiveTab('gallery')}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium
                            ${activeTab === 'gallery' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}
                        `}
                    >
                        <FiGrid size={14} />
                        Gallery {totalImages ? `(${totalImages})` : ''}
                    </button>
                    <button
                        onClick={() => setActiveTab('detection')}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium
                            ${activeTab === 'detection' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}
                        `}
                    >
                        <FiLayers size={14} />
                        Detection Results
                    </button>
                </div>

                {bottomPanelExpanded && activeTab === 'gallery' && (
                    <div className="flex items-center gap-3">
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => onPageChange?.(page - 1)}
                                    disabled={page <= 1}
                                    className="p-1 rounded hover:bg-gray-700 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <FiChevronLeft size={16} />
                                </button>
                                <span className="text-xs text-gray-400 min-w-[60px] text-center">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => onPageChange?.(page + 1)}
                                    disabled={page >= totalPages}
                                    className="p-1 rounded hover:bg-gray-700 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <FiChevronRight size={16} />
                                </button>
                            </div>
                        )}
                        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                            <input
                                type="checkbox"
                                checked={showLinkedOnly}
                                onChange={(e) => setShowLinkedOnly(e.target.checked)}
                                className="rounded bg-gray-700 border-gray-600 text-indigo-500 focus:ring-0"
                            />
                            Show Linked Only ({linkedImageIds.length})
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-400">
                            <input
                                type="checkbox"
                                checked={showFlaggedOnly}
                                onChange={(e) => setShowFlaggedOnly(e.target.checked)}
                                className="rounded bg-gray-700 border-gray-600 text-red-500 focus:ring-0"
                            />
                            Flagged Only
                        </label>
                        <div className="relative">
                            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                            <input
                                type="text"
                                placeholder="Filter images..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-gray-900 border border-gray-700 rounded-full pl-8 pr-3 py-1 text-sm w-48 focus:outline-none focus:border-gray-500"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Content Area */}
            {bottomPanelExpanded && (
                <div className="flex-1 min-h-0 overflow-auto p-4">
                    {activeTab === 'gallery' ? (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3">
                            {isLoading ? (
                                <p className="text-gray-400 text-sm">Loading gallery...</p>
                            ) : filteredImages.length === 0 ? (
                                <p className="text-gray-400 text-sm">No images found matching criteria.</p>
                            ) : (
                                filteredImages.map(img => {
                                    const imgId = getImageId(img);
                                    const isLinked = linkedImageIds.includes(imgId);
                                    return (
                                        <button
                                            key={imgId}
                                            onClick={() => onSelectImage(img)}
                                            className={`
                                                relative aspect-square rounded-lg overflow-hidden border-2 group
                                                ${isLinked ? 'border-amber-500 ring-1 ring-amber-500' : 'border-transparent hover:border-gray-500'}
                                                transition-all
                                            `}
                                        >
                                            <img
                                                src={getThumbnailUrl(imgId)}
                                                alt={img.filename}
                                                className="w-full h-full object-cover"
                                            />
                                            {img.is_flagged && (
                                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                                            )}
                                            {isLinked && (
                                                <div className="absolute top-1 left-1 bg-amber-500/90 text-white rounded-full p-0.5" title="Has linked annotation">
                                                    <FiLink2 size={10} />
                                                </div>
                                            )}
                                            <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-[10px] text-white truncate">{img.filename}</p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        <div className="text-gray-300 text-sm h-full">
                            {isRunningDetection || isLoadingAnalyses ? (
                                <div className="flex items-center gap-2 p-4">
                                    <FiRefreshCw className="animate-spin text-indigo-500" size={20} />
                                    <span>{isRunningDetection ? 'Processing detection...' : 'Loading analysis history...'}</span>
                                </div>
                            ) : detectionResults ? (
                                <div className="h-full flex flex-col">
                                    {detectionResults.error ? (
                                        <div className="p-4 bg-red-900/20 text-red-400 rounded">
                                            <p className="font-bold">Analysis failed</p>
                                            <p>{detectionResults.error}</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Header with metadata and history selector */}
                                            <div className="flex items-center justify-between mb-3 flex-shrink-0">
                                                <div className="flex items-center gap-4">
                                                    <p className="font-medium text-white">Detection Results</p>
                                                    <span className="text-xs text-gray-500">
                                                        Method: {detectionResults.method || 'keypoint'}
                                                    </span>
                                                    {detectionResults.created_at && (
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(detectionResults.created_at).toLocaleDateString()} {new Date(detectionResults.created_at).toLocaleTimeString()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {detectionResults.target_image_id && (
                                                        <button
                                                            onClick={() => {
                                                                const targetImg = images?.find(img => (img.id || img._id) === detectionResults.target_image_id);
                                                                onSelectImage({
                                                                    id: detectionResults.target_image_id,
                                                                    filename: targetImg?.filename || 'Target Image'
                                                                });
                                                            }}
                                                            className="flex items-center gap-1.5 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors"
                                                            title="Load target image for annotation"
                                                        >
                                                            <FiEdit3 size={12} />
                                                            Annotate Target
                                                        </button>
                                                    )}
                                                    {analysisHistory.length > 1 && (
                                                        <select
                                                            className="bg-gray-700 text-gray-200 text-xs rounded px-2 py-1 border border-gray-600 focus:outline-none focus:border-indigo-500"
                                                            value={detectionResults.id || ''}
                                                            onChange={(e) => {
                                                                const selected = analysisHistory.find(a => a._id === e.target.value);
                                                                if (selected) onSelectAnalysis(selected);
                                                            }}
                                                        >
                                                            {analysisHistory.map(a => (
                                                                <option key={a._id} value={a._id}>
                                                                    {new Date(a.created_at).toLocaleDateString()} - {a.type?.replace(/_/g, ' ')}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Result Images - Larger and clickable */}
                                            {detectionResults.id && (
                                                <div className="flex gap-4 flex-1 min-h-0">
                                                    {detectionResults.matches_image && (
                                                        <div className="flex-1 flex flex-col min-w-0">
                                                            <p className="text-xs text-gray-400 mb-1">Matches</p>
                                                            <div
                                                                className="flex-1 bg-black rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                                                                onClick={() => setExpandedImage({
                                                                    src: getAnalysisResultUrl(detectionResults.id, 'matches'),
                                                                    alt: 'Matches'
                                                                })}
                                                                title="Click to enlarge"
                                                            >
                                                                <img
                                                                    src={getAnalysisResultUrl(detectionResults.id, 'matches')}
                                                                    alt="Matches"
                                                                    className="w-full h-full object-contain"
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                        e.target.parentElement.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Failed to load</div>';
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {detectionResults.clusters_image && (
                                                        <div className="flex-1 flex flex-col min-w-0">
                                                            <p className="text-xs text-gray-400 mb-1">Clusters</p>
                                                            <div
                                                                className="flex-1 bg-black rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                                                                onClick={() => setExpandedImage({
                                                                    src: getAnalysisResultUrl(detectionResults.id, 'clusters'),
                                                                    alt: 'Clusters'
                                                                })}
                                                                title="Click to enlarge"
                                                            >
                                                                <img
                                                                    src={getAnalysisResultUrl(detectionResults.id, 'clusters')}
                                                                    alt="Clusters"
                                                                    className="w-full h-full object-contain"
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                        e.target.parentElement.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Failed to load</div>';
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {!detectionResults.matches_image && !detectionResults.clusters_image && (
                                                        <div className="flex items-center justify-center flex-1 text-gray-500">
                                                            No result images available
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ) : analysisHistory.length > 0 ? (
                                <div className="p-4 text-gray-400">
                                    <p className="mb-2">Found {analysisHistory.length} previous analysis(es).</p>
                                    <button
                                        onClick={() => onSelectAnalysis(analysisHistory[0])}
                                        className="text-indigo-400 hover:text-indigo-300 underline"
                                    >
                                        View most recent result
                                    </button>
                                </div>
                            ) : (
                                <p className="p-4 text-gray-400">Run cross-copy-move detection to see results here.</p>
                            )}

                            {/* Image Overlay Modal */}
                            {expandedImage && (
                                <div
                                    className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-8"
                                    onClick={() => setExpandedImage(null)}
                                >
                                    <button
                                        className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
                                        onClick={() => setExpandedImage(null)}
                                    >
                                        <FiX size={28} />
                                    </button>
                                    <img
                                        src={expandedImage.src}
                                        alt={expandedImage.alt}
                                        className="max-w-full max-h-full object-contain"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded">
                                        {expandedImage.alt} - Click outside or press X to close
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- Main Modal Component (Inner) ---
const DualImageComparisonModalInner = ({
    selectedImage,
    existingAnnotations = [],
    onClose,
    onSaveSuccess,
}) => {
    // const { t } = useLanguage(); // Removed unused var
    const { state, actions, computed } = useDualAnnotation();

    const [isSaving, setIsSaving] = useState(false);
    const [images, setImages] = useState([]);
    const [isLoadingImages, setIsLoadingImages] = useState(true);
    const [detectionResults, setDetectionResults] = useState(null);
    const [isRunningDetection, setIsRunningDetection] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalImages, setTotalImages] = useState(0);
    const [linkedImageIds, setLinkedImageIds] = useState([]);
    const [analysisHistory, setAnalysisHistory] = useState([]);
    const [isLoadingAnalyses, setIsLoadingAnalyses] = useState(false);

    const initializedRef = useRef(null);
    const pollIntervalRef = useRef(null);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, []);

    // Fetch linked IDs whenever left image changes
    useEffect(() => {
        if (state.leftImage?.id) {
            api.getLinkedImages(state.leftImage.id)
                .then(ids => setLinkedImageIds(ids))
                .catch(err => console.error('Error fetching linked images:', err));
        } else {
            setLinkedImageIds([]);
        }
    }, [state.leftImage?.id]);

    // Fetch historical analyses when left image changes
    useEffect(() => {
        const fetchAnalyses = async () => {
            if (!state.leftImage?.id) {
                setAnalysisHistory([]);
                return;
            }

            setIsLoadingAnalyses(true);
            try {
                const analyses = await api.getAnalysesByImage(state.leftImage.id);
                // Filter for cross-image analyses only (completed ones)
                const crossImageAnalyses = analyses.filter(a =>
                    a.type === 'cross_image_copy_move' && a.status === 'completed'
                );
                setAnalysisHistory(crossImageAnalyses);

                // Auto-select the most recent analysis that matches current image pair
                if (crossImageAnalyses.length > 0 && !detectionResults) {
                    const rightId = state.rightImage?.id;
                    // Find matching analysis for current pair (if right image is selected)
                    let matchingAnalysis = crossImageAnalyses[0]; // Default to most recent
                    if (rightId) {
                        const pairMatch = crossImageAnalyses.find(a =>
                            (a.source_image_id === state.leftImage.id && a.target_image_id === rightId) ||
                            (a.target_image_id === state.leftImage.id && a.source_image_id === rightId)
                        );
                        if (pairMatch) {
                            matchingAnalysis = pairMatch;
                        }
                    }
                    setDetectionResults({
                        ...(matchingAnalysis.results || {}),
                        id: matchingAnalysis._id,
                        status: matchingAnalysis.status,
                        created_at: matchingAnalysis.created_at,
                        target_image_id: matchingAnalysis.target_image_id,
                        source_image_id: matchingAnalysis.source_image_id
                    });
                }
            } catch (err) {
                console.error('Error fetching analysis history:', err);
            } finally {
                setIsLoadingAnalyses(false);
            }
        };

        fetchAnalyses();
    }, [state.leftImage?.id, state.rightImage?.id]);

    // Helper to dynamic update labels based on links
    const getDisplayAnnotations = useCallback((annotations, side) => {
        if (!annotations) return [];
        const currentRightId = state.rightImage?.id;

        return annotations
            .map((ann) => {
                // First check if this annotation is in our linkedPairs
                const link = state.linkedPairs.find(lp =>
                    (side === 'left' && lp.leftAnnotationId === ann.id) ||
                    (side === 'right' && lp.rightAnnotationId === ann.id)
                );

                if (link) {
                    // Skip if this link is hidden
                    if (link.visible === false) return null;

                    // Check if this is from a different target (for triplicate detection)
                    const isFromOtherTarget = link.targetImageId && link.targetImageId !== currentRightId;

                    // Use dynamic name and color from the link
                    return {
                        ...ann,
                        linkId: link.linkId,
                        isFromOtherTarget, // Mark for visual distinction
                        label: {
                            id: 'shared',
                            name: link.name || `Pair ${state.linkedPairs.indexOf(link) + 1}`,
                            color: link.color || '#8B5CF6'
                        }
                    };
                } else if (ann.linkId || ann.link_id || ann.linkedImageId || ann.linked_image_id) {
                    // Existing linked annotation without active link in state (from server)
                    // This can happen for annotations linked to images not currently being compared
                    const linkedImgId = ann.linkedImageId || ann.linked_image_id;
                    const isFromOtherTarget = linkedImgId && linkedImgId !== currentRightId;

                    const pairIndex = annotations.filter(a => a.linkId || a.link_id).indexOf(ann);
                    return {
                        ...ann,
                        linkId: ann.linkId || ann.link_id,
                        isFromOtherTarget,
                        label: {
                            id: 'shared',
                            name: `Pair ${pairIndex + 1}`,
                            color: isFromOtherTarget ? '#9CA3AF' : '#8B5CF6' // Gray for other targets
                        }
                    };
                }
                return ann;
            })
            .filter(Boolean); // Remove hidden annotations (null values)
    }, [state.linkedPairs, state.rightImage?.id]);

    // Initialize with selected image
    useEffect(() => {
        if (selectedImage) {
            const newId = selectedImage.id || selectedImage._id;
            // Check if ID changed to avoid unnecessary reset
            if (state.leftImage?.id === newId) return;

            actions.setLeftImage({
                id: newId,
                url: getImageUrl(newId),
                filename: selectedImage.filename,
            });
            initializedRef.current = null; // Reset init flag for new image
        }
    }, [selectedImage, actions, state.leftImage]);

    // Load existing annotations (only once per image, but re-filter if right image changes)
    useEffect(() => {
        if (existingAnnotations.length > 0 && state.leftImage?.id) {
            // Check if we need to initialize or re-filter
            if (initializedRef.current !== state.leftImage.id) {
                const mapToInternal = (ann) => ({
                    id: ann._id || ann.id,
                    type: ann.shape_type || ShapeTypes.RECTANGLE,
                    label: (ann.link_id || ann.linked_image_id || ann.linkId || ann.linkedImageId)
                        ? { id: 'shared', name: 'Shared Region', color: '#8B5CF6' }
                        : (DefaultLabels.find(l => l.id === ann.type) || DefaultLabels[0]),
                    x: ann.coords?.x || 0,
                    y: ann.coords?.y || 0,
                    width: ann.coords?.width || 0,
                    height: ann.coords?.height || 0,
                    points: ann.coords?.points,
                    linkId: ann.link_id || ann.linkId,
                    linkedImageId: ann.linked_image_id || ann.linkedImageId,
                    description: ann.text,
                });

                // Filter annotations: Show generic ones OR ones linked to current right image
                const filtered = existingAnnotations
                    .filter(ann => {
                        const linkedId = ann.linked_image_id || ann.linkedImageId;
                        return !linkedId || (state.rightImage && linkedId === state.rightImage.id);
                    })
                    .map(mapToInternal);

                actions.setAnnotations('left', filtered);

                // Reconstruct linkedPairs from annotations that have link_id
                // This ensures the sidebar shows existing pairs
                const linkMap = new Map();
                filtered.forEach(ann => {
                    if (ann.linkId) {
                        if (!linkMap.has(ann.linkId)) {
                            linkMap.set(ann.linkId, { leftAnnotationId: ann.id });
                        } else {
                            linkMap.get(ann.linkId).leftAnnotationId = ann.id;
                        }
                    }
                });

                // We'll need to also check right annotations when they're loaded
                // For now, just mark that we've initialized
                initializedRef.current = state.leftImage.id;
            }
        }
    }, [existingAnnotations, actions, state.leftImage, state.rightImage]);

    // Load user images for gallery (paginated)
    const loadImages = useCallback(async (page = 1) => {
        try {
            setIsLoadingImages(true);
            const response = await api.getImages({ page, perPage: GALLERY_PAGE_SIZE });
            // Handle different response formats
            const items = response.items || response.data || response || [];
            const total = response.total || response.pagination?.total || items.length;
            setImages(items);
            setTotalImages(total);
            setCurrentPage(page);
        } catch (error) {
            console.error('Error loading images:', error);
        } finally {
            setIsLoadingImages(false);
        }
    }, []);

    useEffect(() => {
        loadImages(1);
    }, [loadImages]);

    // Handle page change
    const handlePageChange = useCallback((newPage) => {
        if (newPage >= 1) {
            loadImages(newPage);
        }
    }, [loadImages]);

    // Handle candidate image selection
    const handleSelectCandidateImage = useCallback(async (img) => {
        const rightId = img.id || img._id;
        const rightFilename = img.filename;

        actions.setRightImage({
            id: rightId,
            url: getImageUrl(rightId),
            filename: rightFilename,
        });

        const mapToInternal = (ann) => ({
            id: ann._id || ann.id,
            type: ann.shape_type || ShapeTypes.RECTANGLE,
            label: (ann.link_id || ann.linked_image_id || ann.linkId || ann.linkedImageId)
                ? { id: 'shared', name: 'Shared Region', color: '#8B5CF6' }
                : (DefaultLabels.find(l => l.id === ann.type) || DefaultLabels[0]),
            x: ann.coords?.x || 0,
            y: ann.coords?.y || 0,
            width: ann.coords?.width || 0,
            height: ann.coords?.height || 0,
            points: ann.coords?.points,
            linkId: ann.link_id || ann.linkId,
            linkedImageId: ann.linked_image_id || ann.linkedImageId,
            description: ann.text,
        });

        let leftAnnotationsList = [];
        let rightAnnotationsList = [];

        // Load annotations for Right image (Filter: Generic or Linked to Left)
        try {
            const annotations = await api.getAnnotations(rightId);
            const filteredRight = annotations.filter(ann => {
                const linkedId = ann.linked_image_id || ann.linkedImageId;
                return !linkedId || (state.leftImage && linkedId === state.leftImage.id);
            });
            rightAnnotationsList = filteredRight.map(mapToInternal);
            actions.setAnnotations('right', rightAnnotationsList);
        } catch (error) {
            console.error('Error loading right annotations:', error);
        }

        // Load ALL annotations for Left image (include annotations linked to ANY target)
        // This allows seeing previous annotations from other targets for triplicate detection
        if (state.leftImage) {
            try {
                const annotations = await api.getAnnotations(state.leftImage.id);
                // Load ALL linked annotations, not filtered by current right image
                leftAnnotationsList = annotations.map(mapToInternal);
                actions.setAnnotations('left', leftAnnotationsList);
                // Update init ref so existingAnnotations effect doesn't overwrite
                if (initializedRef.current) initializedRef.current = state.leftImage.id;
            } catch (error) {
                console.error('Error reloading left annotations:', error);
            }
        }

        // Reconstruct linkedPairs from annotations - preserve existing names/colors
        const linkColors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

        // Create a map of existing pairs by linkId to preserve their properties
        const existingPairsMap = new Map(state.linkedPairs.map(p => [p.linkId, p]));

        // Build pairs from ALL left annotations that have links
        const linkMap = new Map();

        // Collect ALL left annotations with links (to any target)
        leftAnnotationsList.forEach(ann => {
            if (ann.linkId && ann.linkedImageId) {
                const existingPair = existingPairsMap.get(ann.linkId);
                if (!linkMap.has(ann.linkId)) {
                    linkMap.set(ann.linkId, {
                        linkId: ann.linkId,
                        leftAnnotationId: ann.id,
                        targetImageId: ann.linkedImageId,
                        targetFilename: ann.linkedImageId === rightId ? rightFilename : existingPair?.targetFilename,
                        // Preserve existing properties
                        name: existingPair?.name,
                        color: existingPair?.color,
                        visible: existingPair?.visible,
                    });
                } else {
                    linkMap.get(ann.linkId).leftAnnotationId = ann.id;
                }
            }
        });

        // Collect right annotations with links (for current pair only)
        rightAnnotationsList.forEach(ann => {
            if (ann.linkId) {
                if (linkMap.has(ann.linkId)) {
                    linkMap.get(ann.linkId).rightAnnotationId = ann.id;
                } else {
                    const existingPair = existingPairsMap.get(ann.linkId);
                    linkMap.set(ann.linkId, {
                        linkId: ann.linkId,
                        rightAnnotationId: ann.id,
                        targetImageId: rightId,
                        targetFilename: rightFilename,
                        name: existingPair?.name,
                        color: existingPair?.color,
                        visible: existingPair?.visible,
                    });
                }
            }
        });

        // Convert to array and assign names/colors to pairs that don't have them
        let nextPairNumber = 1;
        const allPairs = Array.from(linkMap.values())
            .filter(pair => pair.leftAnnotationId) // Must have left annotation at minimum
            .map((pair) => {
                // Determine the display name - use existing or generate new
                let name = pair.name;
                if (!name) {
                    name = `Pair ${nextPairNumber}`;
                    nextPairNumber++;
                }

                return {
                    ...pair,
                    name,
                    color: pair.color || linkColors[(nextPairNumber - 1) % linkColors.length],
                    visible: pair.visible !== false,
                };
            });

        actions.setLinkedPairs(allPairs);
    }, [actions, state.leftImage, state.linkedPairs]);

    // Run cross-copy-move detection
    const handleRunDetection = useCallback(async () => {
        if (!state.leftImage || !state.rightImage) return;

        try {
            setIsRunningDetection(true);
            const response = await api.post('/analyses/copy-move/cross', {
                source_image_id: state.leftImage.id,
                target_image_id: state.rightImage.id,
                method: 'keypoint',
            });

            setDetectionResults(null); // Clear previous results
            showToast('Detection started', 'info');

            // Start Polling
            pollIntervalRef.current = setInterval(async () => {
                try {
                    const analysis = await api.get(`/analyses/${response.analysis_id}`);
                    if (analysis.status === 'completed') {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                        setIsRunningDetection(false);
                        setDetectionResults({
                            ...(analysis.results || {}),
                            id: analysis._id,
                            target_image_id: analysis.target_image_id,
                            source_image_id: analysis.source_image_id
                        });
                        showToast('Detection completed', 'success');
                    } else if (analysis.status === 'failed') {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                        setIsRunningDetection(false);
                        setDetectionResults({ error: analysis.error || 'Unknown error' });
                        showToast('Detection failed', 'error');
                    }
                } catch (e) {
                    console.error('Polling error:', e);
                    // Don't stop polling on transient network errors, but maybe stop on 404/403?
                    // For now, keep trying.
                }
            }, 2000); // Poll every 2 seconds

        } catch (error) {
            console.error('Detection error:', error);
            showToast('Detection failed', 'error');
            setIsRunningDetection(false); // Only set false here if initial request failed
        }
        // Finally block removed because we want isRunningDetection to stay true while polling
    }, [state.leftImage, state.rightImage]);

    // Save annotations
    const handleSave = useCallback(async () => {
        if (!state.leftImage) return;

        setIsSaving(true);
        try {
            // Prepare annotations for batch save (ONLY NEW ONES)
            const newAnnotations = [];

            // Left annotations
            for (const ann of state.leftAnnotations) {
                // Skip if it's an existing server annotation (doesn't start with ann_)
                if (ann.id && !String(ann.id).startsWith('ann_')) continue;

                const link = computed.getLinkForAnnotation(ann.id, 'left');
                newAnnotations.push({
                    image_id: state.leftImage.id,
                    text: ann.description || '',
                    coords: {
                        x: ann.x,
                        y: ann.y,
                        width: ann.width,
                        height: ann.height,
                        points: ann.points,
                    },
                    type: ann.label?.id || 'manipulation',
                    shape_type: ann.type,
                    link_id: link?.linkId || null,
                    linked_image_id: state.rightImage?.id || null,
                });
            }

            // Right annotations
            if (state.rightImage) {
                for (const ann of state.rightAnnotations) {
                    if (ann.id && !String(ann.id).startsWith('ann_')) continue;

                    const link = computed.getLinkForAnnotation(ann.id, 'right');
                    newAnnotations.push({
                        image_id: state.rightImage.id,
                        text: ann.description || '',
                        coords: {
                            x: ann.x,
                            y: ann.y,
                            width: ann.width,
                            height: ann.height,
                            points: ann.points,
                        },
                        type: ann.label?.id || 'manipulation',
                        shape_type: ann.type,
                        link_id: link?.linkId || null,
                        linked_image_id: state.leftImage.id,
                    });
                }
            }

            // Batch save
            if (newAnnotations.length > 0) {
                await api.post('/annotations/batch', { annotations: newAnnotations });
            }

            // Create relationship if both images present
            if (state.rightImage && state.linkedPairs.length > 0) {
                try {
                    await api.createRelationship(state.leftImage.id, state.rightImage.id, 'manual');
                } catch {
                    // Ignore duplicate relationship error
                }
            }

            // Reload annotations to get server IDs and confirm save
            const refreshAnnotations = async () => {
                try {
                    const mapToInternal = (anns) => anns.map(ann => ({
                        id: ann._id || ann.id,
                        type: ann.shape_type || ShapeTypes.RECTANGLE,
                        label: DefaultLabels.find(l => l.id === ann.type) || DefaultLabels[0],
                        x: ann.coords?.x || 0,
                        y: ann.coords?.y || 0,
                        width: ann.coords?.width || 0,
                        height: ann.coords?.height || 0,
                        points: ann.coords?.points,
                        linkId: ann.link_id,
                        linkedImageId: ann.linked_image_id,
                        description: ann.text,
                    }));

                    if (state.leftImage) {
                        const anns = await api.getAnnotations(state.leftImage.id);
                        // Load ALL annotations (including those linked to other targets for triplicate detection)
                        actions.setAnnotations('left', mapToInternal(anns));
                    }
                    if (state.rightImage) {
                        const anns = await api.getAnnotations(state.rightImage.id);
                        // Filter: Generic OR linked to Left (only current pair for right side)
                        const filtered = anns.filter(ann =>
                            !ann.linked_image_id ||
                            (state.leftImage && ann.linked_image_id === state.leftImage.id)
                        );
                        actions.setAnnotations('right', mapToInternal(filtered));
                    }

                    // Rebuild linkedPairs from all annotations to maintain consistency
                    if (state.leftImage) {
                        const allLeftAnns = await api.getAnnotations(state.leftImage.id);
                        const linkColors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];
                        const existingPairsMap = new Map(state.linkedPairs.map(p => [p.linkId, p]));
                        const newLinkMap = new Map();

                        // Group annotations by linkId
                        for (const ann of allLeftAnns) {
                            const linkId = ann.link_id || ann.linkId;
                            const linkedImageId = ann.linked_image_id || ann.linkedImageId;
                            if (linkId && linkedImageId) {
                                if (!newLinkMap.has(linkId)) {
                                    // Preserve existing pair properties (name, color, visible) if they exist
                                    const existingPair = existingPairsMap.get(linkId);
                                    newLinkMap.set(linkId, {
                                        linkId,
                                        leftAnnotationId: ann._id || ann.id,
                                        targetImageId: linkedImageId,
                                        name: existingPair?.name,
                                        color: existingPair?.color,
                                        visible: existingPair?.visible,
                                    });
                                }
                            }
                        }

                        // For current right image, also check right annotations
                        if (state.rightImage) {
                            const rightAnns = await api.getAnnotations(state.rightImage.id);
                            for (const ann of rightAnns) {
                                const linkId = ann.link_id || ann.linkId;
                                if (linkId && newLinkMap.has(linkId)) {
                                    newLinkMap.get(linkId).rightAnnotationId = ann._id || ann.id;
                                }
                            }
                        }

                        // Convert to array and assign names/colors to new pairs
                        let pairIndex = 0;
                        const rebuiltPairs = Array.from(newLinkMap.values()).map(pair => ({
                            ...pair,
                            name: pair.name || `Pair ${++pairIndex}`,
                            color: pair.color || linkColors[(pairIndex - 1) % linkColors.length],
                            visible: pair.visible !== false,
                        }));

                        actions.setLinkedPairs(rebuiltPairs);
                    }
                } catch (e) {
                    console.error('Error refreshing annotations:', e);
                }
            };
            await refreshAnnotations();

            // Refresh linked images list (to update gallery indicators immediately)
            if (state.leftImage?.id) {
                try {
                    const linkedIds = await api.getLinkedImages(state.leftImage.id);
                    setLinkedImageIds(linkedIds);
                } catch (err) {
                    console.error('Error refreshing linked images:', err);
                }
            }

            actions.setModified(false);
            showToast('Saved successfully', 'success');

            if (onSaveSuccess) {
                onSaveSuccess();
            }
        } catch (error) {
            console.error('Save error:', error);
            showToast('Save failed', 'error');
        } finally {
            setIsSaving(false);
        }
    }, [state, computed, actions, onSaveSuccess]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            if (e.key === 'Escape') {
                if (state.isDrawing) {
                    actions.cancelDrawing();
                } else if (state.isLinkingMode) {
                    actions.cancelLinking();
                } else if (state.selectedId) {
                    actions.clearSelection();
                } else {
                    onClose();
                }
                return;
            }

            if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedId) {
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

            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }

            if (!e.ctrlKey && !e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'v': actions.setTool(ToolTypes.SELECT); break;
                    case 'r': actions.setTool(ToolTypes.RECTANGLE); break;
                    case 'e': actions.setTool(ToolTypes.ELLIPSE); break;
                    case 'p': actions.setTool(ToolTypes.POLYGON); break;
                    case 'l':
                        if (state.selectedId && state.selectedSide) {
                            actions.startLinking(state.selectedId, state.selectedSide);
                        }
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state, actions, onClose, handleSave]);

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-gray-900">
            {/* Header */}
            <div className="flex-none flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-white">
                        Image Comparison
                    </h2>
                    {state.isModified && (
                        <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                            Unsaved
                        </span>
                    )}
                    {state.isLinkingMode && (
                        <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded animate-pulse">
                            Linking Mode
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
                    >
                        <FiSave size={16} />
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"
                        title="Close"
                    >
                        <FiX size={20} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex min-h-0">
                {/* Images Row */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 flex gap-4 p-4 min-h-0">
                        <ImageViewerPanel
                            side="left"
                            image={state.leftImage}
                            annotations={getDisplayAnnotations(state.leftAnnotations, 'left')}
                            placeholder="Selected image"
                        />
                        <ImageViewerPanel
                            side="right"
                            image={state.rightImage}
                            annotations={getDisplayAnnotations(state.rightAnnotations, 'right')}
                            onImageClick={() => actions.toggleBottomPanel()}
                            placeholder="Click to select candidate"
                        />
                    </div>

                    {/* Bottom Panel */}
                    <BottomPanel
                        onSelectImage={handleSelectCandidateImage}
                        images={images}
                        isLoading={isLoadingImages}
                        detectionResults={detectionResults}
                        totalImages={totalImages}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                        linkedImageIds={linkedImageIds}
                        isRunningDetection={isRunningDetection}
                        analysisHistory={analysisHistory}
                        isLoadingAnalyses={isLoadingAnalyses}
                        onSelectAnalysis={(analysis) => setDetectionResults({
                            ...(analysis.results || {}),
                            id: analysis._id,
                            status: analysis.status,
                            created_at: analysis.created_at,
                            target_image_id: analysis.target_image_id,
                            source_image_id: analysis.source_image_id
                        })}
                    />
                </div>

                {/* Right Toolbar */}
                <ToolbarPanel onTriggerDetection={handleRunDetection} />
            </div>
        </div>
    );
};

// --- Main Export (with Provider wrapper) ---
const DualImageComparisonModal = ({ isOpen, ...props }) => {
    if (!isOpen) return null;

    return (
        <DualAnnotationProvider>
            <DualImageComparisonModalInner {...props} />
        </DualAnnotationProvider>
    );
};

export default DualImageComparisonModal;
