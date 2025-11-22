// src/components/AnnotationModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import './AnnotationModal.css'; // Vamos criar este
import { FiLoader, FiTrash2, FiSave, FiX } from 'react-icons/fi';

const AnnotationModal = ({ image, onClose }) => {
  const { token } = useAuth();
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const imgRef = useRef(null); // Referência para a tag <img>
  
  // Estado para a seleção de 'react-image-crop'
  // 'selection' armazena as coordenadas em % (unit: '%')
  const [selection, setSelection] = useState(null);
  
  // Estado para a anotação que está sendo digitada
  const [newAnnotationText, setNewAnnotationText] = useState('');
  
  // ----- LÓGICA DA API -----

  // 1. BUSCAR anotações quando o modal abre
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

  // 2. SALVAR uma nova anotação
  const handleSaveAnnotation = async () => {
    if (!selection || !newAnnotationText) {
      console.warn('Cannot save: selection or text missing', { selection, newAnnotationText });
      return;
    }

    // Ensure all coordinates are valid numbers (not undefined, NaN, or Infinity)
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
      
      // Limpa os campos ANTES de atualizar a lista
      setNewAnnotationText('');
      setSelection(null);
      
      // Atualiza a lista de anotações
      setAnnotations([...annotations, savedData]);
      console.log('Annotations list updated:', [...annotations, savedData]);
      
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error('Error saving annotation:', err);
    }
  };

  // 3. DELETAR uma anotação
  const handleDeleteAnnotation = async (annotationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/annotations/${annotationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete annotation');
      }
      
      // Remove da lista no UI
      setAnnotations(annotations.filter(a => a._id !== annotationId));

    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error('Error deleting annotation:', err);
    }
  };


  // ----- Funções do UI -----

  // Chamado quando a imagem termina de carregar
  function onImageLoad(e) {
    imgRef.current = e.currentTarget;
  }
  
  // Chamado ao clicar em uma anotação salva (para destacá-la)
  const handleAnnotationClick = (annotation) => {
    // Ensure all coordinates are valid numbers
    const cleanCoords = {
      x: Number.isFinite(annotation.coords.x) ? annotation.coords.x : 0,
      y: Number.isFinite(annotation.coords.y) ? annotation.coords.y : 0,
      width: Number.isFinite(annotation.coords.width) ? annotation.coords.width : 0,
      height: Number.isFinite(annotation.coords.height) ? annotation.coords.height : 0,
    };
    setSelection(cleanCoords);
  };

  return (
    // O Overlay (fundo escuro)
    <div className="modal-overlay" onClick={onClose}>
      {/* O Conteúdo (card branco) - onClick para parar propagação */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>
          <FiX />
        </button>
        
        <div className="modal-body">
          {/* Coluna da Esquerda: Imagem e Seleção */}
          <div className="image-annotator-container">
            <div className="image-wrapper">
              <ReactCrop
                crop={selection}
                // 'pc' é o 'percentCrop', que salva em % (ótimo para API)
                onChange={(c, pc) => setSelection(pc)} 
              >
                <img 
                  ref={imgRef}
                  src={image.url} 
                  alt={image.title} 
                  onLoad={onImageLoad} 
                />
              </ReactCrop>
              
              {/* Camada para desenhar as anotações JÁ SALVAS */}
              <div className="saved-annotations-layer">
                {annotations.map(anno => {
                  const x = Number.isFinite(anno.coords?.x) ? anno.coords.x : 0;
                  const y = Number.isFinite(anno.coords?.y) ? anno.coords.y : 0;
                  const width = Number.isFinite(anno.coords?.width) ? anno.coords.width : 0;
                  const height = Number.isFinite(anno.coords?.height) ? anno.coords.height : 0;
                  
                  return (
                    <div
                      key={anno._id}
                      className="saved-box"
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

          {/* Coluna da Direita: Lista e Formulário */}
          <div className="annotations-sidebar">
            <h3>Anotações</h3>
            
            {/* Formulário para Nova Anotação */}
            <div className="annotation-form">
              <textarea
                placeholder="Digite sua anotação aqui..."
                value={newAnnotationText}
                onChange={(e) => setNewAnnotationText(e.target.value)}
              />
              <button 
                onClick={handleSaveAnnotation} 
                disabled={!selection || !newAnnotationText}
                className="save-button"
              >
                <FiSave /> Salvar Anotação
              </button>
            </div>
            
            {/* Lista de Anotações Salvas */}
            <div className="annotations-list">
              {loading ? (
                <div className="list-status">
                  <FiLoader className="loading-spinner" />
                </div>
              ) : error ? (
                <div className="list-status error">{error}</div>
              ) : annotations.length === 0 ? (
                <div className="list-status">Nenhuma anotação.</div>
              ) : (
                annotations.map(anno => (
                  <div key={anno._id} className="annotation-item">
                    <span onClick={() => handleAnnotationClick(anno)}>
                      {anno.text}
                    </span>
                    <button onClick={() => handleDeleteAnnotation(anno._id)}>
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