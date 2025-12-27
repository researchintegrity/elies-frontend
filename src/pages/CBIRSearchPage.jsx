// src/pages/CBIRSearchPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  FiSearch,
  FiX,
  FiRefreshCw,
  FiAlertTriangle,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiZap,
  FiTarget,
  FiLayers
} from 'react-icons/fi';
import { api } from '../services/api';
import { API_BASE_URL } from '../config/api';
import { showAlert, showToast } from '../utils/alert';
import { useLanguage } from '../context/LanguageContext';
import { SkeletonCard, EmptyState } from '../components/common';

// Helper to get thumbnail URL with auth token
const getThumbnailUrl = (imageId) => {
  const token = localStorage.getItem('authToken');
  return `${API_BASE_URL}/images/${imageId}/thumbnail${token ? `?token=${token}` : ''}`;
};

// --- Sub-Components ---

// Image Card for Source Selection Gallery
const SourceImageCard = ({ image, isSelected, onClick, imageUrl, loading, error }) => (
  <div
    onClick={onClick}
    className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 border-2 ${isSelected
      ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg scale-[1.02]'
      : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
      }`}
  >
    <div className="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
      {loading ? (
        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
      ) : error ? (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <FiAlertTriangle size={24} />
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={image.filename}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      )}
    </div>

    {isSelected && (
      <div className="absolute top-2 right-2 bg-indigo-600 text-white p-1.5 rounded-full shadow-lg">
        <FiCheck size={14} strokeWidth={3} />
      </div>
    )}

    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
      <p className="text-white text-xs font-medium truncate">{image.filename}</p>
      {image.imageType?.length > 0 && (
        <div className="flex gap-1 mt-1 overflow-hidden">
          {image.imageType.slice(0, 2).map(tag => (
            <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-white/20 text-white rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  </div>
);

// Result Card for Search Results - uses thumbnail URL for fast loading
const ResultCard = ({ result, rank, onClick, t }) => {
  // Use thumbnail URL directly - browser handles caching
  const imageUrl = result?.image_id ? getThumbnailUrl(result.image_id) : null;
  const [error, setError] = useState(false);

  const similarityPercent = (result.similarity_score * 100).toFixed(1);
  const getSimilarityTone = (score) => {
    if (score >= 0.9) return 'green';
    if (score >= 0.7) return 'amber';
    return 'red';
  };

  const toneToClasses = (tone) => {
    switch (tone) {
      case 'green':
        return 'text-green-700 border-green-600/40';
      case 'amber':
        return 'text-amber-700 border-amber-600/40';
      default:
        return 'text-red-700 border-red-600/40';
    }
  };

  const similarityTone = getSimilarityTone(result.similarity_score);
  const toneColors = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500'
  };

  return (
    <div
      onClick={() => onClick?.(result, imageUrl)}
      className="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all cursor-pointer hover:shadow-lg"
    >
      <div className="aspect-square bg-gray-100 dark:bg-gray-900 overflow-hidden">
        {error ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800">
            <FiAlertTriangle size={24} className="mb-2 text-amber-500" />
            <span className="text-xs">{t('cbir.error')}</span>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={result.filename || 'Similar image'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setError(true)}
          />
        )}
      </div>

      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">#{rank}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${toneColors[similarityTone]}`}></div>
          <span className={`text-sm font-bold ${toneToClasses(similarityTone).split(' ')[0]}`}>
            {similarityPercent}%
          </span>
        </div>
      </div>

      <div className="p-3">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm mb-2" title={result.filename}>
          {result.filename || t('cbir.noTags')}
        </h4>

        <div className="flex items-center gap-2 flex-wrap">
          {result.image_type?.length > 0 ? (
            result.image_type.slice(0, 2).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-medium">
                #{tag}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-gray-400 italic">{t('cbir.noTags')}</span>
          )}
        </div>

        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded capitalize">
            {result.source_type === 'uploaded' ? 'Upload' : t('gallery.extracted')}
          </span>
          <span className="text-[10px] text-gray-400">
            {result.file_size ? `${(result.file_size / 1024).toFixed(0)} KB` : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

// Lightbox for viewing images in detail
const LightboxModal = ({ image, imageUrl, onClose, isResult = false, t }) => {
  useEffect(() => {
    if (!image) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 bg-black/95 z-[1000] flex backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
    >
      <div className="flex-1 flex items-center justify-center p-8 relative" onClick={e => e.stopPropagation()}>
        <button
          className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors"
          onClick={onClose}
        >
          <FiX size={32} />
        </button>

        {imageUrl ? (
          <img
            src={imageUrl}
            alt={image.filename}
            className="max-h-[90vh] max-w-full object-contain rounded-lg shadow-2xl"
          />
        ) : (
          <div className="w-full h-full max-h-[80vh] aspect-video flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      <div
        className="w-[360px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 p-6 overflow-y-auto flex flex-col gap-6"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 break-words">
            {image.filename}
          </h2>
          {isResult && image.similarity_score !== undefined && (
            <div className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold mb-2">
              {t('cbir.similarity')}: {(image.similarity_score * 100).toFixed(1)}%
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">{t('cbir.tags')}</h3>
          <div className="flex flex-wrap gap-2">
            {(image.imageType || image.image_type)?.length > 0 ? (
              (image.imageType || image.image_type).map(tag => (
                <span key={tag} className="text-xs px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-medium">
                  #{tag}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400 italic">{t('cbir.noTags')}</span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">{t('cbir.info')}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <span className="block text-gray-500 text-xs mb-1">{t('cbir.origin')}</span>
              <span className="font-medium dark:text-gray-200 capitalize">
                {(image.sourceType || image.source_type) === 'uploaded' ? 'Upload' : t('gallery.extracted')}
              </span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <span className="block text-gray-500 text-xs mb-1">{t('pdfs.size')}</span>
              <span className="font-medium dark:text-gray-200">
                {image.fileSize || image.file_size ? `${((image.fileSize || image.file_size) / 1024).toFixed(1)} KB` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Constants ---
const IMAGES_PER_PAGE = 24;

// --- Main Component ---

const CBIRSearchPage = () => {
  const { t } = useLanguage();

  // Gallery State
  const [images, setImages] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [loadingImages, setLoadingImages] = useState(true);
  const [loadingUrls, setLoadingUrls] = useState({});
  const [errorImages, setErrorImages] = useState(null);

  // Gallery Filters (for selecting source images)
  const [galleryFilters, setGalleryFilters] = useState({
    sourceType: 'all',
    imageType: [],
    search: ''
  });

  // Selection State
  const [selectedImage, setSelectedImage] = useState(null);

  // Search Parameters
  const [topK, setTopK] = useState(10);
  const [minSimilarity, setMinSimilarity] = useState(0.8);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availableCategories, setAvailableCategories] = useState([]);

  // Search State
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  // Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [lightboxIsResult, setLightboxIsResult] = useState(false);

  // Gallery pagination
  const [galleryPage, setGalleryPage] = useState(1);
  const [totalImages, setTotalImages] = useState(0);

  // Fetch images when page or gallery filters change
  useEffect(() => {
    fetchImages(galleryPage, galleryFilters);
  }, [galleryPage, galleryFilters]);

  // Reset to page 1 when gallery filters change
  const prevGalleryFiltersRef = React.useRef(galleryFilters);
  useEffect(() => {
    const prev = prevGalleryFiltersRef.current;
    if (JSON.stringify(prev) !== JSON.stringify(galleryFilters) && galleryPage !== 1) {
      setGalleryPage(1);
    }
    prevGalleryFiltersRef.current = galleryFilters;
  }, [galleryFilters, galleryPage]);

  // Load image URLs - use thumbnail URLs directly
  useEffect(() => {
    const newUrls = {};
    for (const img of images) {
      if (!imageUrls[img.id]) {
        newUrls[img.id] = getThumbnailUrl(img.id);
      }
    }
    if (Object.keys(newUrls).length > 0) {
      setImageUrls(prev => ({ ...prev, ...newUrls }));
    }
  }, [images]);

  useEffect(() => {
    if (images.length > 0) {
      setAvailableCategories(prev => {
        const categories = new Set(prev);
        images.forEach(img => {
          (img.imageType || []).forEach(type => categories.add(type));
        });
        return Array.from(categories).sort();
      });
    }
  }, [images]);

  useEffect(() => {
    if (selectedImage) {
      // Always default to 'all' types - user can manually filter if needed
      setCategoryFilter('all');
    }
  }, [selectedImage]);

  const fetchImages = useCallback(async (page = 1, filters = {}) => {
    setLoadingImages(true);
    setErrorImages(null);
    try {
      // Build query params with filters
      const queryParams = { page, per_page: IMAGES_PER_PAGE };
      if (filters.imageType && filters.imageType.length > 0) {
        queryParams.image_type = filters.imageType.join(',');
      }
      if (filters.sourceType && filters.sourceType !== 'all') {
        queryParams.source_type = filters.sourceType;
      }
      if (filters.search) {
        queryParams.search = filters.search;
      }

      const data = await api.get('/images', queryParams);

      let imageList = [];
      let total = 0;

      if (Array.isArray(data)) {
        imageList = data;
        total = data.length >= IMAGES_PER_PAGE ? page * IMAGES_PER_PAGE + 1 : (page - 1) * IMAGES_PER_PAGE + data.length;
      } else if (data && typeof data === 'object') {
        imageList = data.items || data.images || [];
        total = data.total || data.total_count || imageList.length;
      }

      const limitedImageList = imageList.slice(0, IMAGES_PER_PAGE);

      const transformed = limitedImageList.map(img => ({
        id: img._id,
        imageId: img._id,
        filename: img.filename,
        uploadedDate: img.uploaded_date,
        fileSize: img.file_size,
        sourceType: img.source_type,
        imageType: img.image_type || []
      }));

      if (imageList.length > IMAGES_PER_PAGE && total < imageList.length) {
        total = Math.max(total, page * IMAGES_PER_PAGE + (imageList.length - IMAGES_PER_PAGE));
      }

      setImages(transformed);
      setTotalImages(total);
    } catch (err) {
      console.error('Error fetching images:', err);
      setErrorImages(err.message);
    } finally {
      setLoadingImages(false);
    }
  }, []);

  // Fetch all available tags from backend (using dedicated endpoint for efficiency)
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await api.get('/images/tags');
        setAvailableCategories(tags);
      } catch (err) {
        console.error('Error fetching tags:', err);
      }
    };
    fetchTags();
  }, []);

  // ESC key to clear selection
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = async () => {
    if (!selectedImage) {
      showAlert(t('common.warning'), t('cbir.selectSourceFirst'), 'warning');
      return;
    }

    setSearching(true);
    setSearchResults(null);

    try {
      const payload = {
        image_id: selectedImage.id,
        top_k: topK,
        labels: categoryFilter !== 'all' ? [categoryFilter] : null
      };

      const response = await api.post('/cbir/search/sync', payload);

      const filteredMatches = response.matches.filter(
        match => match.image_id !== selectedImage.id && match.similarity_score >= minSimilarity
      );

      setSearchResults({
        ...response,
        matches: filteredMatches,
        originalCount: response.matches_count,
        filteredCount: filteredMatches.length
      });

      if (filteredMatches.length === 0) {
        showToast(t('cbir.noResultsWithCriteria'), 'info');
      } else {
        showToast(`${t('similarity.found')} ${filteredMatches.length} ${t('similarity.similarImages')}`, 'success');
      }
    } catch (err) {
      console.error('Search error:', err);
      showAlert(t('similarity.searchError'), err.message || t('similarity.searchErrorMessage'), 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchResults(null);
    setSelectedImage(null);
    setCategoryFilter('all');
  };

  const totalGalleryPages = Math.ceil(totalImages / IMAGES_PER_PAGE);

  const handlePageChange = useCallback((newPage) => {
    const maxPage = Math.max(1, totalGalleryPages);
    const boundedPage = Math.min(Math.max(1, newPage), maxPage);
    if (boundedPage !== galleryPage) {
      setGalleryPage(boundedPage);
    }
  }, [galleryPage, totalGalleryPages]);

  return (
    <div className="flex flex-col h-full bg-bg-main dark:bg-bg-main overflow-hidden">
      {/* Header */}
      <header className="flex-none px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200 dark:border-gray-800 bg-bg-main dark:bg-bg-main z-30">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2 sm:gap-3">
              <FiSearch className="text-indigo-600" />
              {t('cbir.title')}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">
              {t('cbir.subtitle')}
            </p>
          </div>

          {searchResults && (
            <button
              onClick={handleClearSearch}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <FiX /> {t('cbir.clearSearch')}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
          {/* Step 1: Select Source Image */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-3 sm:p-5 border-b border-gray-200 dark:border-gray-700">
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {t('cbir.selectSource')}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('cbir.selectSourceDescription')}
                    </p>
                  </div>
                </div>

                {/* Pagination controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(galleryPage - 1)}
                    disabled={galleryPage <= 1 || loadingImages}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <FiChevronLeft />
                  </button>
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 min-w-[60px] sm:min-w-[100px] text-center">
                    {galleryPage}/{totalGalleryPages || 1} <span className="hidden sm:inline">({totalImages})</span>
                  </span>
                  <button
                    onClick={() => handlePageChange(galleryPage + 1)}
                    disabled={galleryPage >= totalGalleryPages || loadingImages}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <FiChevronRight />
                  </button>
                </div>
              </div>

              {/* Filter row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search input */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('gallery.searchPlaceholder') || 'Search images...'}
                    value={galleryFilters.search}
                    onChange={(e) => setGalleryFilters(f => ({ ...f, search: e.target.value }))}
                    className="w-full pl-10 pr-8 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                  {galleryFilters.search && (
                    <button
                      onClick={() => setGalleryFilters(f => ({ ...f, search: '' }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <FiX size={16} />
                    </button>
                  )}
                </div>

                {/* Tag filter dropdown */}
                <select
                  value={galleryFilters.imageType.length > 0 ? galleryFilters.imageType[0] : 'all'}
                  onChange={(e) => setGalleryFilters(f => ({
                    ...f,
                    imageType: e.target.value === 'all' ? [] : [e.target.value]
                  }))}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all cursor-pointer"
                >
                  <option value="all">{t('cbir.allTypes') || 'All Types'}</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Clear filters button */}
                {(galleryFilters.search || galleryFilters.imageType.length > 0) && (
                  <button
                    onClick={() => setGalleryFilters({ sourceType: 'all', imageType: [], search: '' })}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    <FiX size={14} />
                    {t('filters.clearFilters')}
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 sm:p-5">
              {loadingImages ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {[...Array(IMAGES_PER_PAGE)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : errorImages ? (
                <div className="text-center py-8">
                  <FiAlertTriangle className="text-4xl text-red-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">{errorImages}</p>
                  <button
                    onClick={() => fetchImages(galleryPage, galleryFilters)}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    {t('common.tryAgain')}
                  </button>
                </div>
              ) : images.length === 0 ? (
                <EmptyState
                  title={t('cbir.noImages')}
                  description={t('cbir.noImagesDescription')}
                  icon="image"
                  actionLabel={t('common.update')}
                  onAction={() => fetchImages(1, galleryFilters)}
                  showAction={true}
                />
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {images.map((img) => (
                    <SourceImageCard
                      key={img.id}
                      image={img}
                      isSelected={selectedImage?.id === img.id}
                      onClick={() => setSelectedImage(img)}
                      imageUrl={imageUrls[img.id]}
                      loading={loadingUrls[img.id]}
                      error={!imageUrls[img.id] && !loadingUrls[img.id]}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Step 2: Search Parameters */}
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('cbir.searchParams')}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('cbir.searchParamsDescription')}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Top-K Parameter */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <FiTarget className="text-indigo-500" />
                    {t('cbir.topK')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={topK}
                    onChange={(e) => setTopK(Math.min(100, Math.max(1, parseInt(e.target.value) || 10)))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('cbir.topKDescription')}
                  </p>
                </div>

                {/* Minimum Similarity Parameter */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <FiZap className="text-indigo-500" />
                    {t('cbir.minSimilarity')}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={minSimilarity}
                      onChange={(e) => setMinSimilarity(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <span className="min-w-[60px] text-center px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg font-semibold text-sm">
                      {(minSimilarity * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('cbir.minSimilarityDescription')}
                  </p>
                </div>

                {/* Category Filter */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <FiLayers className="text-indigo-500" />
                    {t('cbir.categoryFilter')}
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all cursor-pointer"
                  >
                    <option value="all">{t('cbir.allTypes')}</option>
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedImage?.imageType?.length > 0
                      ? t('cbir.autoSelected')
                      : t('cbir.filterByType')}
                  </p>
                </div>
              </div>

              {/* Selected Image Preview & Search Button */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                {selectedImage ? (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-indigo-500 flex-shrink-0">
                      {imageUrls[selectedImage.id] ? (
                        <img
                          src={imageUrls[selectedImage.id]}
                          alt={selectedImage.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {t('cbir.selectedImage')}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                        {selectedImage.filename}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                    {t('cbir.noImageSelected')}
                  </p>
                )}

                <button
                  onClick={handleSearch}
                  disabled={!selectedImage || searching}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20 disabled:shadow-none"
                >
                  {searching ? (
                    <>
                      <FiRefreshCw className="animate-spin" />
                      {t('cbir.searching')}
                    </>
                  ) : (
                    <>
                      <FiSearch />
                      {t('cbir.analyze')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* Step 3: Search Results */}
          {searchResults && (
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center font-bold text-sm">
                      <FiCheck />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {t('cbir.searchResults')}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {searchResults.filteredCount} {t('cbir.imagesFound')} {searchResults.originalCount} {t('cbir.imagesFoundSuffix')}
                        {searchResults.filteredCount < searchResults.originalCount && (
                          <span className="text-amber-500 ml-1">
                            ({searchResults.originalCount - searchResults.filteredCount} {t('cbir.filteredBySimilarity')})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5">
                {searchResults.matches.length === 0 ? (
                  <EmptyState
                    title={t('cbir.noSimilarFound')}
                    description={t('cbir.noSimilarDescription')}
                    icon="search"
                    showAction={false}
                  />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {searchResults.matches.map((result, index) => (
                      <ResultCard
                        key={result.image_id || index}
                        result={result}
                        rank={index + 1}
                        onClick={(res, url) => {
                          setLightboxImage(res);
                          setLightboxUrl(url);
                          setLightboxIsResult(true);
                        }}
                        t={t}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <LightboxModal
          image={lightboxImage}
          imageUrl={lightboxUrl}
          isResult={lightboxIsResult}
          onClose={() => {
            setLightboxImage(null);
            setLightboxUrl(null);
            setLightboxIsResult(false);
          }}
          t={t}
        />
      )}
    </div>
  );
};

export default CBIRSearchPage;
