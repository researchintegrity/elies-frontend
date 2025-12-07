// src/components/AnnotationModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import { FiLoader, FiTrash2, FiSave, FiX } from 'react-icons/fi';
import 'react-image-crop/dist/ReactCrop.css';

const AnnotationModal = ({ image, onClose }) => {
  const { token } = useAuth();
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const imgRef = useRef(null);
  const [selection, setSelection] = useState(null);
  const [newAnnotationText, setNewAnnotationText] = useState('');

  useEffect(() => {
    const fetchAnnotations = async () => {
      if (!image) return;
      setLoading(true);
      setError(null);

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
        setError(err.message);
        console.error('Error fetching annotations:', err);
      } finally {
        setLoading(false);
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

    console.log('Saving annotation:', newAnnotation);

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
        const errorText = await response.text();
        throw new Error(`Failed to save annotation: ${response.status} - ${errorText}`);
      }

      const savedData = await response.json();
      console.log('Saved annotation response:', savedData);

      setNewAnnotationText('');
      setSelection(null);
      setAnnotations([...annotations, savedData]);
      console.log('Annotations list updated:', [...annotations, savedData]);

    } catch (err) {
      alert(`Error: ${err.message}`);
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
      alert(`Error: ${err.message}`);
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-card dark:bg-dark-card border border-primary-accent rounded-2xl w-[90%] max-w-[1400px] h-[85vh] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.3)] relative flex flex-col" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-6 right-6 bg-transparent border-none text-text-secondary text-3xl cursor-pointer z-[1010] hover:text-text-primary dark:hover:text-white" onClick={onClose}>
          <FiX />
        </button>

        <div className="grid grid-cols-[2fr_1fr] gap-8 h-full overflow-hidden">
          <div className="bg-deep-dark dark:bg-dark-deep rounded-[10px] overflow-auto relative flex items-center justify-center p-4">
            <div className="relative max-w-full max-h-full">
              <ReactCrop
                crop={selection}
                onChange={(c, pc) => setSelection(pc)}
                className="[&_.ReactCrop__crop-selection]:!border-2 [&_.ReactCrop__crop-selection]:!border-dashed [&_.ReactCrop__crop-selection]:!border-toggle-accent [&_.ReactCrop__crop-selection]:!bg-[rgba(138,99,210,0.2)]"
              >
                <img
                  ref={imgRef}
                  src={image.url}
                  alt={image.title}
                  onLoad={onImageLoad}
                  className="max-w-full max-h-[calc(85vh-6rem)] object-contain block"
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
                      className="absolute border-2 border-[#FF6B6B] bg-[rgba(255,107,107,0.2)] pointer-events-auto cursor-pointer transition-colors hover:bg-[rgba(255,107,107,0.4)]"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                      }}
                      onClick={() => handleAnnotationClick(anno)}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col h-full overflow-hidden">
            <h3 className="text-text-primary dark:text-white text-2xl mb-6 pb-2 border-b border-primary-accent">
              Anotações
            </h3>

            <div className="mb-6">
              <textarea
                placeholder="Digite sua anotação aqui..."
                value={newAnnotationText}
                onChange={(e) => setNewAnnotationText(e.target.value)}
                className="w-full h-[100px] bg-deep-dark dark:bg-dark-deep border border-primary-accent rounded-lg px-3 py-3 text-text-primary dark:text-white text-base resize-y mb-4 focus:outline-none focus:border-toggle-accent"
              />
              <button
                onClick={handleSaveAnnotation}
                disabled={!selection || !newAnnotationText}
                className="w-full px-3 py-3 bg-toggle-accent text-white border-none rounded-lg text-base font-semibold cursor-pointer flex items-center justify-center gap-2 transition-colors hover:bg-[#7a52c3] disabled:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FiSave /> Salvar Anotação
              </button>
            </div>

            <div className="flex-grow overflow-y-auto pr-2.5 scrollbar-custom">
              {loading ? (
                <div className="text-center text-text-secondary py-8">
                  <FiLoader className="text-3xl text-toggle-accent animate-spin inline-block" />
                </div>
              ) : error ? (
                <div className="text-center text-[#ff6b6b] py-8">{error}</div>
              ) : annotations.length === 0 ? (
                <div className="text-center text-text-secondary py-8">Nenhuma anotação.</div>
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
