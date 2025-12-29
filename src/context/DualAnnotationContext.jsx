// src/context/DualAnnotationContext.jsx
/**
 * Dual Annotation Context
 * 
 * Extended context for dual-image annotation with cross-image linking.
 * Manages annotations for both left (selected) and right (candidate) images
 * with support for linked annotation pairs.
 */
import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { ShapeTypes, ToolTypes, DefaultLabels } from './AnnotationContext';

// Re-export for convenience
export { ShapeTypes, ToolTypes, DefaultLabels };

// Generate unique IDs
const generateId = () => `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateLinkId = () => `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// --- Initial State ---
const initialState = {
    // Images
    leftImage: null,  // { id, url, filename, dimensions: { width, height } }
    rightImage: null,

    // Annotations for each side
    leftAnnotations: [],
    rightAnnotations: [],

    // Linked pairs: [{ linkId, leftAnnotationId, rightAnnotationId, color }]
    linkedPairs: [],

    // Which side is active for drawing
    activeSide: 'left', // 'left' | 'right'

    // Selection (side-aware)
    selectedId: null,
    selectedSide: null,
    hoveredId: null,
    hoveredSide: null,

    // Tool state (shared)
    activeTool: ToolTypes.SELECT,
    activeLabel: DefaultLabels[0],
    availableLabels: DefaultLabels,

    // Drawing state
    isDrawing: false,
    currentShape: null,

    // Linking mode
    isLinkingMode: false,
    pendingLinkAnnotation: null, // { id, side } - first annotation selected for linking

    // History for undo/redo
    history: [],
    historyIndex: -1,

    // Group ID for copy-move pairs
    nextGroupId: 1,
    nextLinkColorIndex: 0,

    // UI state
    isModified: false,
    bottomPanelExpanded: true,
    toolbarExpanded: true,
};

// Link colors for visual distinction
const LINK_COLORS = [
    '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

// --- Action Types ---
const ActionTypes = {
    // Images
    SET_LEFT_IMAGE: 'SET_LEFT_IMAGE',
    SET_RIGHT_IMAGE: 'SET_RIGHT_IMAGE',
    CLEAR_RIGHT_IMAGE: 'CLEAR_RIGHT_IMAGE',

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
    SET_ACTIVE_SIDE: 'SET_ACTIVE_SIDE',

    // Tools
    SET_TOOL: 'SET_TOOL',
    SET_ACTIVE_LABEL: 'SET_ACTIVE_LABEL',

    // Drawing
    START_DRAWING: 'START_DRAWING',
    UPDATE_DRAWING: 'UPDATE_DRAWING',
    FINISH_DRAWING: 'FINISH_DRAWING',
    CANCEL_DRAWING: 'CANCEL_DRAWING',
    ADD_POLYGON_POINT: 'ADD_POLYGON_POINT',

    // Linking
    START_LINKING: 'START_LINKING',
    COMPLETE_LINKING: 'COMPLETE_LINKING',
    CANCEL_LINKING: 'CANCEL_LINKING',
    DELETE_LINK: 'DELETE_LINK',

    // History
    UNDO: 'UNDO',
    REDO: 'REDO',

    // UI
    TOGGLE_BOTTOM_PANEL: 'TOGGLE_BOTTOM_PANEL',
    TOGGLE_TOOLBAR: 'TOGGLE_TOOLBAR',
    SET_MODIFIED: 'SET_MODIFIED',
    RESET: 'RESET',
};

// --- Helper Functions ---
const cloneAnnotations = (annotations) =>
    annotations.map(ann => ({ ...ann, points: ann.points ? [...ann.points.map(p => ({ ...p }))] : undefined }));

const pushToHistory = (state) => {
    const snapshot = {
        leftAnnotations: cloneAnnotations(state.leftAnnotations),
        rightAnnotations: cloneAnnotations(state.rightAnnotations),
        linkedPairs: [...state.linkedPairs],
    };

    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(snapshot);

    if (newHistory.length > 50) {
        newHistory.shift();
    }

    return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
    };
};

