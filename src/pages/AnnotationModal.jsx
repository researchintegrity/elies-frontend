// src/components/AnnotationModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../config/api';
import { FiLoader, FiTrash2, FiSave, FiX, FiAlertTriangle, FiCopy, FiEdit2, FiLayers } from 'react-icons/fi';
import { useImageLoader } from '../components/common/ImageThumbnail';
import 'react-image-crop/dist/ReactCrop.css';

const AnnotationModal = ({ image, onClose }) => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [annotations, setAnnotations] = useState([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(true);
  const [errorAnnotations, setErrorAnnotations] = useState(null);

  // State for new annotation
  const [annotationType, setAnnotationType] = useState('manipulation'); // 'manipulation' | 'copy-move'
  const [groupId, setGroupId] = useState(1);

  // Load image blob
  const { imageUrl, loading: loadingImage, error: errorImage } = useImageLoader(image?.id);

  const imgRef = useRef(null);
  const [selection, setSelection] = useState(null);
  const [newAnnotationText, setNewAnnotationText] = useState('');
  const [copiedAnnotation, setCopiedAnnotation] = useState(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);

  // Helper for colors
  const getGroupColor = (type, id) => {
    if (type !== 'copy-move') return '#EF4444'; // Red for general manipulation
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Amber
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
    ];
    return colors[(id - 1) % colors.length] || '#3B82F6';
  };

  useEffect(() => {
    const fetchAnnotations = async () => {
      if (!image) return;
      setLoadingAnnotations(true);
      setErrorAnnotations(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/annotations?image_id=${image.id}`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch annotations');
        }

        const data = await response.json();
        setAnnotations(data);

        // Auto-increment group ID based on existing copy-move groups
        if (data.length > 0) {
          const maxGroup = data
            .filter(a => a.type === 'copy-move')
            .reduce((max, a) => (a.group_id > max ? a.group_id : max), 0);
          if (maxGroup > 0) setGroupId(maxGroup + 1);
        }
      } catch (err) {
        setErrorAnnotations(err.message);
      } finally {
        setLoadingAnnotations(false);
      }
    };

    fetchAnnotations();
  }, [image, token]);

  // Create annotation helper
  const createAnnotation = async (data) => {
    try {
      const response = await fetch(`${API_BASE_URL}/annotations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save annotation');
      const savedData = await response.json();

      // Merge sent data incase backend doesn't return it yet
      const finalAnnotation = {
        ...savedData,
        type: data.type,
        group_id: data.group_id
      };

      setAnnotations(prev => [...prev, finalAnnotation]);
      return finalAnnotation;
    } catch (err) {
      console.error('Error saving annotation:', err);
      return null;
    }
  };

  const handleDeleteAnnotation = async (annotationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/annotations/${annotationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to delete annotation');
      }

      setAnnotations(prev => prev.filter(a => a._id !== annotationId));
      if (selectedAnnotationId === annotationId) {
        setSelectedAnnotationId(null);
        setSelection(null);
        setNewAnnotationText('');
      }

    } catch (err) {
      console.error('Error deleting annotation:', err);
    }
  };

  const handleSaveAnnotation = async () => {
    if (!selection) return;

    const cleanCoords = {
      x: Number.isFinite(selection.x) ? selection.x : 0,
      y: Number.isFinite(selection.y) ? selection.y : 0,
      width: Number.isFinite(selection.width) ? selection.width : 0,
      height: Number.isFinite(selection.height) ? selection.height : 0,
    };

    const newAnnotation = {
      image_id: image.id,
      text: newAnnotationText,
      coords: cleanCoords,
      type: annotationType,
      group_id: annotationType === 'copy-move' ? parseInt(groupId) : null
    };

    // Update logic: Delete old, create new
    if (selectedAnnotationId) {
      await handleDeleteAnnotation(selectedAnnotationId);
    }

    const result = await createAnnotation(newAnnotation);
    if (result) {
      setNewAnnotationText('');
      setSelection(null);
      setSelectedAnnotationId(null);
    }
  };

  // Keyboard shortcuts (Copy/Paste)
  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      // Copy: Ctrl+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selection) {
          const info = {
            coords: selection,
            type: annotationType,
            group_id: groupId,
            text: newAnnotationText
          };
          setCopiedAnnotation(info);
          // Could add toast here
        }
      }

      // Paste: Ctrl+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (copiedAnnotation) {
          e.preventDefault();
          const offset = 2; // % offset
          const newCoords = {
            ...copiedAnnotation.coords,
            x: Math.min(copiedAnnotation.coords.x + offset, 100 - copiedAnnotation.coords.width),
            y: Math.min(copiedAnnotation.coords.y + offset, 100 - copiedAnnotation.coords.height),
          };

          const payload = {
            image_id: image.id,
            text: copiedAnnotation.text,
            coords: newCoords,
            type: copiedAnnotation.type,
            group_id: copiedAnnotation.type === 'copy-move' ? copiedAnnotation.group_id : null
          };

          const result = await createAnnotation(payload);

          // Select the pasted annotation for immediate editing
          if (result) {
            setSelection(newCoords);
            setSelectedAnnotationId(result._id);
            setAnnotationType(copiedAnnotation.type);
            if (copiedAnnotation.group_id) setGroupId(copiedAnnotation.group_id);
            setNewAnnotationText(copiedAnnotation.text || '');
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, annotationType, groupId, newAnnotationText, copiedAnnotation, image, token]);

  function onImageLoad(e) {
    imgRef.current = e.currentTarget;
  }

  const handleAnnotationClick = (annotation) => {
    setSelection(annotation.coords);
    setSelectedAnnotationId(annotation._id);
    if (annotation.type) setAnnotationType(annotation.type);
    if (annotation.group_id) setGroupId(annotation.group_id);
    setNewAnnotationText(annotation.text || '');
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-dark-deep border border-gray-200 dark:border-gray-700 rounded-2xl w-[95%] max-w-[1400px] h-[90vh] p-6 shadow-2xl relative flex flex-col" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" onClick={onClose}>
          <FiX size={24} />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 h-full overflow-hidden mt-4">
          {/* Left Column: Image Area */}
          <div className="bg-gray-100 dark:bg-black/30 rounded-xl overflow-auto relative flex items-center justify-center p-4 border border-gray-200 dark:border-gray-800">
            {loadingImage ? (
              <div className="flex flex-col items-center gap-3">
                <FiLoader className="w-8 h-8 animate-spin text-primary-500" />
                <span className="text-sm text-gray-500">{t('common.loading')}</span>
              </div>
            ) : errorImage ? (
              <div className="flex flex-col items-center gap-3 text-red-500">
                <FiAlertTriangle className="w-8 h-8" />
                <span className="text-sm">{t('image.error')}</span>
              </div>
            ) : imageUrl ? (
              <div className="relative max-w-full max-h-full">
                <ReactCrop
                  crop={selection}
                  onChange={(c, pc) => setSelection(pc)}
                  className="max-h-[75vh]"
                >
                  <img
                    ref={imgRef}
                    src={imageUrl}
                    alt={image.filename}
                    onLoad={onImageLoad}
                    className="max-w-full max-h-[75vh] object-contain block"
                  />
                </ReactCrop>

                {/* Clickable Annotations Layer - MUST capture clicks */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[150]">
                  {annotations.map(anno => {
                    const { x, y, width, height } = anno.coords || {};
                    const color = getGroupColor(anno.type, anno.group_id);

                    if (!Number.isFinite(x)) return null;
                    if (anno._id === selectedAnnotationId) return null; // Hide being edited

                    return (
                      <div
                        key={anno._id}
                        className="absolute border-2 transition-colors cursor-pointer group pointer-events-auto"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          width: `${width}%`,
                          height: `${height}%`,
                          borderColor: color,
                          backgroundColor: `${color}33`, // 20% opacity
                        }}
                        onClick={() => handleAnnotationClick(anno)}
                      >
                        {/* Badge for Group ID */}
                        {anno.type === 'copy-move' && anno.group_id && (
                          <div
                            className="absolute -top-3 -left-0.5 text-[10px] text-white px-1.5 rounded-full shadow-sm font-bold"
                            style={{ backgroundColor: color }}
                          >
                            G{anno.group_id}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Live Preview Layer - Non-interactive visual feedback */}
                {selection && selection.width > 0 && selection.height > 0 && (
                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[100]">
                    <div
                      className="absolute border-2 border-dashed pointer-events-none"
                      style={{
                        left: `${selection.x}%`,
                        top: `${selection.y}%`,
                        width: `${selection.width}%`,
                        height: `${selection.height}%`,
                        borderColor: getGroupColor(annotationType, groupId),
                        backgroundColor: `${getGroupColor(annotationType, groupId)}33`,
                      }}
                    >
                      {/* Badge for Copy-Move */}
                      {annotationType === 'copy-move' && groupId && (
                        <div
                          className="absolute -top-3 -left-0.5 text-[10px] text-white px-1.5 rounded-full shadow-sm font-bold"
                          style={{ backgroundColor: getGroupColor(annotationType, groupId) }}
                        >
                          G{groupId}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Right Column: Controls & List */}
          <div className="flex flex-col h-full overflow-hidden">
            <h3 className="text-gray-900 dark:text-white text-2xl mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
              {t('annotation.listTitle')}
            </h3>

            {/* Input Controls */}
            <div className="mb-6 space-y-4">

              {/* Type Selector */}
              <div className="flex p-1 bg-gray-100 dark:bg-black/30 rounded-lg">
                <button
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${annotationType === 'manipulation' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                  onClick={() => setAnnotationType('manipulation')}
                >
                  <FiEdit2 /> {t('annotation.manipulation')}
                </button>
                <button
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${annotationType === 'copy-move' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                  onClick={() => setAnnotationType('copy-move')}
                >
                  <FiCopy /> {t('annotation.copyMove')}
                </button>
              </div>

              {/* Group ID Input (Only for Copy-Move) */}
              {annotationType === 'copy-move' && (
                <div className="flex items-center gap-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                  <FiLayers className="text-blue-500" />
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                      {t('annotation.groupId')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      className="w-full bg-white dark:bg-black/20 border border-blue-200 dark:border-blue-700 rounded px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <textarea
                placeholder={t('annotation.placeholder')}
                value={newAnnotationText}
                onChange={(e) => setNewAnnotationText(e.target.value)}
                className="w-full h-[80px] bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-3 text-gray-900 dark:text-white text-base resize-y focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
              />
              <button
                onClick={handleSaveAnnotation}
                disabled={!selection} // Allow saving without text if it's just a region marking? No, let's keep it consistent, but usually manipulation markings might not need text. Let's make text optional if region is selected.
                className="w-full px-3 py-3 bg-primary-600 text-white border-none rounded-lg text-base font-semibold cursor-pointer flex items-center justify-center gap-2 transition-colors hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FiSave /> {t('annotation.saveAnnotation')}
              </button>
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto pr-2.5 scrollbar-custom">
              {loadingAnnotations ? (
                <div className="text-center text-text-secondary py-8">
                  <FiLoader className="text-3xl text-toggle-accent animate-spin inline-block" />
                </div>
              ) : errorAnnotations ? (
                <div className="text-center text-[#ff6b6b] py-8">{errorAnnotations}</div>
              ) : annotations.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">{t('annotation.noAnnotations')}</div>
              ) : (
                annotations.map(anno => {
                  const color = getGroupColor(anno.type, anno.group_id);
                  return (
                    <div key={anno._id} className="group relative flex flex-col bg-gray-50 dark:bg-black/20 rounded-lg mb-3 border border-transparent transition-all hover:border-primary-500 pl-3 pr-4 py-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            {anno.type === 'copy-move' ? `${t('annotation.copyMove')} (G${anno.group_id})` : t('annotation.manipulation')}
                          </span>
                        </div>
                        <button onClick={() => handleDeleteAnnotation(anno._id)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <FiTrash2 />
                        </button>
                      </div>

                      {anno.text && (
                        <p
                          onClick={() => handleAnnotationClick(anno)}
                          className="text-sm text-gray-800 dark:text-gray-200 cursor-pointer hover:underline"
                        >
                          {anno.text}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnotationModal;
