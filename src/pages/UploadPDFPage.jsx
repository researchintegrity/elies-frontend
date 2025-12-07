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

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const UploadPDFPage = () => {
  const [files, setFiles] = useState([]);
  const { uploadDocument } = useDocuments();

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => Object.assign(file, {
      id: Math.random().toString(36).substring(7),
    }));

    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  }, []);

  const removeFile = (fileId) => {
    setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
  };

  const removeAllFiles = () => {
    setFiles([]);
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    noClick: false,
    noKeyboard: true,
  });

  const handleSubmit = async () => {
    if (files.length === 0) {
      showAlert('Atenção', 'Por favor, selecione pelo menos um PDF.', 'warning');
      return;
    }

    console.log("Iniciando envio dos arquivos...");

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
    <div className="flex justify-center items-center min-h-[80vh] p-8">
      <div className="w-full max-w-[900px] mx-auto px-12 py-12 rounded-[24px] border border-modal-light dark:border-modal-dark 
        shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-[12px] bg-modal-bg-light dark:bg-modal-bg-dark
        flex flex-col gap-8 transition-all duration-300">

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[rgba(110,86,207,0.2)] to-[rgba(110,86,207,0.05)] rounded-[20px] 
            flex items-center justify-center mb-6 border border-[rgba(110,86,207,0.2)]">
            <FiUpload className="text-3xl text-toggle-accent" />
          </div>
          <h2 className="text-[1.75rem] font-bold text-text-primary dark:text-white mb-2">
            Upload de PDF
          </h2>
          <p className="text-text-secondary text-base">
            Adicione documentos PDF para extração e análise
          </p>
        </div>

        {/* Dropzone or File List */}
        {!hasFiles ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-[20px] px-8 py-16 text-center cursor-pointer 
              min-h-[300px] flex flex-col items-center justify-center
              transition-all duration-300 ease-out
              ${isDragActive
                ? 'bg-[rgba(110,86,207,0.05)] border-toggle-accent -translate-y-0.5'
                : 'bg-dropzone-light dark:bg-dropzone-dark border-dropzone-light dark:border-dropzone-dark hover:bg-[rgba(110,86,207,0.05)] hover:border-toggle-accent hover:-translate-y-0.5'
              }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-icon-light dark:bg-icon-dark rounded-full flex items-center justify-center mb-4
                transition-all duration-300 hover:scale-110 hover:bg-[rgba(110,86,207,0.2)]">
                <FiUploadCloud className="text-[2.5rem] text-text-primary dark:text-white" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary dark:text-white">
                Arraste e solte seus PDFs aqui
              </h3>
              <p className="text-text-secondary text-base">
                ou clique para selecionar do computador
              </p>
              <span className="mt-4 text-sm text-text-secondary opacity-70 bg-icon-light dark:bg-icon-dark px-4 py-2 rounded-[20px]">
                Suporta: PDF
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full animate-[fadeIn_0.3s_ease]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg text-text-primary dark:text-white font-semibold">
                Arquivos Selecionados ({files.length})
              </h3>
              <button
                className="bg-transparent border border-surface-light dark:border-surface-dark text-text-secondary 
                  px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 text-sm transition-all duration-200
                  hover:bg-hover-light dark:hover:bg-hover-dark hover:text-text-primary dark:hover:text-white hover:border-text-secondary"
                onClick={open}
              >
                <FiPlus /> Adicionar mais
              </button>
            </div>

            <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-custom">
              {files.map((file) => (
                <PDFFileItem
                  key={file.id}
                  file={file}
                  onRemove={removeFile}
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-end gap-4 mt-auto pt-4">
          <button
            className="px-7 py-3.5 rounded-[10px] font-semibold text-[0.95rem] cursor-pointer transition-all duration-200
              bg-transparent border border-transparent text-text-secondary
              hover:text-text-primary dark:hover:text-white hover:bg-hover-light dark:hover:bg-hover-dark
              disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={removeAllFiles}
            disabled={!hasFiles}
          >
            Cancelar
          </button>
          <button
            className="px-7 py-3.5 rounded-[10px] font-semibold text-[0.95rem] cursor-pointer transition-all duration-200
              flex items-center gap-2 bg-toggle-accent border-none text-white shadow-[0_4px_12px_rgba(110,86,207,0.3)]
              hover:bg-[#7a52c3] hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(110,86,207,0.4)]
              disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
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


// PDF File Item Component
const PDFFileItem = ({ file, onRemove }) => {
  return (
    <div className="flex items-center px-4 py-4 bg-surface dark:bg-surface-dark border border-surface-light dark:border-surface-dark 
      rounded-xl gap-6 transition-colors duration-200 hover:bg-hover-light dark:hover:bg-hover-dark">

      {/* PDF Icon */}
      <div className="w-[70px] h-[50px] rounded-lg bg-red-500/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
        <FiFileText className="text-2xl text-red-500" />
      </div>

      {/* Details */}
      <div className="flex-grow flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <p className="font-medium text-text-primary dark:text-white text-[0.95rem]">
            {file.name}
          </p>
          <span className="text-sm text-text-secondary">
            {formatBytes(file.size)}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-1 bg-icon-light dark:bg-icon-dark rounded-sm overflow-hidden">
          <div className="h-full bg-toggle-accent rounded-sm" style={{ width: '100%' }}></div>
        </div>
      </div>

      {/* Actions */}
      <button
        className="bg-transparent border-none text-text-secondary cursor-pointer p-2 rounded-md 
          transition-all duration-200 flex items-center justify-center
          hover:bg-red-500/10 hover:text-red-500"
        onClick={() => onRemove(file.id)}
      >
        <FiTrash2 />
      </button>
    </div>
  );
};

export default UploadPDFPage;
