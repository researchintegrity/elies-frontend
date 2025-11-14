// src/components/AnnotationModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import { useAuth } from '../context/AuthContext';
import './AnnotationModal.css'; // Vamos criar este
import { FiLoader, FiTrash2, FiSave, FiX } from 'react-icons/fi';

// ############ DADOS MOCKADOS (Substitua pela sua API) ############
const fakeAnnotationData = {
  'img1': [
    { id: 'anno1', imageId: 'img1', text: 'Núcleo celular identificado', coords: { x: 25.5, y: 30.1, width: 10.2, height: 15.8, unit: '%' } },
    { id: 'anno2', imageId: 'img1', text: 'Possível mitocôndria', coords: { x: 60.1, y: 55.2, width: 5.0, height: 8.5, unit: '%' } },
  ],
  'img2': [
    { id: 'anno3', imageId: 'img2', text: 'Colônia de bactérias A', coords: { x: 10, y: 15, width: 20, height: 20, unit: '%' } },
  ],
  'img3': [], // Imagem sem anotações
};
// ############ FIM DOS DADOS MOCKADOS ############


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

      /* // ############ API GET AQUI ############
      try {
        const response = await fetch(`https://SUA-API.com/annotations?imageId=${image.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Falha ao buscar anotações');
        const data = await response.json();
        setAnnotations(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      // ######################################
      */

      // --- SIMULAÇÃO (Remova ao conectar) ---
      console.log(`Buscando anotações para imageId: ${image.id}`);
      setTimeout(() => {
        setAnnotations(fakeAnnotationData[image.id] || []);
        setLoading(false);
      }, 800);
      // --- FIM DA SIMULAÇÃO ---
    };

    fetchAnnotations();
  }, [image, token]);

  // 2. SALVAR uma nova anotação
  const handleSaveAnnotation = async () => {
    if (!selection || !newAnnotationText) return;

    const newAnnotation = {
      imageId: image.id,
      text: newAnnotationText,
      coords: selection, // 'selection' já está em { x, y, width, height, unit: '%' }
    };

    /* // ############ API POST AQUI ############
    try {
      const response = await fetch(`https://SUA-API.com/annotations`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAnnotation),
      });
      if (!response.ok) throw new Error('Falha ao salvar anotação');
      
      const savedData = await response.json(); // API deve retornar a anotação com 'id'
      setAnnotations([...annotations, savedData]); // Adiciona à lista

    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
    // ######################################
    */

    // --- SIMULAÇÃO (Remova ao conectar) ---
    console.log("Salvando anotação:", newAnnotation);
    const savedData = { ...newAnnotation, id: `anno_${Math.random()}` }; // Simula um ID
    setAnnotations([...annotations, savedData]);
    // --- FIM DA SIMULAÇÃO ---

    // Limpa os campos
    setNewAnnotationText('');
    setSelection(null);
  };

  // 3. DELETAR uma anotação
  const handleDeleteAnnotation = async (annotationId) => {
    /* // ############ API DELETE AQUI ############
    try {
      const response = await fetch(`https://SUA-API.com/annotations/${annotationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Falha ao deletar anotação');
      
      // Remove da lista no UI
      setAnnotations(annotations.filter(a => a.id !== annotationId));

    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
    // ######################################
    */

    // --- SIMULAÇÃO (Remova ao conectar) ---
    console.log("Deletando anotação:", annotationId);
    setAnnotations(annotations.filter(a => a.id !== annotationId));
    // --- FIM DA SIMULAÇÃO ---
  };


  // ----- Funções do UI -----

  // Chamado quando a imagem termina de carregar
  function onImageLoad(e) {
    imgRef.current = e.currentTarget;
  }
  
  // Chamado ao clicar em uma anotação salva (para destacá-la)
  const handleAnnotationClick = (annotation) => {
    setSelection(annotation.coords);
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
                {annotations.map(anno => (
                  <div
                    key={anno.id}
                    className="saved-box"
                    style={{
                      left: `${anno.coords.x}%`,
                      top: `${anno.coords.y}%`,
                      width: `${anno.coords.width}%`,
                      height: `${anno.coords.height}%`,
                    }}
                    onClick={() => handleAnnotationClick(anno)}
                  />
                ))}
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
                  <div key={anno.id} className="annotation-item">
                    <span onClick={() => handleAnnotationClick(anno)}>
                      {anno.text}
                    </span>
                    <button onClick={() => handleDeleteAnnotation(anno.id)}>
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