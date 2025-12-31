// src/components/annotation/index.js
/**
 * Annotation Components
 * 
 * Export all annotation-related components and utilities.
 */

export { default as ImageAnnotator } from './ImageAnnotator';
export { default as AnnotationToolbar } from './AnnotationToolbar';
export { default as LabelsPanel } from './LabelsPanel';
export { default as SVGAnnotationLayer } from './SVGAnnotationLayer';
export { default as AnnotationModal } from './AnnotationModal';

// Re-export context and types
export {
    AnnotationProvider,
    useAnnotation,
    ShapeTypes,
    ToolTypes,
    DefaultLabels,
} from '../../context/AnnotationContext';

// Re-export utilities
export * from '../../utils/annotationHelpers';