// --- Reducer ---
const dualAnnotationReducer = (state, action) => {
    switch (action.type) {
        // --- Images ---
        case ActionTypes.SET_LEFT_IMAGE:
            return {
                ...state,
                leftImage: action.payload,
                leftAnnotations: [],
                selectedId: null,
                selectedSide: null,
            };

        case ActionTypes.SET_RIGHT_IMAGE:
            return {
                ...state,
                rightImage: action.payload,
                rightAnnotations: [],
                // Gallery stays visible - user can manually collapse it
            };

        case ActionTypes.CLEAR_RIGHT_IMAGE:
            return {
                ...state,
                rightImage: null,
                rightAnnotations: [],
                linkedPairs: [], // Clear all links
                bottomPanelExpanded: true,
            };

        // --- Annotations ---
        case ActionTypes.SET_ANNOTATIONS: {
            const { side, annotations } = action.payload;
            const key = side === 'left' ? 'leftAnnotations' : 'rightAnnotations';
            return {
                ...state,
                [key]: annotations,
                ...pushToHistory({ ...state, [key]: annotations }),
            };
        }

        case ActionTypes.ADD_ANNOTATION: {
            const { side, annotation } = action.payload;
            const key = side === 'left' ? 'leftAnnotations' : 'rightAnnotations';
            const newAnnotations = [...state[key], annotation];
            return {
                ...state,
                [key]: newAnnotations,
                selectedId: annotation.id,
                selectedSide: side,
                isModified: true,
                ...pushToHistory({ ...state, [key]: newAnnotations }),
            };
        }

        case ActionTypes.UPDATE_ANNOTATION: {
            const { side, annotation } = action.payload;
            const key = side === 'left' ? 'leftAnnotations' : 'rightAnnotations';
            const newAnnotations = state[key].map(ann =>
                ann.id === annotation.id ? { ...ann, ...annotation } : ann
            );
            return {
                ...state,
                [key]: newAnnotations,
                isModified: true,
            };
        }

        case ActionTypes.DELETE_ANNOTATION: {
            const { side, id } = action.payload;
            const key = side === 'left' ? 'leftAnnotations' : 'rightAnnotations';
            const newAnnotations = state[key].filter(ann => ann.id !== id);

            // Also remove any linked pairs involving this annotation
            const linkedPairs = state.linkedPairs.filter(lp =>
                (side === 'left' ? lp.leftAnnotationId : lp.rightAnnotationId) !== id
            );

            return {
                ...state,
                [key]: newAnnotations,
                linkedPairs,
                selectedId: state.selectedId === id ? null : state.selectedId,
                selectedSide: state.selectedId === id ? null : state.selectedSide,
                isModified: true,
                ...pushToHistory({ ...state, [key]: newAnnotations, linkedPairs }),
            };
        }

        case ActionTypes.DELETE_SELECTED: {
            if (!state.selectedId || !state.selectedSide) return state;
            const key = state.selectedSide === 'left' ? 'leftAnnotations' : 'rightAnnotations';
            const newAnnotations = state[key].filter(ann => ann.id !== state.selectedId);

            const linkedPairs = state.linkedPairs.filter(lp =>
                (state.selectedSide === 'left' ? lp.leftAnnotationId : lp.rightAnnotationId) !== state.selectedId
            );

            return {
                ...state,
                [key]: newAnnotations,
                linkedPairs,
                selectedId: null,
                selectedSide: null,
                isModified: true,
                ...pushToHistory({ ...state, [key]: newAnnotations, linkedPairs }),
            };
        }

        // --- Selection ---
        case ActionTypes.SELECT_ANNOTATION:
            return {
                ...state,
                selectedId: action.payload.id,
                selectedSide: action.payload.side,
                activeTool: ToolTypes.SELECT,
            };

        case ActionTypes.HOVER_ANNOTATION:
            return {
                ...state,
                hoveredId: action.payload?.id || null,
                hoveredSide: action.payload?.side || null,
            };

        case ActionTypes.CLEAR_SELECTION:
            return { ...state, selectedId: null, selectedSide: null };

        case ActionTypes.SET_ACTIVE_SIDE:
            return { ...state, activeSide: action.payload };

        // --- Tools ---
        case ActionTypes.SET_TOOL:
            return {
                ...state,
                activeTool: action.payload,
                selectedId: action.payload !== ToolTypes.SELECT ? null : state.selectedId,
                selectedSide: action.payload !== ToolTypes.SELECT ? null : state.selectedSide,
                isDrawing: false,
                currentShape: null,
                isLinkingMode: false,
                pendingLinkAnnotation: null,
            };

        case ActionTypes.SET_ACTIVE_LABEL:
            return { ...state, activeLabel: action.payload };

        // --- Drawing ---
        case ActionTypes.START_DRAWING:
            return {
                ...state,
                isDrawing: true,
                currentShape: action.payload.shape,
                activeSide: action.payload.side,
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

            // Normalize shape
            let normalizedShape = { ...state.currentShape };
            if (normalizedShape.type === ShapeTypes.RECTANGLE || normalizedShape.type === ShapeTypes.ELLIPSE) {
                let { x, y, width, height } = normalizedShape;
                if (width < 0) { x += width; width = Math.abs(width); }
                if (height < 0) { y += height; height = Math.abs(height); }
                normalizedShape = { ...normalizedShape, x, y, width, height };
            }

            const newAnnotation = {
                ...normalizedShape,
                id: generateId(),
                label: state.activeLabel,
                createdAt: new Date().toISOString(),
            };

            const key = state.activeSide === 'left' ? 'leftAnnotations' : 'rightAnnotations';
            const newAnnotations = [...state[key], newAnnotation];

            return {
                ...state,
                [key]: newAnnotations,
                isDrawing: false,
                currentShape: null,
                selectedId: newAnnotation.id,
                selectedSide: state.activeSide,
                activeTool: ToolTypes.SELECT,
                isModified: true,
                ...pushToHistory({ ...state, [key]: newAnnotations }),
            };
        }

        case ActionTypes.CANCEL_DRAWING:
            return {
                ...state,
                isDrawing: false,
                currentShape: null,
            };

        // --- Linking ---
        case ActionTypes.START_LINKING:
            return {
                ...state,
                isLinkingMode: true,
                pendingLinkAnnotation: action.payload, // { id, side }
            };

        case ActionTypes.COMPLETE_LINKING: {
            if (!state.pendingLinkAnnotation) return state;

            const { id: secondId, side: secondSide } = action.payload;
            const { id: firstId, side: firstSide } = state.pendingLinkAnnotation;

            // Must be from different sides
            if (firstSide === secondSide) return state;

            const linkId = generateLinkId();
            const color = LINK_COLORS[state.nextLinkColorIndex % LINK_COLORS.length];

            const newLink = {
                linkId,
                leftAnnotationId: firstSide === 'left' ? firstId : secondId,
                rightAnnotationId: firstSide === 'right' ? firstId : secondId,
                color,
            };

            return {
                ...state,
                linkedPairs: [...state.linkedPairs, newLink],
                isLinkingMode: false,
                pendingLinkAnnotation: null,
                nextLinkColorIndex: state.nextLinkColorIndex + 1,
                isModified: true,
                ...pushToHistory({ ...state, linkedPairs: [...state.linkedPairs, newLink] }),
            };
        }

        case ActionTypes.CANCEL_LINKING:
            return {
                ...state,
                isLinkingMode: false,
                pendingLinkAnnotation: null,
            };

        case ActionTypes.DELETE_LINK: {
            const linkedPairs = state.linkedPairs.filter(lp => lp.linkId !== action.payload);
            return {
                ...state,
                linkedPairs,
                isModified: true,
                ...pushToHistory({ ...state, linkedPairs }),
            };
        }

        // --- History ---
        case ActionTypes.UNDO: {
            if (state.historyIndex <= 0) return state;
            const newIndex = state.historyIndex - 1;
            const snapshot = state.history[newIndex];
            return {
                ...state,
                leftAnnotations: cloneAnnotations(snapshot.leftAnnotations),
                rightAnnotations: cloneAnnotations(snapshot.rightAnnotations),
                linkedPairs: [...snapshot.linkedPairs],
                historyIndex: newIndex,
                selectedId: null,
                selectedSide: null,
                isModified: true,
            };
        }

        case ActionTypes.REDO: {
            if (state.historyIndex >= state.history.length - 1) return state;
            const newIndex = state.historyIndex + 1;
            const snapshot = state.history[newIndex];
            return {
                ...state,
                leftAnnotations: cloneAnnotations(snapshot.leftAnnotations),
                rightAnnotations: cloneAnnotations(snapshot.rightAnnotations),
                linkedPairs: [...snapshot.linkedPairs],
                historyIndex: newIndex,
                selectedId: null,
                selectedSide: null,
                isModified: true,
            };
        }

        // --- UI ---
        case ActionTypes.TOGGLE_BOTTOM_PANEL:
            return { ...state, bottomPanelExpanded: !state.bottomPanelExpanded };

        case ActionTypes.TOGGLE_TOOLBAR:
            return { ...state, toolbarExpanded: !state.toolbarExpanded };

        case ActionTypes.SET_MODIFIED:
            return { ...state, isModified: action.payload };

        case ActionTypes.RESET:
            return { ...initialState };

        default:
            return state;
    }
};

