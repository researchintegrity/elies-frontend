import React, { useState, useEffect } from 'react';
import './ViewImagesPage.css';
import { FiLoader, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:8000';

// Image card component that handles blob loading
const ImageCard = ({ image, token, API_BASE_URL }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/images/${image.imageId}/download`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          console.error(`Failed to fetch image ${image.imageId}: ${response.status}`);
          setImageUrl(null);
          setLoading(false);
          return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
        setLoading(false);
      } catch (err) {
        console.error(`Error loading image ${image.imageId}:`, err);
        setLoading(false);
      }
    };

    if (token && image.imageId) {
      loadImage();
    }

    // Cleanup blob URL on unmount
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [image.imageId, token, API_BASE_URL]);

  return (
    <div key={image.id} className="image-card">
      {loading ? (
        <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
          <FiLoader style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : imageUrl ? (
        <img src={imageUrl} alt={image.title} className="image-card-img" />
      ) : (
        <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffebee' }}>
          <span style={{ color: 'red' }}>Erro ao carregar</span>
        </div>
      )}
      <div className="image-card-info">
        <h4 className="image-card-title">{image.filename}</h4>
        <p className="image-card-date">
          {new Date(image.uploadedDate).toLocaleDateString('pt-BR')}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          {(image.fileSize / 1024).toFixed(2)} KB • {image.sourceType}
        </p>
      </div>
    </div>
  );
};

const ViewImagesPage = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get authentication token from context
  const { token } = useAuth();

  // Fetch images from the API
  const fetchImages = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!token) {
        throw new Error('Você não está autenticado. Por favor, faça login novamente.');
      }

      const url = `${API_BASE_URL}/api/images?page=1&per_page=100`;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      console.log('=== Fetching Images ===');
      console.log('Token present:', !!token);
      console.log('Token preview:', token.substring(0, 20) + '...');
      console.log('Request URL:', url);
      console.log('Request headers:', headers);

      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('Error data:', errorData);
        const errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}: Não foi possível buscar as imagens.`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success && data.data) {
        // Transform API data to match the component's expected format
        // Create blob URLs for images so we can pass auth via fetch
        const transformedImages = data.data.map(img => ({
          id: img._id,
          title: img.filename,
          filename: img.filename,
          imageId: img._id,  // Store ID for fetching blob later
          url: null,  // Will be fetched with auth
          uploadedDate: img.uploaded_date,
          fileSize: img.file_size,
          sourceType: img.source_type
        }));
        
        console.log('Transformed images:', transformedImages);
        setImages(transformedImages);
      } else {
        throw new Error('Formato de resposta inválido da API');
      }

    } catch (err) {
      console.error('❌ Error fetching images:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch images when component mounts
  useEffect(() => {
    fetchImages();
  }, [token]);

  // --- Renderização de Loading, Erro e Sucesso ---

  if (loading) {
    return (
      <div className="page-status-container">
        <FiLoader className="loading-spinner" />
        <p>Carregando imagens...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-status-container error">
        <FiAlertTriangle size={40} />
        <h3>Erro ao carregar</h3>
        <p>{error}</p>
        <button 
          className="retry-button"
          onClick={fetchImages}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--color-toggle-accent)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FiRefreshCw /> Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="view-images-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2>Imagens Carregadas</h2>
          <p>Total: {images.length} imagem(ns)</p>
        </div>
        <button 
          onClick={fetchImages}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--color-primary-accent)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FiRefreshCw /> Atualizar
        </button>
      </div>
      
      {images.length === 0 ? (
        <div className="page-status-container">
          <p>Nenhuma imagem encontrada. Envie uma imagem primeiro!</p>
        </div>
      ) : (
        <div className="image-grid">
          {images.map((image) => (
            <ImageCard 
              key={image.id} 
              image={image} 
              token={token}
              API_BASE_URL={API_BASE_URL}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewImagesPage;