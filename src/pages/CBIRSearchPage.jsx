import React, { useState, useEffect } from 'react';
import {
  FiSearch,
  FiX,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiZap,
  FiTarget,
  FiLayers,
  FiCheck
} from 'react-icons/fi';
import { api } from '../services/api';
import { API_BASE_URL } from '../config/api';
import { showAlert, showToast } from '../utils/alert';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { SkeletonCard, EmptyState } from '../components/common';
import SourceImageCard from '../components/cbir/SourceImageCard';
import ResultCard from '../components/cbir/ResultCard';
import LightboxModal from '../components/cbir/LightboxModal';
import { useGallery } from '../hooks/useGallery';
import { useCBIRSearch } from '../hooks/useCBIRSearch';

const CBIRSearchPage = () => {
  const { t } = useLanguage();
  const { token } = useAuth();

  // Gallery Hook
  const {
    images,
    loading: loadingImages,
    error: errorImages,
    totalImages,
    page: galleryPage,
    totalPages: totalGalleryPages,
    filters: galleryFilters,
    availableCategories,
    setPage: setGalleryPage,
    setFilters: setGalleryFilters,
    refresh: refreshGallery
  } = useGallery();

  // Search Hook
  const {
    searching,
    searchResults,
    // error: searchError, // Handled locally via showToast/showAlert usually, or we can use it
    topK,
    minSimilarity,
    categoryFilter,
    setTopK,
    setMinSimilarity,
    setCategoryFilter,
    search,
    clearResults
  } = useCBIRSearch();

  // Local UI State
  const [selectedImage, setSelectedImage] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [lightboxIsResult, setLightboxIsResult] = useState(false);

  // Helper to get thumbnail URL with auth token
  const getThumbnailUrl = (imageId) => {
    return `${API_BASE_URL}/images/${imageId}/thumbnail${token ? `?token=${token}` : ''}`;
  };

  // Clear selection on filter change handled by user logic, but here we might want to clear selection if the image is no longer visible?
  // Actually, keeping selection is fine.

  // ESC key to clear selection
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedImage(null);
        setLightboxImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchClick = async () => {
    if (!selectedImage) {
      showAlert(t('common.warning'), t('cbir.selectSourceFirst'), 'warning');
      return;
    }
    try {
      const results = await search(selectedImage.id);
      if (results.length === 0) {
        showToast(t('cbir.noResultsWithCriteria'), 'info');
      } else {
        showToast(`${t('similarity.found')} ${results.length} ${t('similarity.similarImages')}`, 'success');
      }
    } catch (err) {
      showAlert(t('similarity.searchError'), err.message || t('similarity.searchErrorMessage'), 'error');
    }
  };

  const handleClear = () => {
    clearResults();
    setSelectedImage(null);
    setCategoryFilter('all');
  };

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
              onClick={handleClear}
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
                    onClick={() => setGalleryPage(galleryPage - 1)}
                    disabled={galleryPage <= 1 || loadingImages}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <FiChevronLeft />
                  </button>
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 min-w-[60px] sm:min-w-[100px] text-center">
                    {galleryPage}/{totalGalleryPages || 1} <span className="hidden sm:inline">({totalImages})</span>
                  </span>
                  <button
                    onClick={() => setGalleryPage(galleryPage + 1)}
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
                    onChange={(e) => setGalleryFilters({ search: e.target.value })}
                    className="w-full pl-10 pr-8 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                  {galleryFilters.search && (
                    <button
                      onClick={() => setGalleryFilters({ search: '' })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <FiX size={16} />
                    </button>
                  )}
                </div>

                {/* Tag filter dropdown */}
                <select
                  value={galleryFilters.imageType.length > 0 ? galleryFilters.imageType[0] : 'all'}
                  onChange={(e) => setGalleryFilters({
                    imageType: e.target.value === 'all' ? [] : [e.target.value]
                  })}
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
                  {[...Array(24)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : errorImages ? (
                <div className="text-center py-8">
                  <FiAlertTriangle className="text-4xl text-red-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">{errorImages}</p>
                  <button
                    onClick={refreshGallery}
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
                  onAction={() => setGalleryFilters({ search: '' })} // Simplistic action
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
                      imageUrl={getThumbnailUrl(img.id)}
                    // error={!getThumbnailUrl(img.id)} // url is just a string, validation happens in img onError
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
                      <img
                        src={getThumbnailUrl(selectedImage.id)}
                        alt={selectedImage.filename}
                        className="w-full h-full object-cover"
                      />
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
                  onClick={handleSearchClick}
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
                        onMarkAsRelated={selectedImage ? async (res) => {
                          try {
                            await api.createRelationship(
                              selectedImage.id,
                              res.image_id,
                              'similarity',
                              res.similarity_score || 1.0
                            );
                            showToast(t('cbir.linkedAsRelated') || 'Linked as related image', 'success');
                          } catch (err) {
                            console.error('Error linking as related:', err);
                            showToast(t('cbir.linkError') || 'Failed to link images', 'error');
                          }
                        } : null}
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
