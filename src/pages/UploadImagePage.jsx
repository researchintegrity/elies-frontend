
// src/components/UploadImagePage.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FiImage,
  FiUploadCloud,
  FiPlus,
  FiTrash2,
  FiCheck
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

import './UploadImagePage.css';

const API_BASE_URL = 'http://localhost:8000';

// --- Funções Auxiliares ---

// Formata bytes para KB, MB, GB
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// --- Componente Principal ---

const UploadImagePage = () => {
  // Estado para guardar os arquivos (que são objetos File)
  const [files, setFiles] = useState([]);

  // Get authentication token from context
  const { token } = useAuth();

  // Função chamada ao soltar ou selecionar arquivos
  const onDrop = useCallback((acceptedFiles) => {

    // Adiciona os novos arquivos, criando um ID e uma URL de miniatura
    const newFiles = acceptedFiles.map(file => Object.assign(file, {
      id: Math.random().toString(36).substring(7),
      preview: URL.createObjectURL(file) // Cria URL para a miniatura
    }));

    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  }, []);

  // Remove um arquivo da lista
  const removeFile = (fileId) => {
    // Encontra o arquivo para revogar a URL da miniatura
    const fileToRemove = files.find(file => file.id === fileId);
    if (fileToRemove) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
  };

  // Remove todos os arquivos ("Cancelar")
  const removeAllFiles = () => {
    // Revoga todas as URLs de miniatura antes de limpar
    files.forEach(file => URL.revokeObjectURL(file.preview));
    setFiles([]);
  };

  // [IMPORTANTE] Limpeza de Memória
  // Revoga as URLs de miniatura quando o componente é desmontado
  useEffect(() => {
    return () => {
      files.forEach(file => URL.revokeObjectURL(file.preview));
    };
  }, [files]);


  // Configuração do Dropzone
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { // Aceita apenas os principais tipos de imagem
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    noClick: false, // Permite clique no dropzone
    noKeyboard: true,
  });

  // [IMPORTANTE] Função de envio para a API
  const handleSubmit = async () => {
    if (files.length === 0) {
      alert('Por favor, selecione pelo menos uma imagem.');
      return;
    }

    console.log("Iniciando envio das imagens...");

    if (!token) {
      alert('Você não está autenticado. Por favor, faça login novamente.');
      return;
    }

    // Upload each file individually to the backend
    let successCount = 0;
    let failureCount = 0;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        console.log(`Uploading: ${file.name} `);

        const response = await fetch(`${API_BASE_URL}/images/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token} `
          },
          body: formData
        });

        const data = await response.json();

        if (response.ok) {
          console.log(`Success: ${file.name} `, data);
          successCount++;
        } else {
          console.error(`Failed: ${file.name} `, data);
          failureCount++;
          alert(`Erro ao upload ${file.name}: ${data.detail || data.message || 'Unknown error'} `);
        }
      } catch (error) {
        console.error(`Error uploading ${file.name}: `, error);
        failureCount++;
        alert(`Erro na requisição para ${file.name}: ${error.message} `);
      }
    }

    // Show summary
    if (successCount > 0) {
      alert(`Upload concluído: ${successCount} imagem(ns) enviada(s) com sucesso${failureCount > 0 ? `, ${failureCount} falhou` : ''} !`);
      if (failureCount === 0) {
        removeAllFiles(); // Clear list only if all uploads succeeded
      }
    } else {
      alert(`Nenhuma imagem foi enviada.Tente novamente.`);
    }
  };

  const hasFiles = files.length > 0;

  return (
    <div className="upload-modal">
      <div className="upload-image-container">
        {/* --- CABEÇALHO --- */}
        <div className="upload-header">
          <div className="header-icon-wrapper">
            <FiImage className="icon" />
          </div>
          <h2>Upload de Imagens</h2>
          <p className="upload-subtitle">Adicione imagens para análise de integridade</p>
        </div>

        {/* --- ÁREA DE DROPZONE (HERO) --- */}
        {/* S
        */}

        {!hasFiles ? (
          <div
            {...getRootProps()}
            className={`dropzone hero - dropzone ${isDragActive ? 'active' : ''} `}
          >
            <input {...getInputProps()} />
            <div className="dropzone-content">
              <div className="icon-circle">
                <FiUploadCloud className="drop-icon" />
              </div>
              <h3>Arraste e solte suas imagens aqui</h3>
              <p>ou clique para selecionar do computador</p>
              <span className="file-types">Suporta: PNG, JPG, WEBP</span>
            </div>
          </div>
        ) : (
          <>
            {/* --- LISTA DE ARQUIVOS --- */}
            <div className="file-list-container">
              <div className="file-list-header">
                <h3>Arquivos Selecionados ({files.length})</h3>
                <button className="add-more-button" onClick={open}>
                  <FiPlus /> Adicionar mais
                </button>
              </div>

              <div className="file-list">
                {files.map((file) => (
                  <ImageFileItem
                    key={file.id}
                    file={file}
                    onRemove={removeFile}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* --- RODAPÉ COM BOTÕES --- */}
        <div className="upload-footer">
          <button
            className="footer-button cancel-button"
            onClick={removeAllFiles}
            disabled={!hasFiles}
          >
            Cancelar
          </button>
          <button
            className="footer-button submit-button"
            onClick={handleSubmit}
            disabled={!hasFiles}
          >
            <FiCheck /> Concluir Upload
          </button>
        </div>
      </div>
    </div>
  );
};


// --- Componente de Item de Arquivo (separado) ---

const ImageFileItem = ({ file, onRemove }) => {
  return (
    <div className="image-file-item">
      {/* Miniatura */}
      <div className="image-thumbnail">
        {file.preview ? (
          <img
            src={file.preview}
            alt={file.name}
          />
        ) : (
          <FiImage className="icon" />
        )}
      </div>

      {/* Detalhes (nome, tamanho) */}
      <div className="image-details">
        <div className="file-info">
          <p className="filename">{file.name}</p>
          <span className="filesize">{formatBytes(file.size)}</span>
        </div>
        {/* Barra de progresso visual (mock) */}
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: '100%' }}></div>
        </div>
      </div>

      {/* Ações (lixeira) */}
      <div className="image-actions">
        <button className="action-icon-button delete" onClick={() => onRemove(file.id)}>
          <FiTrash2 />
        </button>
      </div>
    </div>
  );
};

export default UploadImagePage;