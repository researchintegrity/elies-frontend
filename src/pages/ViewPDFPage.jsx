// src/pages/ViewPDFPage.jsx
import React, { useState, useEffect } from 'react';
import './ViewPDFPage.css';
import { FiLoader, FiAlertTriangle, FiRefreshCw, FiDownload, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:8000';

const ViewPDFPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get authentication token from context
  const { token } = useAuth();

  // Fetch documents from the API
  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!token) {
        throw new Error('Você não está autenticado. Por favor, faça login novamente.');
      }

      console.log('Fetching documents with token:', token ? '✅ Present' : '❌ Missing');

      // Use Core API endpoint which returns a direct list of documents
      const response = await fetch(`${API_BASE_URL}/documents?limit=100&offset=0`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}: Não foi possível buscar os documentos.`;
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Core API returns a direct array of documents
      if (Array.isArray(data)) {
        // Transform API data to match the component's expected format
        const transformedDocs = data.map(doc => ({
          id: doc._id,
          filename: doc.filename,
          uploadedDate: doc.uploaded_date,
          fileSize: doc.file_size,
          extractionStatus: doc.extraction_status || 'pending',
          extractedImageCount: doc.extracted_image_count || 0
        }));

        setDocuments(transformedDocs);
      } else {
        console.error('Unexpected API response format:', data);
        throw new Error('Formato de resposta inválido da API: Esperado um array.');
      }

    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete document
  const deleteDocument = async (docId) => {
    if (!window.confirm('Tem certeza que deseja deletar este documento?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Não foi possível deletar o documento.');
      }

      // Remove from list
      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docId));
      alert('✅ Documento deletado com sucesso!');
    } catch (err) {
      console.error('Error deleting document:', err);
      alert(`❌ Erro ao deletar: ${err.message}`);
    }
  };

  // Download document
  const downloadDocument = async (docId, filename) => {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${docId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download document: ${response.statusText}`);
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create a temporary download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading document:', err);
      alert(`❌ Erro ao baixar: ${err.message}`);
    }
  };

  // Fetch documents when component mounts
  useEffect(() => {
    fetchDocuments();
  }, [token]);

  // --- Renderização de Loading, Erro e Sucesso ---

  if (loading) {
    return (
      <div className="page-status-container">
        <FiLoader className="loading-spinner" />
        <p>Carregando documentos...</p>
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
          onClick={fetchDocuments}
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
    <div className="view-pdf-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2>Documentos PDF</h2>
          <p>Total: {documents.length} documento(s)</p>
        </div>
        <button
          onClick={fetchDocuments}
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

      {documents.length === 0 ? (
        <div className="page-status-container">
          <p>Nenhum documento encontrado. Envie um PDF primeiro!</p>
        </div>
      ) : (
        <div className="documents-grid">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="document-card"
            >
              <div className="document-icon">📄</div>
              <div className="document-info">
                <h4 className="document-title">{doc.filename}</h4>
                <p className="document-date">
                  {new Date(doc.uploadedDate).toLocaleDateString('pt-BR')}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  <span className={`status-badge status-${doc.extractionStatus}`}>
                    {doc.extractionStatus === 'completed' ? '✅ Completo' :
                      doc.extractionStatus === 'processing' ? '⏳ Processando' :
                        '⏸️ Aguardando'}
                  </span>
                  {doc.extractedImageCount > 0 && (
                    <span style={{ marginLeft: '0.5rem' }}>
                      {doc.extractedImageCount} imagem(ns)
                    </span>
                  )}
                </p>
              </div>
              <div className="document-actions">
                <button
                  className="action-button download-btn"
                  onClick={() => downloadDocument(doc.id, doc.filename)}
                  title="Download"
                >
                  <FiDownload />
                </button>
                <button
                  className="action-button delete-btn"
                  onClick={() => deleteDocument(doc.id)}
                  title="Deletar"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewPDFPage;
