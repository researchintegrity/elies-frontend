// src/pages/ViewImagesPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext'; // Para pegar o token
import './ViewImagesPage.css'; // Criaremos este CSS
import { FiLoader, FiAlertTriangle } from 'react-icons/fi';

// --- DADOS SIMULADOS (Substitua pela sua API) ---
// Sua API real deve retornar algo parecido com isso:
const fakeApiData = [
  {
    id: 'img1',
    title: 'Imagem_Processada_001.png',
    url: 'https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?w=400',
    processedAt: '2025-11-04T14:30:00Z',
  },
  {
    id: 'img2',
    title: 'Analise_Microscopica.jpg',
    url: 'https://images.unsplash.com/photo-1574169208507-84376144848b?w=400',
    processedAt: '2025-11-03T11:15:00Z',
  },
  {
    id: 'img3',
    title: 'DNA_Scan_03.webp',
    url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400',
    processedAt: '2025-11-02T09:05:00Z',
  },
];
// --- FIM DOS DADOS SIMULADOS ---


const ViewImagesPage = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pegue o token do seu AuthContext para enviar na requisição
  const { token } = useAuth();

  // Esta função será chamada quando a página carregar
  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      setError(null);
      
      /* // ############ API AQUI (Este é o código real) ############
      try {
        const response = await fetch('https://SUA-API.com/get-images', {
          headers: {
            'Authorization': `Bearer ${token}`, // Envia o token
          },
        });
        
        if (!response.ok) {
          throw new Error('Não foi possível buscar as imagens.');
        }
        
        const data = await response.json();
        setImages(data); // Salva os dados da API no estado

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      // ########################################################
      */

      // --- SIMULAÇÃO (Remova isso quando conectar sua API) ---
      console.log("Simulando fetch da API com token:", token);
      setTimeout(() => {
        setImages(fakeApiData);
        setLoading(false);
      }, 1500); // Simula 1.5s de loading
      // --- FIM DA SIMULAÇÃO ---
    };

    fetchImages();
  }, [token]); // Roda o 'fetch' quando o componente carregar (e se o token mudar)

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
      </div>
    );
  }

  return (
    <div className="view-images-container">
      <h2>Imagens Carregadas</h2>
      <p>Aqui estão todas as imagens processadas pela plataforma.</p>
      
      {images.length === 0 ? (
        <div className="page-status-container">
          <p>Nenhuma imagem encontrada.</p>
        </div>
      ) : (
        <div className="image-grid">
          {images.map((image) => (
            <div 
              key={image.id} 
              className="image-card" 
              onClick={() => alert(`Você clicou na Imagem ID: ${image.id}`)}
            >
              <img src={image.url} alt={image.title} className="image-card-img" />
              <div className="image-card-info">
                <h4 className="image-card-title">{image.title}</h4>
                <p className="image-card-date">
                  Processada em: {new Date(image.processedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewImagesPage;