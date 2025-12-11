// src/pages/AnnotationPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AnnotationModal from './AnnotationModal';
import { API_BASE_URL } from '../config/api';
import {
  FiLoader,
  FiAlertTriangle,
  FiSearch,
  FiFilter,
  FiImage
} from 'react-icons/fi';

const AnnotationPage = () => {
  const [images, setImages] = useState([]);
  const [filteredImages, setFilteredImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para controlar o modal
  const [selectedImage, setSelectedImage] = useState(null);

  const { token } = useAuth();

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/images`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch images: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data || data.length === 0) {
          setImages([]);
          setFilteredImages([]);
          setLoading(false);
          return;
        }

        // Transformar dados e buscar blobs
        const imagesWithBlobs = await Promise.all(
          data.map(async (image) => {
            try {
              const imageResponse = await fetch(`${API_BASE_URL}/images/${image._id}/download`, {
                headers: { 'Authorization': `Bearer ${token}` },
              });

              if (imageResponse.ok) {
                const blob = await imageResponse.blob();
                const blobUrl = URL.createObjectURL(blob);
                return {
                  ...image,
                  url: blobUrl,
                  id: image._id,
                  title: image.filename,
                  date: new Date().toLocaleDateString('pt-BR'), // Mock de data se a API não retornar
                  status: 'UPLOADED'
                };
              } else {
                console.warn(`Failed to load image ${image._id}`);
              }
            } catch (err) {
              console.error(`Error loading image ${image._id}:`, err);
            }

            // Retorno em caso de erro no blob (para exibir o card de erro)
            return {
              ...image,
              id: image._id,
              title: image.filename,
              url: null, // URL nula indica erro
              date: new Date().toLocaleDateString('pt-BR'),
              status: 'ERROR'
            };
          })
        );

        setImages(imagesWithBlobs);
        setFilteredImages(imagesWithBlobs);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [token]);

  // Filtro de pesquisa
  useEffect(() => {
    const results = images.filter(img =>
      img.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredImages(results);
  }, [searchTerm, images]);

  const handleImageClick = (image) => {
    // Só abre o modal se a imagem carregou corretamente (tem URL)
    if (image.url) {
      setSelectedImage(image);
    }
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  // --- Renderização ---
  return (
    <div className="w-full h-full p-8 overflow-y-auto bg-deep-dark dark:bg-dark-deep text-text-primary dark:text-white">
      {/* Header & Breadcrumbs */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Galeria de Imagens</h2>
        <p className="text-text-secondary">
          {images.length} imagens encontradas
        </p>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-text-secondary text-lg" />
          </div>
          <input
            type="text"
            className="w-full bg-bg-card dark:bg-dark-card border border-primary-accent rounded-lg py-3 pl-10 pr-4 text-text-primary dark:text-white placeholder-text-secondary focus:outline-none focus:border-toggle-accent transition-colors"
            placeholder="Buscar por nome do arquivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-6 py-3 bg-bg-card dark:bg-dark-card border border-primary-accent rounded-lg text-text-primary dark:text-white hover:bg-primary-accent/10 transition-colors cursor-pointer">
          <FiFilter />
          <span>Mais recentes</span>
        </button>
      </div>

      {/* Conteúdo Principal */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-text-secondary">
          <FiLoader className="text-4xl animate-spin mb-4 text-toggle-accent" />
          <p>Carregando galeria...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 text-[#FF6B6B]">
          <FiAlertTriangle className="text-4xl mb-4" />
          <h3 className="text-xl font-semibold">Erro ao carregar</h3>
          <p>{error}</p>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-text-secondary border-2 border-dashed border-primary-accent rounded-xl bg-bg-card/30">
          <FiImage className="text-4xl mb-4 opacity-50" />
          <p>Nenhuma imagem encontrada.</p>
        </div>
      ) : (
        /* Grid de Imagens */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredImages.map((image) => (
            <div
              key={image.id}
              onClick={() => handleImageClick(image)}
              className={`
                group relative bg-bg-card dark:bg-dark-card rounded-xl overflow-hidden border border-transparent 
                transition-all duration-300
                ${image.url
                  ? 'cursor-pointer hover:border-toggle-accent hover:shadow-[0_0_20px_rgba(138,99,210,0.15)]'
                  : 'cursor-not-allowed opacity-80'
                }
              `}
            >
              {/* Área da Imagem / Preview */}
              <div className="aspect-square w-full bg-[#1a1b26] relative flex items-center justify-center overflow-hidden">
                {image.url ? (
                  <img
                    src={image.url}
                    alt={image.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  // Estado de Erro Visual (Como no print)
                  <div className="flex flex-col items-center text-[#FF6B6B]">
                    <FiAlertTriangle className="text-3xl mb-2" />
                    <span className="text-sm font-medium">Erro</span>
                  </div>
                )}

                {/* Overlay ao passar o mouse (apenas se tiver imagem) */}
                {image.url && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-4 py-2 bg-toggle-accent text-white text-sm font-bold rounded-full transform translate-y-4 group-hover:translate-y-0 transition-transform">
                      Anotar
                    </span>
                  </div>
                )}
              </div>

              {/* Footer do Card */}
              <div className="p-4 border-t border-primary-accent/30">
                <h4 className="text-text-primary dark:text-white font-medium text-sm truncate mb-2" title={image.title}>
                  {image.title}
                </h4>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-secondary">{image.date}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${image.url
                    ? 'bg-primary-accent/20 text-text-secondary'
                    : 'bg-red-500/10 text-red-500'
                    }`}>
                    {image.url ? 'UPLOADED' : 'FALHA'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Renderizado Condicionalmente */}
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