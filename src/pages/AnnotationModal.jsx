// src/components/AnnotationModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../config/api';
import { FiLoader, FiTrash2, FiSave, FiX, FiAlertTriangle } from 'react-icons/fi';
import { useImageLoader } from '../components/common/ImageThumbnail';
import 'react-image-crop/dist/ReactCrop.css';

const AnnotationModal = ({ image, onClose }) => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [annotations, setAnnotations] = useState([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(true);
  const [errorAnnotations, setErrorAnnotations] = useState(null);

  // Load image blob
  const { imageUrl, loading: loadingImage, error: errorImage } = useImageLoader(image?.id);

  const imgRef = useRef(null);
  const [selection, setSelection] = useState(null);
  const [newAnnotationText, setNewAnnotationText] = useState('');

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
      } catch (err) {
        setErrorAnnotations(err.message);
        console.error('Error fetching annotations:', err);
      } finally {
        setLoadingAnnotations(false);
      }
    };

    fetchAnnotations();
  }, [image, token]);

  const handleSaveAnnotation = async () => {
    if (!selection || !newAnnotationText) {
      console.warn('Cannot save: selection or text missing', { selection, newAnnotationText });
      return;
    }

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
    };

    try {
      const response = await fetch(`${API_BASE_URL}/annotations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAnnotation),
      });

      if (!response.ok) {
        throw new Error(`Failed to save annotation`);
      }

      const savedData = await response.json();

      setNewAnnotationText('');
      setSelection(null);
      setAnnotations([...annotations, savedData]);

    } catch (err) {
      console.error('Error saving annotation:', err);
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

      setAnnotations(annotations.filter(a => a._id !== annotationId));

    } catch (err) {
      console.error('Error deleting annotation:', err);
    }
  };

  function onImageLoad(e) {
    imgRef.current = e.currentTarget;
  }

  const handleAnnotationClick = (annotation) => {
    const cleanCoords = {
      x: Number.isFinite(annotation.coords.x) ? annotation.coords.x : 0,
      y: Number.isFinite(annotation.coords.y) ? annotation.coords.y : 0,
      width: Number.isFinite(annotation.coords.width) ? annotation.coords.width : 0,
      height: Number.isFinite(annotation.coords.height) ? annotation.coords.height : 0,
    };
    setSelection(cleanCoords);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-dark-deep border border-gray-200 dark:border-gray-700 rounded-2xl w-[95%] max-w-[1400px] h-[90vh] p-6 shadow-2xl relative flex flex-col" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" onClick={onClose}>
          <FiX size={24} />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 h-full overflow-hidden mt-4">
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

                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                  {annotations.map(anno => {
                    const x = Number.isFinite(anno.coords?.x) ? anno.coords.x : 0;
                    const y = Number.isFinite(anno.coords?.y) ? anno.coords.y : 0;
                    const width = Number.isFinite(anno.coords?.width) ? anno.coords.width : 0;
                    const height = Number.isFinite(anno.coords?.height) ? anno.coords.height : 0;

                    return (
                      <div
                        key={anno._id}
                        className="absolute border-2 border-red-500 bg-red-500/20 pointer-events-auto cursor-pointer transition-colors hover:bg-red-500/40"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          width: `${width}%`,
                          height: `${height}%`,
                        }}
                        onClick={() => handleAnnotationClick(anno)}
                        title={anno.text}
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col h-full overflow-hidden">
            <h3 className="text-gray-900 dark:text-white text-2xl mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
              {t('annotation.listTitle')}
            </h3>

            <div className="mb-6">
              <textarea
                placeholder={t('annotation.placeholder')}
                value={newAnnotationText}
                onChange={(e) => setNewAnnotationText(e.target.value)}
                className="w-full h-[100px] bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-3 text-gray-900 dark:text-white text-base resize-y mb-4 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
              />
              <button
                onClick={handleSaveAnnotation}
                disabled={!selection || !newAnnotationText}
                className="w-full px-3 py-3 bg-primary-600 text-white border-none rounded-lg text-base font-semibold cursor-pointer flex items-center justify-center gap-2 transition-colors hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FiSave /> {t('annotation.saveAnnotation')}
              </button>
            </div>

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
                annotations.map(anno => (
                  <div key={anno._id} className="flex justify-between items-center bg-deep-dark dark:bg-dark-deep px-4 py-3 rounded-lg mb-3 border border-transparent transition-colors hover:border-toggle-accent">
                    <span onClick={() => handleAnnotationClick(anno)} className="text-text-primary dark:text-white cursor-pointer flex-grow pr-4">
                      {anno.text}
                    </span>
                    <button onClick={() => handleDeleteAnnotation(anno._id)} className="bg-transparent border-none text-text-secondary text-lg cursor-pointer transition-colors hover:text-[#FF6B6B]">
                      <FiTrash2 />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnotationModal;
