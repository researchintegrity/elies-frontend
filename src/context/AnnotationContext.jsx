// src/context/AnnotationContext.jsx
/**
 * Annotation Context
 * 
 * A React Context-based state management solution for image annotations.
 * Provides undo/redo capability, shape operations, and centralized state.
 * 
 * Inspired by Label Studio's annotation workflow.
 */
import React, { createContext, useContext, useReducer, useCallback, useRef, useMemo } from 'react';

// --- Types & Constants ---

export const ShapeTypes = {
    RECTANGLE: 'rectangle',
    ELLIPSE: 'ellipse',
    POLYGON: 'polygon',
};

export const ToolTypes = {
    SELECT: 'select',
    RECTANGLE: 'rectangle',
    ELLIPSE: 'ellipse',
    POLYGON: 'polygon',
    DELETE: 'delete',
};

// Default label options
export const DefaultLabels = [
    { id: 'manipulation', name: 'Manipulation', color: '#EF4444' },  // Red
    { id: 'copy-move', name: 'Copy-Move', color: '#3B82F6' },        // Blue
    { id: 'splicing', name: 'Splicing', color: '#10B981' },          // Green
    { id: 'inpainting', name: 'Inpainting', color: '#F59E0B' },      // Amber
    { id: 'enhancement', name: 'Enhancement', color: '#8B5CF6' },    // Purple
    { id: 'generation', name: 'AI Generated', color: '#EC4899' },    // Pink
];

// --- Initial State ---

const initialState = {
    // Current annotations
    annotations: [],
    
    // Selection
    selectedId: null,
    hoveredId: null,
    
    // Tool state
    activeTool: ToolTypes.SELECT,
    
    // Drawing state
    isDrawing: false,
    currentShape: null,
    
    // Labels
    availableLabels: DefaultLabels,
    activeLabel: DefaultLabels[0],
    
    // History for undo/redo
    history: [],
    historyIndex: -1,
    
    // Image reference
    imageId: null,
    imageDimensions: { width: 0, height: 0 },
    
    // Group management for copy-move pairs
    nextGroupId: 1,
    
    // Zoom & Pan
    zoom: 1,
    pan: { x: 0, y: 0 },
    
    // UI flags
    showLabelsPanel: true,
    isModified: false,
};

// --- Action Types ---

const ActionTypes = {
    // Annotations
    SET_ANNOTATIONS: 'SET_ANNOTATIONS',
    ADD_ANNOTATION: 'ADD_ANNOTATION',
    UPDATE_ANNOTATION: 'UPDATE_ANNOTATION',
    DELETE_ANNOTATION: 'DELETE_ANNOTATION',
    DELETE_SELECTED: 'DELETE_SELECTED',
    
    // Selection
    SELECT_ANNOTATION: 'SELECT_ANNOTATION',
    HOVER_ANNOTATION: 'HOVER_ANNOTATION',
    CLEAR_SELECTION: 'CLEAR_SELECTION',
    
    // Tools
    SET_TOOL: 'SET_TOOL',
    SET_ACTIVE_LABEL: 'SET_ACTIVE_LABEL',
    
    // Drawing
    START_DRAWING: 'START_DRAWING',
    UPDATE_DRAWING: 'UPDATE_DRAWING',
    FINISH_DRAWING: 'FINISH_DRAWING',
    CANCEL_DRAWING: 'CANCEL_DRAWING',
    ADD_POLYGON_POINT: 'ADD_POLYGON_POINT',
    
    // History
    UNDO: 'UNDO',
    REDO: 'REDO',
    PUSH_HISTORY: 'PUSH_HISTORY',
    
    // Image
    SET_IMAGE: 'SET_IMAGE',
    SET_IMAGE_DIMENSIONS: 'SET_IMAGE_DIMENSIONS',
    
    // Labels
    SET_LABELS: 'SET_LABELS',
    ADD_LABEL: 'ADD_LABEL',
    
    // Groups
    SET_NEXT_GROUP_ID: 'SET_NEXT_GROUP_ID',
    
    // View
    SET_ZOOM: 'SET_ZOOM',
    SET_PAN: 'SET_PAN',
    TOGGLE_LABELS_PANEL: 'TOGGLE_LABELS_PANEL',
    
    // State
    RESET: 'RESET',
    SET_MODIFIED: 'SET_MODIFIED',
};

// --- Helper Functions ---

