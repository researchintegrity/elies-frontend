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
import { useIndexingProgress } from '../hooks/useIndexingProgress';
import { useLanguage } from '../context/LanguageContext';
import { showAlert, showToast } from '../utils/alert';
import IndexingProgressBar from '../components/common/IndexingProgressBar';

// Format bytes to KB, MB, GB
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const UploadImagePage = () => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const { uploadImagesBatch } = useImages();
  const { indexingStatus, isIndexing, startIndexingPolling, reset: resetIndexing } = useIndexingProgress();
  const { t } = useLanguage();

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substring(7)
    }));

    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  }, []);

  const removeFile = (fileId) => {
    setFiles(prevFiles => {
      const updatedFiles = prevFiles.filter(file => file.id !== fileId);
      const removedFile = prevFiles.find(file => file.id === fileId);
      if (removedFile) URL.revokeObjectURL(removedFile.preview);
      return updatedFiles;
    });
  };

  const removeAllFiles = () => {
    files.forEach(file => URL.revokeObjectURL(file.preview));
    setFiles([]);
    resetIndexing();
  };

  useEffect(() => {
    return () => files.forEach(file => URL.revokeObjectURL(file.preview));
  }, [files]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.png', '.jpg', '.gif', '.webp']
    },
    noClick: false,
    noKeyboard: true,
  });

  const handleSubmit = async () => {
    if (files.length === 0) {
      showAlert(t('common.warning'), t('upload.selectAtLeastOneImage'), 'warning');
      return;
    }

    setIsUploading(true);
    resetIndexing();

    try {
      // Use batch upload API
      const result = await uploadImagesBatch(files);

      if (result.success) {
        showToast(
          `${result.uploaded_count} ${t('upload.imagesUploaded') || 'images uploaded'}`,
          'success'
        );

        // Start polling for indexing progress
        if (result.job_id) {
          startIndexingPolling(result.job_id);
        }

        // Clear files after successful upload
        files.forEach(file => URL.revokeObjectURL(file.preview));
        setFiles([]);
      } else {
        showAlert(t('common.error'), result.error || t('upload.uploadFailed'), 'error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showAlert(t('common.error'), err.message || t('upload.uploadFailed'), 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleIndexingComplete = (status) => {
    if (status.status === 'completed') {
      showAlert(
        t('common.success'),
        `${status.indexed_images} ${t('upload.imagesIndexed') || 'images indexed successfully'}`,
        'success'
      );
    } else if (status.status === 'partial') {
      showAlert(
        t('upload.uploadPartial') || 'Partially Completed',
        `${status.indexed_images} indexed, ${status.failed_images} failed`,
        'warning'
      );
    }
  };

  const hasFiles = files.length > 0;
  const isProcessing = isUploading || isIndexing;

  return (
    <div className="flex justify-center items-center min-h-[80vh] p-8">
      <div className="w-full max-w-[900px] mx-auto px-12 py-12 rounded-2xl border border-gray-200 dark:border-gray-800 
        shadow-xl backdrop-blur-xl bg-white/80 dark:bg-dark-card/80
        flex flex-col gap-8 transition-all duration-300">

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500/20 to-primary-500/5 rounded-2xl 
            flex items-center justify-center mb-6 border border-primary-500/20">
            <FiUpload className="text-3xl text-primary-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('upload.title')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-base">
            {t('upload.subtitle')}
          </p>
        </div>

        {/* Indexing Progress Bar */}
        {(isIndexing || indexingStatus?.status === 'completed' || indexingStatus?.status === 'partial') && (
          <IndexingProgressBar
            status={indexingStatus}
            onComplete={handleIndexingComplete}
          />
        )}

        {/* Dropzone or File List */}
        <input {...getInputProps()} />
        {!hasFiles && !isIndexing ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl px-8 py-16 text-center cursor-pointer 
              min-h-[300px] flex flex-col items-center justify-center
              transition-all duration-300 ease-out
              ${isDragActive
                ? 'bg-primary-500/5 border-primary-500 -translate-y-0.5'
                : 'bg-gray-50 dark:bg-dark-card/50 border-gray-300 dark:border-gray-700 hover:bg-primary-500/5 hover:border-primary-500 hover:-translate-y-0.5'
              }`}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4
                transition-all duration-300 hover:scale-110 hover:bg-primary-500/20">
                <FiUploadCloud className="text-4xl text-gray-600 dark:text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('upload.dragDropImages')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-base">
                {t('upload.orClick')}
              </p>
              <span className="mt-4 text-sm text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full">
                {t('upload.supportsImages')}
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
                <ImageFileItem
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
              flex items-center gap-2 bg-primary-500 border-none text-white shadow-lg shadow-primary-500/25
              hover:bg-primary-600 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-500/30
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


// Image File Item Component
const ImageFileItem = ({ file, onRemove, disabled = false }) => {
  return (
    <div className="flex items-center px-4 py-4 bg-gray-50 dark:bg-dark-card/50 border border-gray-200 dark:border-gray-700 
      rounded-xl gap-6 transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-dark-card">

      {/* Thumbnail */}
      <div className="w-[70px] h-[50px] rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
        {file.type.startsWith('image/') ? (
          <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
        ) : (
          <FiImage className="w-full h-full p-3 text-gray-400" />
        )}
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
          <div className="h-full bg-primary-500 rounded-full" style={{ width: '100%' }}></div>
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

export default UploadImagePage;
