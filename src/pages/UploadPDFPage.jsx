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
import { api } from '../services/api';
import { useExtractionProgress } from '../hooks/useExtractionProgress';
import { useLanguage } from '../context/LanguageContext';
import { showAlert, showToast } from '../utils/alert';
import ExtractionProgressBar from '../components/common/ExtractionProgressBar';

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
  const [isUploading, setIsUploading] = useState(false);
  const { extractionStatus, isExtracting, startExtractionPolling, reset: resetExtraction } = useExtractionProgress();
  const { t } = useLanguage();

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
    resetExtraction();
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
      showAlert(t('common.warning'), t('upload.selectAtLeastOnePdf'), 'warning');
      return;
    }

    setIsUploading(true);
    resetExtraction();

    const uploadedDocIds = [];
    let successCount = 0;
    let failureCount = 0;

    for (const file of files) {
      try {
        // Upload document and get the response with document ID
        const formData = new FormData();
        formData.append('file', file);
        const data = await api.post('/documents/upload', formData, true);

        if (data && data._id) {
          uploadedDocIds.push(data._id);
        }
        successCount++;
      } catch (err) {
        console.error(`Failed: ${file.name}`, err);
        failureCount++;
        showToast(`${t('common.error')}: ${file.name}: ${err.message}`, 'error');
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      if (failureCount > 0) {
        showToast(
          `${successCount} uploaded, ${failureCount} failed`,
          'warning'
        );
      } else {
        showToast(
          `${successCount} ${t('upload.pdfsUploaded') || 'PDF(s) uploaded'}`,
          'success'
        );
      }

      // Start polling for extraction progress
      if (uploadedDocIds.length > 0) {
        startExtractionPolling(uploadedDocIds);
      }

      // Clear files after successful upload
      setFiles([]);
    } else {
      showAlert(t('common.error'), t('upload.uploadFailed'), 'error');
    }
  };

  const handleExtractionComplete = (status) => {
    if (status.status === 'completed') {
      showAlert(
        t('common.success'),
        `${status.total_extracted} ${t('upload.imagesExtracted') || 'images extracted from'} ${status.total_documents} PDF(s)`,
        'success'
      );
    } else if (status.status === 'partial') {
      showAlert(
        t('upload.uploadPartial') || 'Partially Completed',
        `${status.completed_documents - status.failed_documents} completed, ${status.failed_documents} failed`,
        'warning'
      );
    }
  };

  const hasFiles = files.length > 0;
  const isProcessing = isUploading || isExtracting;

  return (
    <div className="flex justify-center items-center min-h-[80vh] p-8">
      <div className="w-full max-w-[900px] mx-auto px-12 py-12 rounded-2xl border border-gray-200 dark:border-gray-800 
        shadow-xl backdrop-blur-xl bg-white/80 dark:bg-dark-card/80
        flex flex-col gap-8 transition-all duration-300">

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500/20 to-red-500/5 rounded-2xl 
            flex items-center justify-center mb-6 border border-red-500/20">
            <FiUpload className="text-3xl text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('upload.pdfTitle')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-base">
            {t('upload.pdfSubtitle')}
          </p>
        </div>

        {/* Extraction Progress Bar */}
        {(isExtracting || extractionStatus?.status === 'completed' || extractionStatus?.status === 'partial') && (
          <ExtractionProgressBar
            status={extractionStatus}
            onComplete={handleExtractionComplete}
          />
        )}

        {/* Dropzone or File List */}
        <input {...getInputProps()} />
        {!hasFiles && !isExtracting ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl px-8 py-16 text-center cursor-pointer 
              min-h-[300px] flex flex-col items-center justify-center
              transition-all duration-300 ease-out
              ${isDragActive
                ? 'bg-red-500/5 border-red-500 -translate-y-0.5'
                : 'bg-gray-50 dark:bg-dark-card/50 border-gray-300 dark:border-gray-700 hover:bg-red-500/5 hover:border-red-500 hover:-translate-y-0.5'
              }`}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4
                transition-all duration-300 hover:scale-110 hover:bg-red-500/20">
                <FiUploadCloud className="text-4xl text-gray-600 dark:text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('upload.dragDropPdfs')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-base">
                {t('upload.orClick')}
              </p>
              <span className="mt-4 text-sm text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full">
                {t('upload.supportsPdf')}
              </span>
            </div>
          </div>
        ) : hasFiles && (
          <div className="w-full animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg text-gray-900 dark:text-white font-semibold">
                {t('upload.selectedFiles')} ({files.length})
              </h3>
              <button
                className="bg-transparent border border-gray-200 dark:border-gray-700 text-gray-500 
                  px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 text-sm transition-all duration-200
                  hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white hover:border-gray-300
                  disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={open}
                disabled={isProcessing}
              >
                <FiPlus /> {t('common.addMore')}
              </button>
            </div>

            <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-custom">
              {files.map((file) => (
                <PDFFileItem
                  key={file.id}
                  file={file}
                  onRemove={removeFile}
                  disabled={isProcessing}
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-end gap-4 mt-auto pt-4">
          <button
            className="px-7 py-3.5 rounded-xl font-semibold text-sm cursor-pointer transition-all duration-200
              bg-transparent border border-transparent text-gray-500
              hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800
              disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={removeAllFiles}
            disabled={!hasFiles || isProcessing}
          >
            {t('common.cancel')}
          </button>
          <button
            className="px-7 py-3.5 rounded-xl font-semibold text-sm cursor-pointer transition-all duration-200
              flex items-center gap-2 bg-red-500 border-none text-white shadow-lg shadow-red-500/25
              hover:bg-red-600 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-500/30
              disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
            onClick={handleSubmit}
            disabled={!hasFiles || isProcessing}
          >
            {isUploading ? (
              <>
                <span className="animate-spin">⟳</span> {t('upload.uploading') || 'Uploading...'}
              </>
            ) : (
              <>
                <FiCheck /> {t('upload.completeUpload')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


// PDF File Item Component
const PDFFileItem = ({ file, onRemove, disabled = false }) => {
  return (
    <div className="flex items-center px-4 py-4 bg-gray-50 dark:bg-dark-card/50 border border-gray-200 dark:border-gray-700 
      rounded-xl gap-6 transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-dark-card">

      {/* PDF Icon */}
      <div className="w-[70px] h-[50px] rounded-lg bg-red-500/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
        <FiFileText className="text-2xl text-red-500" />
      </div>

      {/* Details */}
      <div className="flex-grow flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <p className="font-medium text-gray-900 dark:text-white text-sm">
            {file.name}
          </p>
          <span className="text-sm text-gray-400">
            {formatBytes(file.size)}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-red-500 rounded-full" style={{ width: '100%' }}></div>
        </div>
      </div>

      {/* Actions */}
      <button
        className="bg-transparent border-none text-gray-400 cursor-pointer p-2 rounded-lg 
          transition-all duration-200 flex items-center justify-center
          hover:bg-red-500/10 hover:text-red-500
          disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => onRemove(file.id)}
        disabled={disabled}
      >
        <FiTrash2 />
      </button>
    </div>
  );
};

export default UploadPDFPage;

