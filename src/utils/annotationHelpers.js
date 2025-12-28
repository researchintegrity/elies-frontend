// src/utils/annotationHelpers.js
/**
 * Annotation Helper Utilities
 * 
 * Geometry calculations, hit testing, and shape manipulation functions
 * for the image annotation system.
 */

import { ShapeTypes } from '../context/AnnotationContext';

// --- Geometry Utilities ---

/**
 * Calculate distance between two points
 */
export const distance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

/**
 * Normalize rectangle (ensure positive width/height)
 */
export const normalizeRect = (rect) => {
    let { x, y, width, height } = rect;
    if (width < 0) {
        x += width;
        width = Math.abs(width);
    }
    if (height < 0) {
        y += height;
        height = Math.abs(height);
    }
    return { x, y, width, height };
};

/**
 * Get bounding box of a polygon
 */
export const getPolygonBounds = (points) => {
    if (!points || points.length === 0) return null;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    });

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
    };
};

/**
 * Get center of annotation
 */
export const getAnnotationCenter = (annotation) => {
    switch (annotation.type) {
        case ShapeTypes.RECTANGLE:
        case ShapeTypes.ELLIPSE:
            return {
                x: annotation.x + annotation.width / 2,
                y: annotation.y + annotation.height / 2,
            };
        case ShapeTypes.POLYGON: {
            if (!annotation.points || annotation.points.length === 0) return { x: 0, y: 0 };
            const sum = annotation.points.reduce(
                (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
                { x: 0, y: 0 }
            );
            return {
                x: sum.x / annotation.points.length,
                y: sum.y / annotation.points.length,
            };
        }
        default:
            return { x: 0, y: 0 };
    }
};

// --- Hit Testing ---

/**
 * Check if point is inside rectangle
 */
export const pointInRect = (point, rect) => {
    const { x, y, width, height } = normalizeRect(rect);
    return (
        point.x >= x &&
        point.x <= x + width &&
        point.y >= y &&
        point.y <= y + height
    );
};

/**
 * Check if point is inside ellipse
 */
export const pointInEllipse = (point, ellipse) => {
    const { x, y, width, height } = normalizeRect(ellipse);
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = width / 2;
    const ry = height / 2;

    if (rx === 0 || ry === 0) return false;

    const dx = point.x - cx;
    const dy = point.y - cy;

    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
};

/**
 * Check if point is inside polygon (ray casting algorithm)
 */
export const pointInPolygon = (point, points) => {
    if (!points || points.length < 3) return false;

    let inside = false;
    const n = points.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = points[i].x, yi = points[i].y;
        const xj = points[j].x, yj = points[j].y;

        if (
            yi > point.y !== yj > point.y &&
            point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
        ) {
            inside = !inside;
        }
    }

    return inside;
};

/**
 * Check if point is inside annotation
 */
export const pointInAnnotation = (point, annotation) => {
    switch (annotation.type) {
        case ShapeTypes.RECTANGLE:
            return pointInRect(point, annotation);
        case ShapeTypes.ELLIPSE:
            return pointInEllipse(point, annotation);
        case ShapeTypes.POLYGON:
            return pointInPolygon(point, annotation.points);
        default:
            return false;
    }
};

/**
 * Find annotation at point
 */
export const findAnnotationAtPoint = (point, annotations) => {
    // Search in reverse order (top elements first)
    for (let i = annotations.length - 1; i >= 0; i--) {
        if (pointInAnnotation(point, annotations[i])) {
            return annotations[i];
        }
    }
    return null;
};

// --- Resize Handles ---

export const HandlePositions = {
    TOP_LEFT: 'tl',
    TOP_CENTER: 'tc',
    TOP_RIGHT: 'tr',
    MIDDLE_LEFT: 'ml',
    MIDDLE_RIGHT: 'mr',
    BOTTOM_LEFT: 'bl',
    BOTTOM_CENTER: 'bc',
    BOTTOM_RIGHT: 'br',
};

/**
 * Get resize handle positions for a rectangle/ellipse
 */
export const getResizeHandles = (annotation, handleSize = 8) => {
    const { x, y, width, height } = normalizeRect(annotation);
    const half = handleSize / 2;

    return {
        [HandlePositions.TOP_LEFT]: { x: x - half, y: y - half },
        [HandlePositions.TOP_CENTER]: { x: x + width / 2 - half, y: y - half },
        [HandlePositions.TOP_RIGHT]: { x: x + width - half, y: y - half },
        [HandlePositions.MIDDLE_LEFT]: { x: x - half, y: y + height / 2 - half },
        [HandlePositions.MIDDLE_RIGHT]: { x: x + width - half, y: y + height / 2 - half },
        [HandlePositions.BOTTOM_LEFT]: { x: x - half, y: y + height - half },
        [HandlePositions.BOTTOM_CENTER]: { x: x + width / 2 - half, y: y + height - half },
        [HandlePositions.BOTTOM_RIGHT]: { x: x + width - half, y: y + height - half },
    };
};

