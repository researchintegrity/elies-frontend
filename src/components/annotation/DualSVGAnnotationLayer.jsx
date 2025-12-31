// src/components/annotation/DualSVGAnnotationLayer.jsx
/**
 * Dual SVG Annotation Layer Component
 * 
 * A props-based version of SVGAnnotationLayer that doesn't depend on AnnotationContext.
 * Used for the dual-image comparison modal where DualAnnotationContext is used instead.
 */
import React from 'react';
import { ShapeTypes, ToolTypes } from '../../context/DualAnnotationContext';
// import { useLanguage } from '../../context/LanguageContext'; // Unused
import {
    normalizeRect,
    getResizeHandles,
    getCursorForHandle,
} from '../../utils/annotationHelpers';

// Resize Handle Component
const ResizeHandle = ({ x, y, size = 8, onMouseDown, cursor }) => (
    <rect
        x={x}
        y={y}
        width={size}
        height={size}
        fill="white"
        stroke="#4F46E5"
        strokeWidth={2}
        rx={2}
        className="cursor-pointer"
        style={{ cursor }}
        onMouseDown={onMouseDown}
    />
);

// Polygon Point Handle
const PolygonPointHandle = ({ point, index, isSelected, onMouseDown }) => (
    <circle
        cx={point.x}
        cy={point.y}
        r={isSelected ? 6 : 5}
        fill="white"
        stroke="#4F46E5"
        strokeWidth={2}
        className="cursor-move"
        onMouseDown={(e) => onMouseDown(e, index)}
    />
);

// Shape Renderer
const AnnotationShape = ({
    annotation,
    isSelected,
    isHovered,
    isPendingLink,
    isRecentlyLinked,
    onMouseDown,
    onHandleMouseDown,
    onPolygonPointMouseDown,
    linkColor,
}) => {
    // const { t } = useLanguage(); // Unused
    // Use link color if provided, otherwise use annotation label color
    const color = linkColor || annotation.label?.color || '#EF4444';
    const fillOpacity = isSelected ? 0.25 : isHovered ? 0.2 : 0.15;
    const strokeWidth = isSelected ? 2.5 : isHovered ? 2 : 1.5;
    const strokeDasharray = isSelected ? 'none' : 'none';

    const shapeProps = {
        fill: color,
        fillOpacity,
        stroke: color,
        strokeWidth,
        strokeDasharray,
        className: 'cursor-move transition-all duration-100',
        onMouseDown,
    };

    const renderShape = () => {
        switch (annotation.type) {
            case ShapeTypes.RECTANGLE: {
                const { x, y, width, height } = normalizeRect(annotation);
                return (
                    <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        {...shapeProps}
                    />
                );
            }
            case ShapeTypes.ELLIPSE: {
                const { x, y, width, height } = normalizeRect(annotation);
                const cx = x + width / 2;
                const cy = y + height / 2;
                return (
                    <ellipse
                        cx={cx}
                        cy={cy}
                        rx={width / 2}
                        ry={height / 2}
                        {...shapeProps}
                    />
                );
            }
            case ShapeTypes.POLYGON: {
                if (!annotation.points || annotation.points.length < 2) return null;
                const pointsStr = annotation.points.map(p => `${p.x},${p.y}`).join(' ');
                return (
                    <polygon
                        points={pointsStr}
                        {...shapeProps}
                    />
                );
            }
            default:
                return null;
        }
    };

    const renderResizeHandles = () => {
        if (!isSelected) return null;

        if (annotation.type === ShapeTypes.POLYGON) {
            return annotation.points?.map((point, index) => (
                <PolygonPointHandle
                    key={index}
                    point={point}
                    index={index}
                    isSelected={isSelected}
                    onMouseDown={(e, idx) => onPolygonPointMouseDown(e, idx)}
                />
            ));
        }

        const handles = getResizeHandles(annotation) || {};
        return Object.entries(handles).map(([position, handle]) => (
            <ResizeHandle
                key={position}
                x={handle.x - 4}
                y={handle.y - 4}
                cursor={getCursorForHandle(position)}
                onMouseDown={(e) => onHandleMouseDown(e, position)}
            />
        ));
    };

    // Calculate center for badge positioning
    const getAnnotationCenter = () => {
        if (annotation.type === ShapeTypes.POLYGON && annotation.points?.length > 0) {
            const sumX = annotation.points.reduce((sum, p) => sum + p.x, 0);
            const sumY = annotation.points.reduce((sum, p) => sum + p.y, 0);
            return { x: sumX / annotation.points.length, y: sumY / annotation.points.length };
        }
        const { x, y, width, height } = normalizeRect(annotation);
        return { x: x + width / 2, y: y + height / 2 };
    };

    const renderLinkBadge = () => {
        if (!isPendingLink && !isRecentlyLinked) return null;
        const center = getAnnotationCenter();
        const badgeNumber = isPendingLink ? '1' : '2';
        const badgeColor = isPendingLink ? '#F59E0B' : '#10B981'; // Amber for pending, green for linked
        return (
            <g>
                {/* Pulsing glow effect */}
                <circle
                    cx={center.x}
                    cy={center.y}
                    r={20}
                    fill={badgeColor}
                    opacity={0.3}
                    className={isPendingLink ? 'animate-ping' : 'animate-pulse'}
                />
                {/* Badge background */}
                <circle
                    cx={center.x}
                    cy={center.y}
                    r={14}
                    fill={badgeColor}
                    stroke="white"
                    strokeWidth={2}
                />
                {/* Badge number */}
                <text
                    x={center.x}
                    y={center.y + 5}
                    textAnchor="middle"
                    fill="white"
                    fontSize={14}
                    fontWeight="bold"
                    style={{ pointerEvents: 'none' }}
                >
                    {badgeNumber}
                </text>
            </g>
        );
    };

    return (
        <g>
            {renderShape()}
            {renderResizeHandles()}
            {renderLinkBadge()}
        </g>
    );
};

