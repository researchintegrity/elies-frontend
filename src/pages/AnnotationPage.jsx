// src/pages/AnnotationPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import AnnotationModal from './AnnotationModal';
import { useImages } from '../hooks/useImages';
import ImageThumbnail from '../components/common/ImageThumbnail';
import EmptyState from '../components/common/EmptyState';
import {
  FiLoader,
  FiSearch,
  FiFilter,
  FiImage
} from 'react-icons/fi';

const AnnotationPage = () => {
  const { t } = useLanguage();
  const { images, loading, error, fetchImages } = useImages();
  const [filteredImages, setFilteredImages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  // Initial fetch
  useEffect(() => {
    fetchImages({ per_page: 100 }); // Initial load
  }, [fetchImages]);

  // Filter logic
  useEffect(() => {
    if (!images) {
      setFilteredImages([]);
      return;
    }

    const results = images.filter(img =>
      img.filename && img.filename.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredImages(results);
  }, [searchTerm, images]);

  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  return (
    <div className="w-full h-full p-8 overflow-y-auto bg-gray-50 dark:bg-dark-deep text-gray-900 dark:text-white scrollbar-custom">
      {/* Header & Breadcrumbs */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">{t('sidebar.annotate')}</h2>
        <p className="text-gray-500 dark:text-gray-400">
          {images ? images.length : 0} {t('image.imagesFound')}
        </p>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400 text-lg" />
          </div>
          <input
            type="text"
            className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700/50 rounded-xl py-3 pl-10 pr-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            placeholder={t('gallery.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-card/80 transition-colors cursor-pointer">
          <FiFilter />
          <span>{t('gallery.sortNewest')}</span>
        </button>
      </div>

      {/* Main Content */}
      {loading && !images.length ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <FiLoader className="text-4xl animate-spin mb-4 text-primary-500" />
          <p>{t('common.loading')}</p>
        </div>
      ) : error ? (
        <EmptyState
          title={t('common.error')}
          description={error}
          icon="alert"
          actionLabel={t('common.retry')}
          onAction={() => fetchImages({ per_page: 100 })}
          showAction={true}
        />
      ) : filteredImages.length === 0 ? (
        <EmptyState
          title={t('cbir.noImages')}
          description={t('cbir.noImagesDescription')}
          icon="image"
        />
      ) : (
        /* Image Grid */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className="group relative bg-white dark:bg-dark-card rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-300 hover:shadow-lg"
              onClick={() => handleImageClick(image)}
            >
              <div className="relative aspect-square">
                <ImageThumbnail
                  imageId={image.id}
                  alt={image.filename}
                  className="w-full h-full"
                  showHoverEffect={true}
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="px-4 py-2 bg-primary-600 text-white text-sm font-bold rounded-full transform translate-y-4 group-hover:translate-y-0 transition-transform shadow-lg">
                    {t('sidebar.annotate')}
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-3 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-gray-900 dark:text-white font-medium text-sm truncate mb-1" title={image.filename}>
                  {image.filename}
                </h4>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    {image.uploadedDate ? new Date(image.uploadedDate).toLocaleDateString() : '-'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                    {image.status || 'UPLOADED'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal - pass just the ID/object, logic to load image inside modal might need checking */}
      {selectedImage && (
        <AnnotationModal
          image={selectedImage}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default AnnotationPage;