// --- Context ---
const DualAnnotationContext = createContext(null);

// --- Provider ---
export const DualAnnotationProvider = ({ children }) => {
    const [state, dispatch] = useReducer(dualAnnotationReducer, initialState);

    // Action creators
    const setLeftImage = useCallback((image) => {
        dispatch({ type: ActionTypes.SET_LEFT_IMAGE, payload: image });
    }, []);

    const setRightImage = useCallback((image) => {
        dispatch({ type: ActionTypes.SET_RIGHT_IMAGE, payload: image });
    }, []);

    const clearRightImage = useCallback(() => {
        dispatch({ type: ActionTypes.CLEAR_RIGHT_IMAGE });
    }, []);

    const setAnnotations = useCallback((side, annotations) => {
        dispatch({ type: ActionTypes.SET_ANNOTATIONS, payload: { side, annotations } });
    }, []);

    const addAnnotation = useCallback((side, annotation) => {
        dispatch({ type: ActionTypes.ADD_ANNOTATION, payload: { side, annotation } });
    }, []);

    const updateAnnotation = useCallback((side, annotation) => {
        dispatch({ type: ActionTypes.UPDATE_ANNOTATION, payload: { side, annotation } });
    }, []);

    const deleteAnnotation = useCallback((side, id) => {
        dispatch({ type: ActionTypes.DELETE_ANNOTATION, payload: { side, id } });
    }, []);

    const deleteSelected = useCallback(() => {
        dispatch({ type: ActionTypes.DELETE_SELECTED });
    }, []);

    const selectAnnotation = useCallback((id, side) => {
        dispatch({ type: ActionTypes.SELECT_ANNOTATION, payload: { id, side } });
    }, []);

    const hoverAnnotation = useCallback((id, side) => {
        dispatch({ type: ActionTypes.HOVER_ANNOTATION, payload: id ? { id, side } : null });
    }, []);

    const clearSelection = useCallback(() => {
        dispatch({ type: ActionTypes.CLEAR_SELECTION });
    }, []);

    const setActiveSide = useCallback((side) => {
        dispatch({ type: ActionTypes.SET_ACTIVE_SIDE, payload: side });
    }, []);

    const setTool = useCallback((tool) => {
        dispatch({ type: ActionTypes.SET_TOOL, payload: tool });
    }, []);

    const setActiveLabel = useCallback((label) => {
        dispatch({ type: ActionTypes.SET_ACTIVE_LABEL, payload: label });
    }, []);

    const startDrawing = useCallback((side, shape) => {
        dispatch({ type: ActionTypes.START_DRAWING, payload: { side, shape } });
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

    const startLinking = useCallback((id, side) => {
        dispatch({ type: ActionTypes.START_LINKING, payload: { id, side } });
    }, []);

    const completeLink = useCallback((id, side) => {
        dispatch({ type: ActionTypes.COMPLETE_LINKING, payload: { id, side } });
    }, []);

    const cancelLinking = useCallback(() => {
        dispatch({ type: ActionTypes.CANCEL_LINKING });
    }, []);

    const deleteLink = useCallback((linkId) => {
        dispatch({ type: ActionTypes.DELETE_LINK, payload: linkId });
    }, []);

    const undo = useCallback(() => {
        dispatch({ type: ActionTypes.UNDO });
    }, []);

    const redo = useCallback(() => {
        dispatch({ type: ActionTypes.REDO });
    }, []);

    const toggleBottomPanel = useCallback(() => {
        dispatch({ type: ActionTypes.TOGGLE_BOTTOM_PANEL });
    }, []);

    const toggleToolbar = useCallback(() => {
        dispatch({ type: ActionTypes.TOGGLE_TOOLBAR });
    }, []);

    const setModified = useCallback((modified) => {
        dispatch({ type: ActionTypes.SET_MODIFIED, payload: modified });
    }, []);

    const reset = useCallback(() => {
        dispatch({ type: ActionTypes.RESET });
    }, []);

    // Memoized actions object
    const actions = useMemo(() => ({
        setLeftImage,
        setRightImage,
        clearRightImage,
        setAnnotations,
        addAnnotation,
        updateAnnotation,
        deleteAnnotation,
        deleteSelected,
        selectAnnotation,
        hoverAnnotation,
        clearSelection,
        setActiveSide,
        setTool,
        setActiveLabel,
        startDrawing,
        updateDrawing,
        addPolygonPoint,
        finishDrawing,
        cancelDrawing,
        startLinking,
        completeLink,
        cancelLinking,
        deleteLink,
        undo,
        redo,
        toggleBottomPanel,
        toggleToolbar,
        setModified,
        reset,
    }), [
        setLeftImage, setRightImage, clearRightImage, setAnnotations, addAnnotation,
        updateAnnotation, deleteAnnotation, deleteSelected, selectAnnotation, hoverAnnotation,
        clearSelection, setActiveSide, setTool, setActiveLabel, startDrawing, updateDrawing,
        addPolygonPoint, finishDrawing, cancelDrawing, startLinking, completeLink, cancelLinking,
        deleteLink, undo, redo, toggleBottomPanel, toggleToolbar, setModified, reset,
    ]);

    // Computed values
    const computed = useMemo(() => ({
        canUndo: state.historyIndex > 0,
        canRedo: state.historyIndex < state.history.length - 1,
        selectedAnnotation: state.selectedSide === 'left'
            ? state.leftAnnotations.find(a => a.id === state.selectedId)
            : state.rightAnnotations.find(a => a.id === state.selectedId),
        leftAnnotationCount: state.leftAnnotations.length,
        rightAnnotationCount: state.rightAnnotations.length,
        linkedPairCount: state.linkedPairs.length,
        isDrawingPolygon: state.isDrawing && state.currentShape?.type === ShapeTypes.POLYGON,
        hasRightImage: !!state.rightImage,
        getLinkForAnnotation: (id, side) => {
            return state.linkedPairs.find(lp =>
                (side === 'left' && lp.leftAnnotationId === id) ||
                (side === 'right' && lp.rightAnnotationId === id)
            );
        },
    }), [state]);

    return (
        <DualAnnotationContext.Provider value={{ state, actions, computed }}>
            {children}
        </DualAnnotationContext.Provider>
    );
};

// --- Hook ---
export const useDualAnnotation = () => {
    const context = useContext(DualAnnotationContext);
    if (!context) {
        throw new Error('useDualAnnotation must be used within a DualAnnotationProvider');
    }
    return context;
};

export { generateId, generateLinkId };
