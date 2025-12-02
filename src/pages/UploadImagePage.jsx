// src/pages/UploadImagePage.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FiImage,
  FiUploadCloud,
  FiPlus,
  FiTrash2,
  FiCheck,
  FiUpload
} from 'react-icons/fi';
import { useImages } from '../hooks/useImages';
import { showAlert, showToast } from '../utils/alert';

import './UploadImagePage.css';

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

  // Use Custom Hook
  const { uploadImage } = useImages();

  // Função chamada ao soltar ou selecionar arquivos
  const onDrop = useCallback((acceptedFiles) => {
    // Adiciona os novos arquivos, criando um ID e URL de preview
    const newFiles = acceptedFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substring(7)
    }));

    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  }, []);

  // Remove um arquivo da lista
  const removeFile = (fileId) => {
    setFiles(prevFiles => {
      const updatedFiles = prevFiles.filter(file => file.id !== fileId);
      // Revoga a URL do objeto para evitar memory leak (opcional aqui, mas boa prática)
      const removedFile = prevFiles.find(file => file.id === fileId);
      if (removedFile) URL.revokeObjectURL(removedFile.preview);
      return updatedFiles;
    });
  };

  // Remove todos os arquivos ("Cancelar")
  const removeAllFiles = () => {
    // Limpa previews
    files.forEach(file => URL.revokeObjectURL(file.preview));
    setFiles([]);
  };

  // Limpeza de memória ao desmontar o componente
  useEffect(() => {
    return () => files.forEach(file => URL.revokeObjectURL(file.preview));
  }, [files]);

  // Configuração do Dropzone
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.png', '.jpg', '.gif', '.webp']
    },
    noClick: false, // Permite clique no dropzone
    noKeyboard: true,
  });

  // [IMPORTANTE] Função de envio para a API
  const handleSubmit = async () => {
    if (files.length === 0) {
      showAlert('Atenção', 'Por favor, selecione pelo menos uma imagem.', 'warning');
      return;
    }

    console.log("Iniciando envio dos arquivos...");

    // Upload each file individually to the backend
    let successCount = 0;
    let failureCount = 0;

    for (const file of files) {
      console.log(`Uploading Image: ${file.name} `);

      const result = await uploadImage(file);

      if (result.success) {
        console.log(`Success: ${file.name}`);
        successCount++;
      } else {
        console.error(`Failed: ${file.name}`, result.error);
        failureCount++;
        showToast(`Erro ao upload ${file.name}: ${result.error}`, 'error');
      }
    }

    // Show summary
    if (successCount > 0) {
      if (failureCount === 0) {
        showAlert('Sucesso!', `Upload concluído: ${successCount} imagem(ns) enviada(s) com sucesso!`, 'success');
        removeAllFiles();
      } else {
        showAlert('Concluído Parcialmente', `Upload concluído: ${successCount} sucesso(s), ${failureCount} falha(s).`, 'warning');
      }
    } else {
      showAlert('Falha no Upload', `Nenhuma imagem foi enviada. Tente novamente.`, 'error');
    }
  };

  const hasFiles = files.length > 0;

  return (
    <div className="upload-modal">
      <div className="upload-image-container">
        {/* --- CABEÇALHO --- */}
        <div className="upload-header">
          <div className="header-icon-wrapper">
            <FiUpload className="icon" />
          </div>
          <h2>Upload de Imagens</h2>
          <p className="upload-subtitle">Adicione imagens para análise e processamento</p>
        </div>

        {/* --- ÁREA DE DROPZONE (HERO) --- */}
        {!hasFiles ? (
          <div
            {...getRootProps()}
            className={`dropzone hero-dropzone ${isDragActive ? 'active' : ''} `}
          >
            <input {...getInputProps()} />
            <div className="dropzone-content">
              <div className="icon-circle">
                <FiUploadCloud className="drop-icon" />
              </div>
              <h3>Arraste e solte suas imagens aqui</h3>
              <p>ou clique para selecionar do computador</p>
              <span className="file-types">Suporta: JPG, PNG, GIF, WEBP</span>
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
        {file.type.startsWith('image/') ? (
          <img src={file.preview} alt={file.name} />
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