const generateId = () => `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const cloneAnnotations = (annotations) => 
    annotations.map(ann => ({ ...ann, points: ann.points ? [...ann.points.map(p => ({ ...p }))] : undefined }));

const pushToHistory = (state) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(cloneAnnotations(state.annotations));
    
    // Limit history size
    if (newHistory.length > 50) {
        newHistory.shift();
    }
    
    return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
    };
};

// --- Reducer ---

const annotationReducer = (state, action) => {
    switch (action.type) {
        case ActionTypes.SET_ANNOTATIONS:
            return {
                ...state,
                annotations: action.payload,
                selectedId: null,
                ...pushToHistory({ ...state, annotations: action.payload }),
            };
            
        case ActionTypes.ADD_ANNOTATION: {
            const newAnnotations = [...state.annotations, action.payload];
            return {
                ...state,
                annotations: newAnnotations,
                selectedId: action.payload.id,
                isModified: true,
                ...pushToHistory({ ...state, annotations: newAnnotations }),
            };
        }
        
        case ActionTypes.UPDATE_ANNOTATION: {
            const newAnnotations = state.annotations.map(ann =>
                ann.id === action.payload.id ? { ...ann, ...action.payload } : ann
            );
            return {
                ...state,
                annotations: newAnnotations,
                isModified: true,
                ...pushToHistory({ ...state, annotations: newAnnotations }),
            };
        }
        
        case ActionTypes.DELETE_ANNOTATION: {
            const newAnnotations = state.annotations.filter(ann => ann.id !== action.payload);
            return {
                ...state,
                annotations: newAnnotations,
                selectedId: state.selectedId === action.payload ? null : state.selectedId,
                isModified: true,
                ...pushToHistory({ ...state, annotations: newAnnotations }),
            };
        }
        
        case ActionTypes.DELETE_SELECTED: {
            if (!state.selectedId) return state;
            const newAnnotations = state.annotations.filter(ann => ann.id !== state.selectedId);
            return {
                ...state,
                annotations: newAnnotations,
                selectedId: null,
                isModified: true,
                ...pushToHistory({ ...state, annotations: newAnnotations }),
            };
        }
        
        case ActionTypes.SELECT_ANNOTATION:
            return {
                ...state,
                selectedId: action.payload,
                activeTool: action.payload ? ToolTypes.SELECT : state.activeTool,
            };
            
        case ActionTypes.HOVER_ANNOTATION:
            return { ...state, hoveredId: action.payload };
            
        case ActionTypes.CLEAR_SELECTION:
            return { ...state, selectedId: null };
            
        case ActionTypes.SET_TOOL:
            return {
                ...state,
                activeTool: action.payload,
                selectedId: action.payload !== ToolTypes.SELECT ? null : state.selectedId,
                isDrawing: false,
                currentShape: null,
            };
            
        case ActionTypes.SET_ACTIVE_LABEL:
            return { ...state, activeLabel: action.payload };
            
        case ActionTypes.START_DRAWING:
            return {
                ...state,
                isDrawing: true,
                currentShape: action.payload,
            };
            
        case ActionTypes.UPDATE_DRAWING:
            return {
                ...state,
                currentShape: { ...state.currentShape, ...action.payload },
            };
            
        case ActionTypes.ADD_POLYGON_POINT:
            if (!state.currentShape || state.currentShape.type !== ShapeTypes.POLYGON) {
                return state;
            }
            return {
                ...state,
                currentShape: {
                    ...state.currentShape,
                    points: [...(state.currentShape.points || []), action.payload],
                },
            };
            
        case ActionTypes.FINISH_DRAWING: {
            if (!state.currentShape) return state;
            
            // Normalize the shape (ensure positive width/height)
            let normalizedShape = { ...state.currentShape };
            if (normalizedShape.type === ShapeTypes.RECTANGLE || normalizedShape.type === ShapeTypes.ELLIPSE) {
                let { x, y, width, height } = normalizedShape;
                if (width < 0) {
                    x += width;
                    width = Math.abs(width);
                }
                if (height < 0) {
                    y += height;
                    height = Math.abs(height);
                }
                normalizedShape = { ...normalizedShape, x, y, width, height };
            }
            
            const newAnnotation = {
                ...normalizedShape,
                id: generateId(),
                label: state.activeLabel,
                createdAt: new Date().toISOString(),
            };
            
            // For copy-move, assign group ID
            if (state.activeLabel.id === 'copy-move') {
                newAnnotation.groupId = state.nextGroupId;
            }
            
            const newAnnotations = [...state.annotations, newAnnotation];
            
            return {
                ...state,
                annotations: newAnnotations,
                isDrawing: false,
                currentShape: null,
                selectedId: newAnnotation.id,
                activeTool: ToolTypes.SELECT,
                isModified: true,
                ...pushToHistory({ ...state, annotations: newAnnotations }),
            };
        }
        
        case ActionTypes.CANCEL_DRAWING:
            return {
                ...state,
                isDrawing: false,
                currentShape: null,
            };
            
        case ActionTypes.UNDO: {
            if (state.historyIndex <= 0) return state;
            const newIndex = state.historyIndex - 1;
            return {
                ...state,
                annotations: cloneAnnotations(state.history[newIndex]),
                historyIndex: newIndex,
                selectedId: null,
                isModified: true,
            };
        }
        
        case ActionTypes.REDO: {
            if (state.historyIndex >= state.history.length - 1) return state;
            const newIndex = state.historyIndex + 1;
            return {
                ...state,
                annotations: cloneAnnotations(state.history[newIndex]),
                historyIndex: newIndex,
                selectedId: null,
                isModified: true,
            };
        }
        
        case ActionTypes.SET_IMAGE:
            return {
                ...state,
                imageId: action.payload.id,
                imageDimensions: action.payload.dimensions || state.imageDimensions,
                annotations: [],
                selectedId: null,
                history: [],
                historyIndex: -1,
                isModified: false,
            };
            
        case ActionTypes.SET_IMAGE_DIMENSIONS:
            return { ...state, imageDimensions: action.payload };
            
        case ActionTypes.SET_LABELS:
            return { ...state, availableLabels: action.payload };
            
        case ActionTypes.ADD_LABEL:
            return {
                ...state,
                availableLabels: [...state.availableLabels, action.payload],
            };
            
        case ActionTypes.SET_NEXT_GROUP_ID:
            return { ...state, nextGroupId: action.payload };
            
        case ActionTypes.SET_ZOOM:
            return { ...state, zoom: action.payload };
            
        case ActionTypes.SET_PAN:
            return { ...state, pan: action.payload };
            
        case ActionTypes.TOGGLE_LABELS_PANEL:
            return { ...state, showLabelsPanel: !state.showLabelsPanel };
            
        case ActionTypes.SET_MODIFIED:
            return { ...state, isModified: action.payload };
            
        case ActionTypes.RESET:
            return { ...initialState };
            
        default:
            return state;
    }
};

// --- Context ---

const AnnotationContext = createContext(null);

// --- Provider ---

export const AnnotationProvider = ({ children }) => {
    const [state, dispatch] = useReducer(annotationReducer, initialState);
    
    // Individual memoized action creators
    const setAnnotations = useCallback((annotations) => {
        dispatch({ type: ActionTypes.SET_ANNOTATIONS, payload: annotations });
    }, []);
    
    const addAnnotation = useCallback((annotation) => {
        dispatch({ type: ActionTypes.ADD_ANNOTATION, payload: annotation });
    }, []);
    
    const updateAnnotation = useCallback((annotation) => {
        dispatch({ type: ActionTypes.UPDATE_ANNOTATION, payload: annotation });
    }, []);
    
    const deleteAnnotation = useCallback((id) => {
        dispatch({ type: ActionTypes.DELETE_ANNOTATION, payload: id });
    }, []);
    
    const deleteSelected = useCallback(() => {
        dispatch({ type: ActionTypes.DELETE_SELECTED });
    }, []);
    
    const selectAnnotation = useCallback((id) => {
        dispatch({ type: ActionTypes.SELECT_ANNOTATION, payload: id });
    }, []);
    
    const hoverAnnotation = useCallback((id) => {
        dispatch({ type: ActionTypes.HOVER_ANNOTATION, payload: id });
    }, []);
    
    const clearSelection = useCallback(() => {
        dispatch({ type: ActionTypes.CLEAR_SELECTION });
    }, []);
    
    const setTool = useCallback((tool) => {
        dispatch({ type: ActionTypes.SET_TOOL, payload: tool });
    }, []);
    
    const setActiveLabel = useCallback((label) => {
        dispatch({ type: ActionTypes.SET_ACTIVE_LABEL, payload: label });
    }, []);
    
    const startDrawing = useCallback((shape) => {
        dispatch({ type: ActionTypes.START_DRAWING, payload: shape });
    }, []);
    
    const updateDrawing = useCallback((updates) => {
        dispatch({ type: ActionTypes.UPDATE_DRAWING, payload: updates });
    }, []);
    
    const addPolygonPoint = useCallback((point) => {
        dispatch({ type: ActionTypes.ADD_POLYGON_POINT, payload: point });
    }, []);
    
    const finishDrawing = useCallback(() => {
        dispatch({ type: ActionTypes.FINISH_DRAWING });
    }, []);
    
    const cancelDrawing = useCallback(() => {
        dispatch({ type: ActionTypes.CANCEL_DRAWING });
    }, []);
    
    const undo = useCallback(() => {
        dispatch({ type: ActionTypes.UNDO });
    }, []);
    
    const redo = useCallback(() => {
        dispatch({ type: ActionTypes.REDO });
    }, []);
    
    const setImage = useCallback((image) => {
        dispatch({ type: ActionTypes.SET_IMAGE, payload: image });
    }, []);
    
    const setImageDimensions = useCallback((dimensions) => {
        dispatch({ type: ActionTypes.SET_IMAGE_DIMENSIONS, payload: dimensions });
    }, []);
    
    const setLabels = useCallback((labels) => {
        dispatch({ type: ActionTypes.SET_LABELS, payload: labels });
    }, []);
    
    const addLabel = useCallback((label) => {
        dispatch({ type: ActionTypes.ADD_LABEL, payload: label });
    }, []);
    
    const setNextGroupId = useCallback((id) => {
        dispatch({ type: ActionTypes.SET_NEXT_GROUP_ID, payload: id });
    }, []);
    
    const incrementGroupId = useCallback(() => {
        dispatch({ type: ActionTypes.SET_NEXT_GROUP_ID, payload: state.nextGroupId + 1 });
    }, [state.nextGroupId]);
    
    const setZoom = useCallback((zoom) => {
        dispatch({ type: ActionTypes.SET_ZOOM, payload: zoom });
    }, []);
    
    const setPan = useCallback((pan) => {
        dispatch({ type: ActionTypes.SET_PAN, payload: pan });
    }, []);
    
    const toggleLabelsPanel = useCallback(() => {
        dispatch({ type: ActionTypes.TOGGLE_LABELS_PANEL });
    }, []);
    
    const setModified = useCallback((modified) => {
        dispatch({ type: ActionTypes.SET_MODIFIED, payload: modified });
    }, []);
    
    const reset = useCallback(() => {
        dispatch({ type: ActionTypes.RESET });
    }, []);
    
    // Memoize the actions object to prevent unnecessary re-renders
    const actions = useMemo(() => ({
        setAnnotations,
        addAnnotation,
        updateAnnotation,
        deleteAnnotation,
        deleteSelected,
        selectAnnotation,
        hoverAnnotation,
        clearSelection,
        setTool,
        setActiveLabel,
        startDrawing,
        updateDrawing,
        addPolygonPoint,
        finishDrawing,
        cancelDrawing,
        undo,
        redo,
        setImage,
        setImageDimensions,
        setLabels,
        addLabel,
        setNextGroupId,
        incrementGroupId,
        setZoom,
        setPan,
        toggleLabelsPanel,
        setModified,
        reset,
    }), [
        setAnnotations, addAnnotation, updateAnnotation, deleteAnnotation, deleteSelected,
        selectAnnotation, hoverAnnotation, clearSelection, setTool, setActiveLabel,
        startDrawing, updateDrawing, addPolygonPoint, finishDrawing, cancelDrawing,
        undo, redo, setImage, setImageDimensions, setLabels, addLabel,
        setNextGroupId, incrementGroupId, setZoom, setPan, toggleLabelsPanel,
        setModified, reset,
    ]);
    
    // Computed values
    const computed = {
        canUndo: state.historyIndex > 0,
        canRedo: state.historyIndex < state.history.length - 1,
        selectedAnnotation: state.annotations.find(a => a.id === state.selectedId),
        annotationCount: state.annotations.length,
        isDrawingPolygon: state.isDrawing && state.currentShape?.type === ShapeTypes.POLYGON,
    };
    
    return (
        <AnnotationContext.Provider value={{ state, actions, computed }}>
            {children}
        </AnnotationContext.Provider>
    );
};

// --- Hook ---

export const useAnnotation = () => {
    const context = useContext(AnnotationContext);
    if (!context) {
        throw new Error('useAnnotation must be used within an AnnotationProvider');
    }
    return context;
};

// --- Export utilities ---

export { generateId, ShapeTypes as SHAPE_TYPES };