/**
 * Check which resize handle is at point
 */
export const getHandleAtPoint = (point, annotation, handleSize = 10) => {
    const handles = getResizeHandles(annotation, handleSize);

    for (const [position, handle] of Object.entries(handles)) {
        if (
            point.x >= handle.x &&
            point.x <= handle.x + handleSize &&
            point.y >= handle.y &&
            point.y <= handle.y + handleSize
        ) {
            return position;
        }
    }

    return null;
};

/**
 * Get cursor style for handle position
 */
export const getCursorForHandle = (handle) => {
    const cursors = {
        [HandlePositions.TOP_LEFT]: 'nwse-resize',
        [HandlePositions.TOP_CENTER]: 'ns-resize',
        [HandlePositions.TOP_RIGHT]: 'nesw-resize',
        [HandlePositions.MIDDLE_LEFT]: 'ew-resize',
        [HandlePositions.MIDDLE_RIGHT]: 'ew-resize',
        [HandlePositions.BOTTOM_LEFT]: 'nesw-resize',
        [HandlePositions.BOTTOM_CENTER]: 'ns-resize',
        [HandlePositions.BOTTOM_RIGHT]: 'nwse-resize',
    };
    return cursors[handle] || 'default';
};

/**
 * Resize annotation based on handle drag
 */
export const resizeAnnotation = (annotation, handle, delta) => {
    let { x, y, width, height } = annotation;

    switch (handle) {
        case HandlePositions.TOP_LEFT:
            x += delta.x;
            y += delta.y;
            width -= delta.x;
            height -= delta.y;
            break;
        case HandlePositions.TOP_CENTER:
            y += delta.y;
            height -= delta.y;
            break;
        case HandlePositions.TOP_RIGHT:
            y += delta.y;
            width += delta.x;
            height -= delta.y;
            break;
        case HandlePositions.MIDDLE_LEFT:
            x += delta.x;
            width -= delta.x;
            break;
        case HandlePositions.MIDDLE_RIGHT:
            width += delta.x;
            break;
        case HandlePositions.BOTTOM_LEFT:
            x += delta.x;
            width -= delta.x;
            height += delta.y;
            break;
        case HandlePositions.BOTTOM_CENTER:
            height += delta.y;
            break;
        case HandlePositions.BOTTOM_RIGHT:
            width += delta.x;
            height += delta.y;
            break;
    }

    // Ensure minimum size
    const minSize = 10;
    if (width < minSize) width = minSize;
    if (height < minSize) height = minSize;

    return { ...annotation, x, y, width, height };
};

// --- Polygon Point Editing ---

/**
 * Find closest polygon point to mouse
 */
export const findClosestPolygonPoint = (point, points, threshold = 10) => {
    let closestIdx = -1;
    let closestDist = Infinity;

    points.forEach((p, idx) => {
        const d = distance(point, p);
        if (d < closestDist && d < threshold) {
            closestDist = d;
            closestIdx = idx;
        }
    });

    return closestIdx;
};

/**
 * Move polygon point
 */
export const movePolygonPoint = (annotation, pointIndex, newPosition) => {
    const newPoints = [...annotation.points];
    newPoints[pointIndex] = newPosition;
    return { ...annotation, points: newPoints };
};

/**
 * Add point to polygon edge
 */
export const addPointToPolygon = (annotation, afterIndex, newPoint) => {
    const newPoints = [...annotation.points];
    newPoints.splice(afterIndex + 1, 0, newPoint);
    return { ...annotation, points: newPoints };
};

/**
 * Remove point from polygon
 */
export const removePolygonPoint = (annotation, pointIndex) => {
    if (annotation.points.length <= 3) return annotation; // Keep minimum 3 points
    const newPoints = annotation.points.filter((_, idx) => idx !== pointIndex);
    return { ...annotation, points: newPoints };
};

// --- Transformation ---

/**
 * Move annotation by delta
 */
export const moveAnnotation = (annotation, delta) => {
    if (annotation.type === ShapeTypes.POLYGON) {
        return {
            ...annotation,
            points: annotation.points.map(p => ({
                x: p.x + delta.x,
                y: p.y + delta.y,
            })),
        };
    }

    return {
        ...annotation,
        x: annotation.x + delta.x,
        y: annotation.y + delta.y,
    };
};

/**
 * Scale annotation from center
 */
export const scaleAnnotation = (annotation, scale) => {
    const center = getAnnotationCenter(annotation);

    if (annotation.type === ShapeTypes.POLYGON) {
        return {
            ...annotation,
            points: annotation.points.map(p => ({
                x: center.x + (p.x - center.x) * scale,
                y: center.y + (p.y - center.y) * scale,
            })),
        };
    }

    const newWidth = annotation.width * scale;
    const newHeight = annotation.height * scale;

    return {
        ...annotation,
        x: center.x - newWidth / 2,
        y: center.y - newHeight / 2,
        width: newWidth,
        height: newHeight,
    };
};

