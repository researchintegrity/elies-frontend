// src/pages/AnnotationPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AnnotationModal from './AnnotationModal';
import { API_BASE_URL } from '../config/api';
import { FiLoader, FiAlertTriangle } from 'react-icons/fi';

// ############ DADOS MOCKADOS (Substitua pela sua API) ############
// Sua API real deve retornar algo parecido com isso:
// const fakeApiData = [
//   {
//     id: 'img1',
//     title: 'Amostra_Celular_01.png',
//     url: 'https://images.unsplash.com/photo-1578496781379-7dcfb995290f?w=600',
//   },
//   {
//     id: 'img2',
//     title: 'Placa_de_Petri_02.jpg',
//     url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600',
//   },
//   {
//     id: 'img3',
//     title: 'Microscopio_03.webp',
//     url: 'https://images.unsplash.com/photo-1554106198-471a9e334335?w=600',
//   },
// ];
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

      try {
        // Fetch all images (both extracted and uploaded) for annotation
        const response = await fetch(`${API_BASE_URL}/images`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch images: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Fetched images:', data);

        if (!data || data.length === 0) {
          setImages([]);
          setLoading(false);
          return;
        }

        // Transform the image data to include image blob URLs
        const imagesWithBlobs = await Promise.all(
          data.map(async (image) => {
            try {
              // Fetch the image blob using the download endpoint
              const imageResponse = await fetch(`${API_BASE_URL}/images/${image._id}/download`, {
                headers: { 'Authorization': `Bearer ${token}` },
              });

              if (imageResponse.ok) {
                const blob = await imageResponse.blob();
                const blobUrl = URL.createObjectURL(blob);
                console.log(`Loaded image: ${image.filename}`);
                return {
                  ...image,
                  url: blobUrl,
                  id: image._id,
                  title: image.filename,
                };
              } else {
                console.warn(`Failed to load image ${image._id}: ${imageResponse.statusText}`);
              }
            } catch (err) {
              console.error(`Error loading image ${image._id}:`, err);
            }

            return {
              ...image,
              id: image._id,
              title: image.filename,
              url: null,
            };
          })
        );

        setImages(imagesWithBlobs);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching images:', err);
      } finally {
        setLoading(false);
      }
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
      <p>Selecione uma imagem para adicionar ou revisar anotações (funciona com imagens extraídas e enviadas).</p>

      {images.length === 0 ? (
        <div className="page-status-container">
          <p>Nenhuma imagem para anotar encontrada. Carregue imagens extraídas ou enviadas.</p>
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