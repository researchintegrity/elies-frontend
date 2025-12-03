// src/pages/UploadPDFPage.jsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FiFileText,
  FiUploadCloud,
  FiPlus,
  FiTrash2,
  FiCheck,
  FiUpload
} from 'react-icons/fi';
import { useDocuments } from '../hooks/useDocuments';
import { showAlert, showToast } from '../utils/alert';

import './UploadPDFPage.css';

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

const UploadPDFPage = () => {
  // Estado para guardar os arquivos (que são objetos File)
  const [files, setFiles] = useState([]);

  // Use Custom Hook
  const { uploadDocument } = useDocuments();

  // Função chamada ao soltar ou selecionar arquivos
  const onDrop = useCallback((acceptedFiles) => {
    // Adiciona os novos arquivos, criando um ID
    const newFiles = acceptedFiles.map(file => Object.assign(file, {
      id: Math.random().toString(36).substring(7),
      // PDFs não precisam de preview de imagem imediato, mas mantemos a estrutura
    }));

    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  }, []);

  // Remove um arquivo da lista
  const removeFile = (fileId) => {
    setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
  };

  // Remove todos os arquivos ("Cancelar")
  const removeAllFiles = () => {
    setFiles([]);
  };

  // Configuração do Dropzone
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'], // Aceita apenas PDFs
    },
    noClick: false, // Permite clique no dropzone
    noKeyboard: true,
  });

  // [IMPORTANTE] Função de envio para a API
  const handleSubmit = async () => {
    if (files.length === 0) {
      showAlert('Atenção', 'Por favor, selecione pelo menos um PDF.', 'warning');
      return;
    }

    console.log("Iniciando envio dos arquivos...");

    // Upload each file individually to the backend
    let successCount = 0;
    let failureCount = 0;

    for (const file of files) {
      console.log(`Uploading PDF: ${file.name} `);

      const result = await uploadDocument(file);

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
        showAlert('Sucesso!', `Upload concluído: ${successCount} PDF(s) enviado(s) com sucesso!`, 'success');
        removeAllFiles();
      } else {
        showAlert('Concluído Parcialmente', `Upload concluído: ${successCount} sucesso(s), ${failureCount} falha(s).`, 'warning');
      }
    } else {
      showAlert('Falha no Upload', `Nenhum PDF foi enviado. Tente novamente.`, 'error');
    }
  };

  const hasFiles = files.length > 0;

  return (
    <div className="upload-modal">
      <div className="upload-pdf-container">
        {/* --- CABEÇALHO --- */}
        <div className="upload-header">
          <div className="header-icon-wrapper">
            <FiUpload className="icon" />
          </div>
          <h2>Upload de PDF</h2>
          <p className="upload-subtitle">Adicione documentos PDF para extração e análise</p>
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
              <h3>Arraste e solte seus PDFs aqui</h3>
              <p>ou clique para selecionar do computador</p>
              <span className="file-types">Suporta: PDF</span>
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
                  <PDFFileItem
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

const PDFFileItem = ({ file, onRemove }) => {
  return (
    <div className="image-file-item">
      {/* Ícone de PDF (no lugar da miniatura) */}
      <div className="image-thumbnail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 0, 0, 0.1)' }}>
        <FiFileText className="icon" style={{ fontSize: '1.5rem', color: '#ff4d4d' }} />
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

export default UploadPDFPage;