// Drawing Preview
const DrawingPreview = ({ shape, color }) => {
    if (!shape) return null;

    const strokeDasharray = '5,5';
    const fillOpacity = 0.1;
    const strokeWidth = 2;

    const commonProps = {
        fill: color,
        fillOpacity,
        stroke: color,
        strokeWidth,
        strokeDasharray,
        className: 'pointer-events-none',
    };

    switch (shape.type) {
        case ShapeTypes.RECTANGLE: {
            const { x, y, width, height } = normalizeRect(shape);
            return (
                <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    {...commonProps}
                />
            );
        }
        case ShapeTypes.ELLIPSE: {
            const { x, y, width, height } = normalizeRect(shape);
            const cx = x + width / 2;
            const cy = y + height / 2;
            return (
                <ellipse
                    cx={cx}
                    cy={cy}
                    rx={Math.abs(width) / 2}
                    ry={Math.abs(height) / 2}
                    {...commonProps}
                />
            );
        }
        case ShapeTypes.POLYGON: {
            if (!shape.points || shape.points.length === 0) return null;

            const points = [...shape.points];
            const previewPoint = shape.previewPoint;

            return (
                <g>
                    {points.length >= 2 && (
                        <polyline
                            points={points.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke={color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={strokeDasharray}
                        />
                    )}

                    {previewPoint && points.length > 0 && (
                        <line
                            x1={points[points.length - 1].x}
                            y1={points[points.length - 1].y}
                            x2={previewPoint.x}
                            y2={previewPoint.y}
                            stroke={color}
                            strokeWidth={1}
                            strokeDasharray="3,3"
                            opacity={0.5}
                        />
                    )}

                    {previewPoint && points.length >= 2 && (
                        <line
                            x1={previewPoint.x}
                            y1={previewPoint.y}
                            x2={points[0].x}
                            y2={points[0].y}
                            stroke={color}
                            strokeWidth={1}
                            strokeDasharray="3,3"
                            opacity={0.3}
                        />
                    )}

                    {points.map((point, index) => (
                        <circle
                            key={index}
                            cx={point.x}
                            cy={point.y}
                            r={index === 0 ? 6 : 4}
                            fill={index === 0 ? color : 'white'}
                            stroke={color}
                            strokeWidth={1.5}
                        />
                    ))}
                </g>
            );
        }
        default:
            return null;
    }
};

/**
 * DualSVGAnnotationLayer - Props-based annotation layer
 * 
 * Unlike SVGAnnotationLayer, this component receives all state via props
 * instead of using useAnnotation() context.
 */
const DualSVGAnnotationLayer = ({
    width,
    height,
    annotations,
    currentShape,
    selectedId,
    hoveredId,
    isDrawing,
    activeLabel,
    activeTool,
    pendingLinkAnnotationId, // ID of annotation pending for linking (shows "1" badge)
    recentlyLinkedAnnotationId, // ID of annotation just linked (shows brief "2" badge)
    getAnnotationColor, // Optional: function to get link color for annotation
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    onDoubleClick,
    onAnnotationMouseDown,
    onHandleMouseDown,
    onPolygonPointMouseDown,
}) => {
    // Determine cursor based on tool
    const getCursor = () => {
        if (isDrawing) {
            if (activeTool === ToolTypes.POLYGON) return 'crosshair';
            return 'crosshair';
        }

        switch (activeTool) {
            case ToolTypes.SELECT:
                return 'default';
            case ToolTypes.RECTANGLE:
            case ToolTypes.ELLIPSE:
            case ToolTypes.POLYGON:
                return 'crosshair';
            case ToolTypes.DELETE:
                return 'not-allowed';
            default:
                return 'default';
        }
    };

    return (
        <svg
            width={width}
            height={height}
            className="absolute top-0 left-0 pointer-events-auto"
            style={{ cursor: getCursor() }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onDoubleClick={onDoubleClick}
        >
            {/* Render existing annotations */}
            {annotations.map(annotation => (
                <AnnotationShape
                    key={annotation.id}
                    annotation={annotation}
                    isSelected={selectedId === annotation.id}
                    isHovered={hoveredId === annotation.id}
                    isPendingLink={pendingLinkAnnotationId === annotation.id}
                    isRecentlyLinked={recentlyLinkedAnnotationId === annotation.id}
                    linkColor={getAnnotationColor ? getAnnotationColor(annotation.id) : null}
                    onMouseDown={(e) => onAnnotationMouseDown?.(e, annotation)}
                    onHandleMouseDown={(e, handle) => onHandleMouseDown?.(e, annotation, handle)}
                    onPolygonPointMouseDown={(e, pointIndex) => onPolygonPointMouseDown?.(e, annotation, pointIndex)}
                />
            ))}

            {/* Render current drawing preview */}
            {isDrawing && currentShape && (
                <DrawingPreview
                    shape={currentShape}
                    color={activeLabel?.color || '#EF4444'}
                />
            )}
        </svg>
    );
};

export default DualSVGAnnotationLayer;
