// src/pages/AnnotationPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AnnotationModal from './AnnotationModal'; 
import { FiLoader, FiAlertTriangle } from 'react-icons/fi';
// Vamos reutilizar o CSS da ViewImagesPage para o grid, para não duplicar código
import './ViewImagesPage.css'; 

// ############ DADOS MOCKADOS (Substitua pela sua API) ############
// Sua API real deve retornar algo parecido com isso:
const fakeApiData = [
  {
    id: 'img1',
    title: 'Amostra_Celular_01.png',
    url: 'https://images.unsplash.com/photo-1578496781379-7dcfb995290f?w=600',
  },
  {
    id: 'img2',
    title: 'Placa_de_Petri_02.jpg',
    url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600',
  },
  {
    id: 'img3',
    title: 'Microscopio_03.webp',
    url: 'https://images.unsplash.com/photo-1554106198-471a9e334335?w=600',
  },
];
// ############ FIM DOS DADOS MOCKADOS ############

const AnnotationPage = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estado para controlar o modal
  const [selectedImage, setSelectedImage] = useState(null);
  
  const { token } = useAuth();

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      setError(null);
      
      /* // ############ API AQUI (Este é o código real) ############
      try {
        const response = await fetch('https://SUA-API.com/get-images-to-annotate', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Falha ao buscar imagens');
        const data = await response.json();
        setImages(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      // ########################################################
      */

      // --- SIMULAÇÃO (Remova isso quando conectar sua API) ---
      setTimeout(() => {
        setImages(fakeApiData);
        setLoading(false);
      }, 1000);
      // --- FIM DA SIMULAÇÃO ---
    };

    fetchImages();
  }, [token]);

  // Funções para controlar o modal
  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  // --- Renderização de Loading / Erro ---
  if (loading) {
    return (
      <div className="page-status-container">
        <FiLoader className="loading-spinner" />
        <p>Carregando imagens para anotar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-status-container error">
        <FiAlertTriangle size={40} />
        <h3>Erro ao carregar</h3>
        <p>{error}</p>
      </div>
    );
  }

  // --- Renderização Principal ---
  return (
    <div className="view-images-container"> {/* Reutilizando classe CSS */}
      <h2>Anotação de Imagens</h2>
      <p>Selecione uma imagem para adicionar ou revisar anotações.</p>
      
      {images.length === 0 ? (
        <div className="page-status-container">
          <p>Nenhuma imagem para anotar encontrada.</p>
        </div>
      ) : (
        <div className="image-grid"> {/* Reutilizando classe CSS */}
          {images.map((image) => (
            <div 
              key={image.id} 
              className="image-card" 
              onClick={() => handleImageClick(image)} // Abre o modal
            >
              <img src={image.url} alt={image.title} className="image-card-img" />
              <div className="image-card-info">
                <h4 className="image-card-title">{image.title}</h4>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* O Modal de Anotação (Renderiza fora do fluxo) */}
      {selectedImage && (
        <AnnotationModal 
          image={selectedImage} 
          onClose={handleCloseModal} 
        />
      )}
    </div>
  );
};

export default AnnotationPage;