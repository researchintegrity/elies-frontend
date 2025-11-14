// src/components/UploadPDFPage.jsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  FiUploadCloud, 
  FiFileText, 
  FiTrash2, 
  FiCheckSquare, 
  FiPlus,
  FiUpload
} from 'react-icons/fi';

import './UploadPDFPage.css';

const UploadPDFPage = () => {
  // Estado para guardar os arquivos selecionados
  const [files, setFiles] = useState([]);

  // Função chamada quando os arquivos são soltos ou selecionados
  const onDrop = useCallback((acceptedFiles) => {
    // Adiciona os novos arquivos à lista existente
    // Adicionamos um 'id' simples (no mundo real, usaria 'uuid')
    const newFiles = acceptedFiles.map(file => Object.assign(file, {
      id: Math.random().toString(36).substring(7),
      progress: 100, // Simular upload completo por enquanto
    }));
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  }, []);

  // Função para remover um arquivo da lista
  const removeFile = (fileId) => {
    setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
  };
  
  // Função para remover todos os arquivos
  const removeAllFiles = () => {
    setFiles([]);
  };

  // Configuração do Dropzone
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'], // Aceita apenas PDFs
    },
    noClick: true, // Desativa o clique, pois faremos um botão "Adicionar"
    noKeyboard: true,
  });
  
  // Função que será chamada pela API (simulação)
  const handleUpload = () => {
    console.log("Iniciando upload dos arquivos:", files);
    // Aqui você chamaria sua API
    alert(`Enviando ${files.length} arquivos para a API!`);
  };

  return (
    <div className="upload-container">
      {/* --- CABEÇALHO --- */}
      <div className="upload-header">
        <FiUpload className="icon" />
        <h2>Upload de PDF</h2>
      </div>

      {/* --- ÁREA DE DROPZONE --- */}
      <div 
        {...getRootProps()} 
        className={`dropzone ${isDragActive ? 'active' : ''}`}
      >
        <input {...getInputProps()} />
        <FiUploadCloud className="drop-icon" />
        {isDragActive ? (
          <p>Solte os PDFs aqui ...</p>
        ) : (
          <p>Solte aqui os PDFs que deseja analisar</p>
        )}
      </div>
      
      {/* --- CABEÇALHO DA LISTA DE ARQUIVOS (com botão Adicionar) --- */}
      <div className="file-list-header">
        <h3>PDFs</h3>
        {/* O botão 'open' vem do react-dropzone e abre a janela de seleção */}
        <button className="add-button" onClick={open}>
          <FiPlus />
          ADICIONAR PDF
        </button>
      </div>

      {/* --- LISTA DE ARQUIVOS --- */}
      <div className="file-list">
        {files.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            Nenhum arquivo adicionado ainda.
          </p>
        )}
        
        {files.map((file, index) => (
          <FileItem 
            key={file.id} 
            file={file} 
            index={index + 1} 
            onRemove={removeFile} 
          />
        ))}
      </div>

      {/* --- RODAPÉ COM BOTÕES --- */}
      <div className="upload-footer">
        <button 
          className="footer-button cancel-button" 
          onClick={removeAllFiles}
        >
          Cancelar
        </button>
        <button 
          className="footer-button submit-button"
          onClick={handleUpload}
        >
          Fazer Upload
        </button>
      </div>
    </div>
  );
};

// --- Componente de Item de Arquivo (separado) ---

const FileItem = ({ file, index, onRemove }) => {
  return (
    <div className="file-item">
      {/* Ícone com a inicial (P de PDF) */}
      <div className="file-icon">P</div>
      
      {/* Detalhes do arquivo e barra de progresso */}
      <div className="file-details">
        <p>PDF {index.toString().padStart(2, '0')}</p>
        <div className="progress-bar">
          <div style={{ width: `${file.progress}%` }}></div>
        </div>
      </div>

      {/* Ações do item (Remover, Check) */}
      <div className="file-actions">
        {/* Usamos o 'name' do arquivo para o checkbox, mas no seu design parece fixo */}
        <FiCheckSquare className="icon-button" style={{ color: 'var(--color-toggle-accent)'}} />
        <FiTrash2 className="icon-button" onClick={() => onRemove(file.id)} />
      </div>
    </div>
  );
};

export default UploadPDFPage;