// src/pages/ViewImagesPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiImage,
  FiX,
  FiUploadCloud,
  FiEye,
  FiAlertTriangle,
  FiTrash2
} from 'react-icons/fi';
import { useImages } from '../hooks/useImages';
import { api } from '../services/api';
import { showAlert } from '../utils/alert';

// --- Components ---

const SkeletonCard = () => (
  <div className="bg-bg-card dark:bg-dark-card rounded-xl overflow-hidden h-80">
    <div className="w-full aspect-[4/3] bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-[shimmer_1.5s_infinite] bg-[length:200%_100%]"></div>
    <div className="p-4">
      <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-[shimmer_1.5s_infinite] bg-[length:200%_100%] rounded mb-2"></div>
      <div className="h-4 w-3/5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-[shimmer_1.5s_infinite] bg-[length:200%_100%] rounded"></div>
    </div>
  </div>
);

const EmptyState = ({ isSearch, onUploadClick }) => (
  <div className="col-span-full flex flex-col items-center justify-center px-8 py-16 text-center text-text-secondary bg-bg-card dark:bg-dark-card rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
    <FiImage className="text-6xl mb-6 text-text-secondary opacity-50" />
    <h3 className="text-2xl mb-2 text-text-primary dark:text-white">
      {isSearch ? 'Nenhum resultado encontrado' : 'Galeria vazia'}
    </h3>
    <p className="max-w-md mb-8">
      {isSearch
        ? 'Tente buscar com outros termos ou limpe os filtros.'
        : 'Você ainda não enviou nenhuma imagem para a plataforma.'}
    </p>
    {!isSearch && (
      <button
        className="inline-flex items-center gap-2 px-6 py-3 bg-toggle-accent text-white rounded-lg font-medium transition-colors hover:bg-[#7a52c3] border-none cursor-pointer"
        onClick={onUploadClick}
      >
        <FiUploadCloud /> Fazer Upload Agora
      </button>
    )}
  </div>
);

const LightboxModal = ({ image, onClose, imageUrl }) => {
  if (!image) return null;

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center backdrop-blur-sm animate-[fadeIn_0.3s_ease]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
        <button
          className="absolute -top-10 right-0 bg-transparent border-none text-white text-3xl cursor-pointer p-2 transition-transform hover:scale-110"
          onClick={onClose}
          aria-label="Fechar visualização"
        >
          <FiX />
        </button>

        {imageUrl ? (
          <img src={imageUrl} alt={image.filename} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.5)]" />
        ) : (
          <div className="w-[80vw] h-[80vh] bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-[shimmer_1.5s_infinite] bg-[length:200%_100%]"></div>
        )}

        <div className="mt-4 text-white text-center">
          <div className="text-lg font-medium">{image.filename}</div>
          <div className="text-sm opacity-80 mt-1">
            {new Date(image.uploadedDate).toLocaleDateString()} • {(image.fileSize / 1024).toFixed(1)} KB
          </div>
        </div>
      </div>
    </div>
  );
};

