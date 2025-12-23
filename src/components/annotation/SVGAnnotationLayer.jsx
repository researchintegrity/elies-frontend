// src/components/annotation/SVGAnnotationLayer.jsx
/**
 * SVG Annotation Layer Component
 * 
 * Renders annotations as SVG shapes overlaid on the image.
 * Handles shape rendering, selection highlighting, and resize handles.
 */
import React from 'react';
import { useAnnotation, ShapeTypes, ToolTypes } from '../../context/AnnotationContext';
import {
    normalizeRect,
    getResizeHandles,
    HandlePositions,
    getCursorForHandle,
} from '../../utils/annotationHelpers';

// Resize Handle Component
const ResizeHandle = ({ position, x, y, size = 8, onMouseDown, cursor }) => (
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
    onMouseDown,
    onHandleMouseDown,
    onPolygonPointMouseDown,
}) => {
    const color = annotation.label?.color || '#EF4444';
    const fillOpacity = isSelected ? 0.25 : isHovered ? 0.2 : 0.15;
    const strokeWidth = isSelected ? 2.5 : isHovered ? 2 : 1.5;
    const strokeDasharray = isSelected ? 'none' : 'none';
    
    // Common props
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
                        rx={2}
                        {...shapeProps}
                    />
                );
            }
            
            case ShapeTypes.ELLIPSE: {
                const { x, y, width, height } = normalizeRect(annotation);
                return (
                    <ellipse
                        cx={x + width / 2}
                        cy={y + height / 2}
                        rx={width / 2}
                        ry={height / 2}
                        {...shapeProps}
                    />
                );
            }
            
            case ShapeTypes.POLYGON: {
                if (!annotation.points || annotation.points.length < 3) return null;
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
    
    // Render resize handles for selected shapes
    const renderHandles = () => {
        if (!isSelected) return null;
        
        if (annotation.type === ShapeTypes.POLYGON) {
            // Polygon: render point handles
            return annotation.points?.map((point, idx) => (
                <PolygonPointHandle
                    key={idx}
                    point={point}
                    index={idx}
                    isSelected={true}
                    onMouseDown={onPolygonPointMouseDown}
                />
            ));
        }
        
        // Rectangle/Ellipse: render resize handles
        const handles = getResizeHandles(annotation);
        return Object.entries(handles).map(([position, { x, y }]) => (
            <ResizeHandle
                key={position}
                position={position}
                x={x}
                y={y}
                cursor={getCursorForHandle(position)}
                onMouseDown={(e) => onHandleMouseDown(e, position)}
            />
        ));
    };
    
    // Render label badge
    const renderLabel = () => {
        if (!isSelected && !isHovered) return null;
        
        let labelX, labelY;
        
        if (annotation.type === ShapeTypes.POLYGON && annotation.points?.length > 0) {
            // Use first point
            labelX = annotation.points[0].x;
            labelY = annotation.points[0].y - 10;
        } else {
            const { x, y } = normalizeRect(annotation);
            labelX = x;
            labelY = y - 10;
        }
        
        const labelText = annotation.label?.name || 'Unknown';
        const groupText = annotation.groupId ? ` (G${annotation.groupId})` : '';
        
        return (
            <g>
                <rect
                    x={labelX - 2}
                    y={labelY - 14}
                    width={labelText.length * 7 + (groupText.length * 6) + 10}
                    height={18}
                    rx={4}
                    fill={color}
                    opacity={0.9}
                />
                <text
                    x={labelX + 3}
                    y={labelY - 1}
                    fill="white"
                    fontSize={11}
                    fontWeight="600"
                >
                    {labelText}{groupText}
                </text>
            </g>
        );
    };
    
    return (
        <g data-annotation-id={annotation.id}>
            {renderShape()}
            {renderLabel()}
            {renderHandles()}
        </g>
    );
};

// Current Drawing Shape (Preview)
const DrawingPreview = ({ shape, color }) => {
    if (!shape) return null;
    
    const shapeProps = {
        fill: color,
        fillOpacity: 0.2,
        stroke: color,
        strokeWidth: 2,
        strokeDasharray: '5,5',
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
                    rx={2}
                    {...shapeProps}
                />
            );
        }
        
        case ShapeTypes.ELLIPSE: {
            const { x, y, width, height } = normalizeRect(shape);
            return (
                <ellipse
                    cx={x + width / 2}
                    cy={y + height / 2}
                    rx={Math.abs(width / 2)}
                    ry={Math.abs(height / 2)}
                    {...shapeProps}
                />
            );
        }
        
        case ShapeTypes.POLYGON: {
            if (!shape.points || shape.points.length === 0) return null;
            
            const points = shape.points;
            const lastPoint = points[points.length - 1];
            
            return (
                <g>
                    {/* Lines connecting points */}
                    {points.length > 1 && (
                        <polyline
                            points={points.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke={color}
                            strokeWidth={2}
                            strokeDasharray="5,5"
                        />
                    )}
                    
                    {/* Preview line to mouse */}
                    {shape.previewPoint && lastPoint && (
                        <line
                            x1={lastPoint.x}
                            y1={lastPoint.y}
                            x2={shape.previewPoint.x}
                            y2={shape.previewPoint.y}
                            stroke={color}
                            strokeWidth={1.5}
                            strokeDasharray="3,3"
                            opacity={0.6}
                        />
                    )}
                    
                    {/* Closing line preview */}
                    {points.length > 2 && shape.previewPoint && (
                        <line
                            x1={points[0].x}
                            y1={points[0].y}
                            x2={shape.previewPoint.x}
                            y2={shape.previewPoint.y}
                            stroke={color}
                            strokeWidth={1}
                            strokeDasharray="2,2"
                            opacity={0.4}
                        />
                    )}
                    
                    {/* Point markers */}
                    {points.map((point, idx) => (
                        <circle
                            key={idx}
                            cx={point.x}
                            cy={point.y}
                            r={idx === 0 ? 7 : 5}
                            fill={idx === 0 ? color : 'white'}
                            stroke={color}
                            strokeWidth={2}
                        />
                    ))}
                    
                    {/* Hint text for first point */}
                    {points.length > 2 && (
                        <text
                            x={points[0].x}
                            y={points[0].y - 12}
                            fill={color}
                            fontSize={10}
                            fontWeight="bold"
                            textAnchor="middle"
                        >
                            Click to close
                        </text>
                    )}
                </g>
            );
        }
        
        default:
            return null;
    }
};

// Main SVG Layer Component
const SVGAnnotationLayer = ({
    width,
    height,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    onDoubleClick,
    onAnnotationMouseDown,
    onHandleMouseDown,
    onPolygonPointMouseDown,
}) => {
    const { state } = useAnnotation();
    const { 
        annotations, 
        selectedId, 
        hoveredId, 
        currentShape, 
        isDrawing,
        activeLabel,
        activeTool,
    } = state;
    
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
                    onMouseDown={(e) => onAnnotationMouseDown(e, annotation)}
                    onHandleMouseDown={(e, handle) => onHandleMouseDown(e, annotation, handle)}
                    onPolygonPointMouseDown={(e, pointIndex) => onPolygonPointMouseDown(e, annotation, pointIndex)}
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

export default SVGAnnotationLayer;
