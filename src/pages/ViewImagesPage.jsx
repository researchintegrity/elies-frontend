import React, { useState, useEffect, useMemo } from 'react';
import './ViewImagesPage.css';
import {
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiImage,
  FiX,
  FiUploadCloud,
  FiEye,
  FiAlertTriangle
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:8000';

// --- Components ---

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton skeleton-image"></div>
    <div className="skeleton-content">
      <div className="skeleton skeleton-text"></div>
      <div className="skeleton skeleton-text short"></div>
    </div>
  </div>
);

const EmptyState = ({ isSearch, onUploadClick }) => (
  <div className="empty-state">
    <FiImage className="empty-icon" />
    <h3>{isSearch ? 'Nenhum resultado encontrado' : 'Galeria vazia'}</h3>
    <p>
      {isSearch
        ? 'Tente buscar com outros termos ou limpe os filtros.'
        : 'Você ainda não enviou nenhuma imagem para a plataforma.'}
    </p>
    {!isSearch && (
      <button className="upload-link-btn" onClick={onUploadClick}>
        <FiUploadCloud /> Fazer Upload Agora
      </button>
    )}
  </div>
);

const LightboxModal = ({ image, onClose, imageUrl }) => {
  if (!image) return null;

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="lightbox-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lightbox-content" onClick={e => e.stopPropagation()}>
        <button
          className="lightbox-close"
          onClick={onClose}
          aria-label="Fechar visualização"
        >
          <FiX />
        </button>

        {imageUrl ? (
          <img src={imageUrl} alt={image.filename} className="lightbox-image" />
        ) : (
          <div className="skeleton skeleton-image" style={{ width: '80vw', height: '80vh' }}></div>
        )}

        <div className="lightbox-caption">
          <div className="lightbox-title">{image.filename}</div>
          <div className="lightbox-details">
            {new Date(image.uploadedDate).toLocaleDateString()} • {(image.fileSize / 1024).toFixed(1)} KB
          </div>
        </div>
      </div>
    </div>
  );
};

const ImageCard = ({ image, token, onClick }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadImage = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/images/${image.imageId}/download`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        if (isMounted) {
          setImageUrl(url);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    if (token && image.imageId) loadImage();

    return () => {
      isMounted = false;
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [image.imageId, token]);

  return (
    <article
      className="image-card"
      onClick={() => onClick(image, imageUrl)}
      role="button"
      tabIndex="0"
      onKeyDown={(e) => e.key === 'Enter' && onClick(image, imageUrl)}
      aria-label={`Visualizar imagem ${image.filename}`}
    >
      <div className="card-image-wrapper">
        {loading ? (
          <div className="skeleton skeleton-image" style={{ height: '100%' }}></div>
        ) : error ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffebee', color: '#d32f2f' }}>
            <FiAlertTriangle /> Erro
          </div>
        ) : (
          <>
            <img src={imageUrl} alt="" className="image-card-img" loading="lazy" />
            <div className="card-overlay">
              <FiEye className="view-icon" />
            </div>
          </>
        )}
      </div>

      <div className="image-card-info">
        <h3 className="image-card-title" title={image.filename}>{image.filename}</h3>
        <div className="image-meta">
          <span>{new Date(image.uploadedDate).toLocaleDateString()}</span>
          <span className="meta-badge">{image.sourceType}</span>
        </div>
      </div>
    </article>
  );
};

// --- Main Page Component ---

const ViewImagesPage = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Lightbox State
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  const { token } = useAuth();

  const fetchImages = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) throw new Error('Autenticação necessária');

      const response = await fetch(`${API_BASE_URL}/images?page=1&per_page=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Falha ao buscar imagens');

      const data = await response.json();

      if (Array.isArray(data)) {
        const transformed = data.map(img => ({
          id: img._id,
          imageId: img._id,
          filename: img.filename,
          uploadedDate: img.uploaded_date,
          fileSize: img.file_size,
          sourceType: img.source_type
        }));
        setImages(transformed);
      } else {
        throw new Error('Formato de dados inválido');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [token]);

  // Filter and Sort Logic
  const filteredImages = useMemo(() => {
    let result = [...images];

    // Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(img =>
        img.filename.toLowerCase().includes(query)
      );
    }

    // Sort
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
    alert("Por favor, use o menu lateral para acessar a página de Upload.");
  };

  return (
    <div className="view-images-container">
      <header className="gallery-header">
        <div className="gallery-title-section">
          <div>
            <h2>Galeria de Imagens</h2>
            <span className="gallery-stats">
              {loading ? 'Carregando...' : `${filteredImages.length} imagens encontradas`}
            </span>
          </div>
        </div>

        <div className="gallery-toolbar">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nome do arquivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar imagens"
            />
          </div>

          <div className="filter-group">
            <select
              className="sort-select"
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
              className="refresh-btn"
              onClick={fetchImages}
              title="Atualizar lista"
              aria-label="Atualizar lista de imagens"
            >
              <FiRefreshCw />
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="image-grid">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="empty-state">
          <FiRefreshCw className="empty-icon" style={{ color: '#ff6b6b' }} />
          <h3>Erro ao carregar</h3>
          <p>{error}</p>
          <button className="upload-link-btn" onClick={fetchImages}>
            Tentar Novamente
          </button>
        </div>
      ) : filteredImages.length === 0 ? (
        <EmptyState isSearch={!!searchQuery} onUploadClick={handleUploadClick} />
      ) : (
        <div className="image-grid">
          {filteredImages.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              token={token}
              onClick={openLightbox}
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