const ImageCard = ({ image, onClick, onDelete }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadImage = async () => {
      try {
        const blob = await api.download(`/images/${image.imageId}/download`);
        const url = URL.createObjectURL(blob);

        if (isMounted) {
          setImageUrl(url);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error(`Error loading image ${image.filename}:`, err);
          setError(true);
          setLoading(false);
        }
      }
    };

    if (image.imageId) loadImage();

    return () => {
      isMounted = false;
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [image.imageId]);

  return (
    <article
      className="bg-bg-card dark:bg-dark-card rounded-xl overflow-hidden border border-transparent shadow-[0_4px_6px_rgba(0,0,0,0.05)] 
        transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] hover:border-primary-accent 
        cursor-zoom-in relative flex flex-col"
      onClick={() => onClick(image, imageUrl)}
      role="button"
      tabIndex="0"
      onKeyDown={(e) => e.key === 'Enter' && onClick(image, imageUrl)}
      aria-label={`Visualizar imagem ${image.filename}`}
    >
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-deep-dark dark:bg-dark-deep">
        {loading ? (
          <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-[shimmer_1.5s_infinite] bg-[length:200%_100%]"></div>
        ) : error ? (
          <div className="h-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
            <FiAlertTriangle /> Erro
          </div>
        ) : (
          <>
            <img src={imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
            <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <FiEye className="text-white text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
              <button
                className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); onDelete(image); }}
                title="Excluir Imagem"
              >
                <FiTrash2 />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="text-base font-semibold text-text-primary dark:text-white whitespace-nowrap overflow-hidden text-ellipsis m-0" title={image.filename}>
          {image.filename}
        </h3>
        <div className="flex justify-between items-center text-xs text-text-secondary">
          <span>{new Date(image.uploadedDate).toLocaleDateString()}</span>
          <span className="bg-surface dark:bg-surface-dark px-2 py-1 rounded font-medium uppercase text-[0.7rem] tracking-wide">
            {image.sourceType}
          </span>
        </div>
      </div>
    </article>
  );
};

// --- Main Page Component ---

const ViewImagesPage = () => {
  const {
    images,
    loading,
    error,
    fetchImages,
    deleteImage
  } = useImages();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const filteredImages = useMemo(() => {
    let result = [...images];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(img =>
        img.filename.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.uploadedDate) - new Date(a.uploadedDate);
        case 'oldest':
          return new Date(a.uploadedDate) - new Date(b.uploadedDate);
        case 'name_asc':
          return a.filename.localeCompare(b.filename);
        case 'name_desc':
          return b.filename.localeCompare(a.filename);
        case 'size_desc':
          return b.fileSize - a.fileSize;
        default:
          return 0;
      }
    });

    return result;
  }, [images, searchQuery, sortBy]);

  const openLightbox = (image, url) => {
    setSelectedImage(image);
    setSelectedImageUrl(url);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
    setSelectedImageUrl(null);
  };

  const handleUploadClick = () => {
    showAlert('Upload', "Por favor, use o menu lateral para acessar a página de Upload.", 'info');
  };

  return (
    <div className="w-full pb-8 animate-[fadeIn_0.5s_ease-in-out]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">Galeria de Imagens</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {loading ? 'Carregando...' : `${filteredImages.length} imagens encontradas`}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:w-72 group">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-400"
              placeholder="Buscar por nome do arquivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar imagens"
            />
          </div>

          <div className="flex gap-2">
            <select
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Ordenar imagens"
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
              <option value="name_asc">Nome (A-Z)</option>
              <option value="name_desc">Nome (Z-A)</option>
              <option value="size_desc">Tamanho (Maior)</option>
            </select>

            <button
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-500 hover:text-indigo-600 hover:border-indigo-500 px-3 py-2.5 rounded-lg transition-all"
              onClick={() => fetchImages()}
              title="Atualizar lista"
              aria-label="Atualizar lista de imagens"
            >
              <FiRefreshCw />
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="col-span-full flex flex-col items-center justify-center px-8 py-16 text-center text-text-secondary bg-bg-card dark:bg-dark-card rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <FiRefreshCw className="text-6xl mb-6 text-red-500" />
          <h3 className="text-2xl mb-2 text-text-primary dark:text-white">Erro ao carregar</h3>
          <p>{error}</p>
          <button
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-toggle-accent text-white rounded-lg font-medium transition-colors hover:bg-[#7a52c3] border-none cursor-pointer"
            onClick={() => fetchImages()}
          >
            Tentar Novamente
          </button>
        </div>
      ) : filteredImages.length === 0 ? (
        <EmptyState isSearch={!!searchQuery} onUploadClick={handleUploadClick} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
          {filteredImages.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              onClick={openLightbox}
              onDelete={deleteImage}
            />
          ))}
        </div>
      )}

      {selectedImage && (
        <LightboxModal
          image={selectedImage}
          imageUrl={selectedImageUrl}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
};

export default ViewImagesPage;
