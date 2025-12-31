import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { showToast } from '../utils/alert';

export const useImageAnnotations = (selectedImage, t) => {

    // Annotation State
    const [annotations, setAnnotations] = useState([]);
    const [annotationMode, setAnnotationMode] = useState(false); // If we want to toggle an edit mode
    const [showAnnotations, setShowAnnotations] = useState(true);
    const [crop, setCrop] = useState(null);
    const [annotationType, setAnnotationType] = useState('manipulation');
    const [groupId, setGroupId] = useState(1);
    const [annotationText, setAnnotationText] = useState('');
    const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
    const [copiedAnnotation, setCopiedAnnotation] = useState(null);

    // Fetch annotations when image changes
    useEffect(() => {
        if (!selectedImage) {
            setAnnotations([]);
            return;
        }

        const fetchAnnotations = async () => {
            try {
                const data = await api.getSingleAnnotations(selectedImage.id);
                setAnnotations(data || []);

                // Determine next group ID
                if (data && data.length > 0) {
                    const maxGroup = data
                        .filter(a => a.type === 'copy-move')
                        .reduce((max, a) => (a.group_id > max ? a.group_id : max), 0);
                    if (maxGroup > 0) setGroupId(maxGroup + 1);
                }
            } catch (err) {
                console.error('Error fetching annotations:', err);
                setAnnotations([]);
            }
        };

        fetchAnnotations();
        // Reset local state
        setCrop(null);
        setSelectedAnnotationId(null);
        setAnnotationText('');
    }, [selectedImage]);

    // Keyboard shortcuts (Copy/Paste) for Annotations
    useEffect(() => {
        // If we want to restrict copy/paste to a specific mode, we can check annotationMode here
        // For now, I'll keep it as in the original code, but maybe check if annotations are visible?
        // Original checked `if (!annotationMode) return;` but `annotationMode` was hardcoded to `false` in state initialization: `const [annotationMode] = useState(false);`
        // Wait, if it was false, the effect would never run?
        // Ah, looking at the code: `const [annotationMode] = useState(false);` ... `if (!annotationMode) return;`
        // So the copy/paste logic was actually DISABLED in the original code unless I missed where it was set to true?
        // Or maybe strictly speaking `state` usually implies `useState(initial)`.
        // Let's assume we WANT it to work. or maybe it was intended to be enabled by a button.
        // I will expose `annotationMode` and `setAnnotationMode` so it can be enabled.

        if (!selectedImage) return;

        const handleKeyDown = async (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            // Copy: Ctrl+C
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                if (crop && crop.width > 0) {
                    const info = {
                        coords: crop,
                        type: annotationType,
                        group_id: groupId,
                        text: annotationText
                    };
                    setCopiedAnnotation(info);
                    showToast(t('common.copied') || 'Copied!', 'success');
                } else if (selectedAnnotationId) {
                    const existing = annotations.find(a => a._id === selectedAnnotationId);
                    if (existing) {
                        const info = {
                            coords: existing.coords,
                            type: existing.type,
                            group_id: existing.group_id,
                            text: existing.text
                        };
                        setCopiedAnnotation(info);
                        showToast(t('common.copied') || 'Copied!', 'success');
                    }
                }
            }

            // Paste: Ctrl+V
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                if (copiedAnnotation) {
                    e.preventDefault();
                    const offset = 2; // % offset
                    const copyCoords = copiedAnnotation.coords || {};
                    const newCoords = {
                        ...copyCoords,
                        x: Math.min((copyCoords.x || 0) + offset, 100 - (copyCoords.width || 0)),
                        y: Math.min((copyCoords.y || 0) + offset, 100 - (copyCoords.height || 0)),
                        width: copyCoords.width || 0,
                        height: copyCoords.height || 0
                    };

                    const payload = {
                        image_id: selectedImage.id,
                        text: copiedAnnotation.text,
                        coords: newCoords,
                        type: copiedAnnotation.type,
                        group_id: copiedAnnotation.type === 'copy-move' ? copiedAnnotation.group_id : null
                    };

                    try {
                        const saved = await api.createSingleAnnotation(payload);
                        const newAnno = { ...saved, ...payload, _id: saved._id || saved.id };
                        setAnnotations(prev => [...prev, newAnno]);

                        // Select pasted
                        setCrop(newCoords);
                        setSelectedAnnotationId(newAnno._id);
                        setAnnotationType(newAnno.type);
                        if (newAnno.group_id) setGroupId(newAnno.group_id);
                        setAnnotationText(newAnno.text || '');

                        showToast(t('common.pasted') || 'Pasted!', 'success');
                    } catch (err) {
                        console.error('Error pasting annotation:', err);
                        showToast(t('analysis.error'), 'error');
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedImage, crop, selectedAnnotationId, copiedAnnotation, annotationType, groupId, annotationText, annotations, t]);

    const handleAnnotationClick = useCallback((anno) => {
        // if (!annotationMode) return; // See note above about annotationMode
        setSelectedAnnotationId(anno._id);
        setAnnotationText(anno.text || '');
        setAnnotationType(anno.type);
        if (anno.group_id) setGroupId(anno.group_id);
        setCrop(anno.coords);
    }, []);

    return useMemo(() => ({
        annotations,
        setAnnotations,
        showAnnotations,
        setShowAnnotations,
        crop,
        setCrop,
        selectedAnnotationId,
        handleAnnotationClick,
        annotationMode, // Exposed in case we want to toggle
        setAnnotationMode
    }), [
        annotations,
        showAnnotations,
        crop,
        selectedAnnotationId,
        handleAnnotationClick,
        annotationMode
    ]);
};