// --- Coordinate Conversion ---

/**
 * Convert screen coordinates to image coordinates
 */
export const screenToImage = (screenPoint, imageRect, zoom = 1, pan = { x: 0, y: 0 }) => {
    return {
        x: (screenPoint.x - imageRect.left - pan.x) / zoom,
        y: (screenPoint.y - imageRect.top - pan.y) / zoom,
    };
};

/**
 * Convert image coordinates to screen coordinates
 */
export const imageToScreen = (imagePoint, imageRect, zoom = 1, pan = { x: 0, y: 0 }) => {
    return {
        x: imagePoint.x * zoom + imageRect.left + pan.x,
        y: imagePoint.y * zoom + imageRect.top + pan.y,
    };
};

/**
 * Convert annotation coordinates to percentage (for storage)
 */
export const toPercentCoords = (annotation, imageDimensions) => {
    const { width: imgW, height: imgH } = imageDimensions;

    if (annotation.type === ShapeTypes.POLYGON) {
        return {
            ...annotation,
            points: annotation.points.map(p => ({
                x: (p.x / imgW) * 100,
                y: (p.y / imgH) * 100,
            })),
        };
    }

    return {
        ...annotation,
        x: (annotation.x / imgW) * 100,
        y: (annotation.y / imgH) * 100,
        width: (annotation.width / imgW) * 100,
        height: (annotation.height / imgH) * 100,
    };
};

/**
 * Convert percentage coordinates to pixels
 */
export const fromPercentCoords = (annotation, imageDimensions) => {
    const { width: imgW, height: imgH } = imageDimensions;

    if (annotation.type === ShapeTypes.POLYGON) {
        return {
            ...annotation,
            points: annotation.points.map(p => ({
                x: (p.x / 100) * imgW,
                y: (p.y / 100) * imgH,
            })),
        };
    }

    return {
        ...annotation,
        x: (annotation.x / 100) * imgW,
        y: (annotation.y / 100) * imgH,
        width: (annotation.width / 100) * imgW,
        height: (annotation.height / 100) * imgH,
    };
};

// --- Export Format ---

/**
 * Export annotations to JSON format
 */
export const exportAnnotationsToJSON = (annotations, imageInfo) => {
    return {
        version: '1.0',
        image: {
            id: imageInfo.id,
            filename: imageInfo.filename,
            width: imageInfo.width,
            height: imageInfo.height,
        },
        annotations: annotations.map(ann => ({
            id: ann.id,
            type: ann.type,
            label: ann.label?.id || ann.label,
            labelName: ann.label?.name || ann.label,
            color: ann.label?.color,
            groupId: ann.groupId || null,
            description: ann.description || '',
            confidence: ann.confidence || null,
            createdAt: ann.createdAt,
            // Coordinates in percentage
            coords: ann.type === ShapeTypes.POLYGON
                ? { points: ann.points }
                : { x: ann.x, y: ann.y, width: ann.width, height: ann.height },
        })),
        exportedAt: new Date().toISOString(),
    };
};

/**
 * Import annotations from JSON format
 */
export const importAnnotationsFromJSON = (json) => {
    if (!json || !json.annotations) return [];

    return json.annotations.map(ann => {
        const baseAnn = {
            id: ann.id,
            type: ann.type,
            label: typeof ann.label === 'object' ? ann.label : {
                id: ann.label,
                name: ann.labelName || ann.label,
                color: ann.color || '#EF4444',
            },
            groupId: ann.groupId,
            description: ann.description,
            confidence: ann.confidence,
            createdAt: ann.createdAt,
        };

        if (ann.type === ShapeTypes.POLYGON) {
            return {
                ...baseAnn,
                points: ann.coords.points,
            };
        }

        return {
            ...baseAnn,
            ...ann.coords,
        };
    });
};

// --- Validation ---

/**
 * Validate annotation has minimum requirements
 */
export const isValidAnnotation = (annotation) => {
    if (!annotation || !annotation.type) return false;

    switch (annotation.type) {
        case ShapeTypes.RECTANGLE:
        case ShapeTypes.ELLIPSE:
            // Use Math.abs since width/height can be negative during drawing
            return Math.abs(annotation.width) >= 5 && Math.abs(annotation.height) >= 5;
        case ShapeTypes.POLYGON:
            return annotation.points && annotation.points.length >= 3;
        default:
            return false;
    }
};

/**
 * Normalize annotation coordinates (ensure positive width/height for rect/ellipse)
 */
export const normalizeAnnotation = (annotation) => {
    if (!annotation) return annotation;

    if (annotation.type === ShapeTypes.RECTANGLE || annotation.type === ShapeTypes.ELLIPSE) {
        const normalized = normalizeRect(annotation);
        return { ...annotation, ...normalized };
    }

    return annotation;
};
