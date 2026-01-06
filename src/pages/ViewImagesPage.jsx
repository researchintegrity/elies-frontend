// src/pages/ViewImagesPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiX,
  FiAlertTriangle,
  FiTarget,
  FiZap,
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import { useImages } from '../hooks/useImages';
import { usePanelExtraction } from '../hooks/usePanelExtraction';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { showAlert, showToast, showConfirm } from '../utils/alert';
import SelectionToolbar from '../components/SelectionToolbar';
import ImageFilters from '../components/ImageFilters';
import BatchTagModal from '../components/BatchTagModal';
import { SkeletonCard, EmptyState } from '../components/common';
import { API_BASE_URL } from '../config/api';
import LightboxModal from '../components/common/LightboxModal';
import ImageMetadataSidebar from '../components/common/ImageMetadataSidebar';
import ImageCard from '../components/ImageCard';
import QueryImageThumbnail from '../components/QueryImageThumbnail';

// Components moved to separate files
// LightboxModal -> ../components/common/LightboxModal
// QueryImageThumbnail -> ../components/QueryImageThumbnail
// ImageCard -> ../components/ImageCard

// Map analysis types to page keys (matches PAGES in AppLayout)
const analysisTypeToPageKey = {
  'imageAnalysis': 'imageAnalysis',
  'manipulationDetection': 'manipulationDetection',
  'copyMoveSingle': 'copyMove',
  'copyMoveCross': 'copyMove',
  'provenance': 'provenance',
  // Batch analysis types route to the same pages
  'batchManipulation': 'manipulationDetection',
  'batchCopyMove': 'copyMove',
};

// --- Main Page Component ---

const ViewImagesPage = () => {
  const {
    images,
    loading,
    error,
    pagination,
    fetchImages,
    deleteImage,
    addImageTypes,
    removeImageType,
    toggleFlag
  } = useImages();

  // Panel extraction
  const {
    isExtracting,
    startExtraction,
    status: extractionStatus
  } = usePanelExtraction();

  const { t, locale } = useLanguage();

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filters, setFilters] = useState({ sourceType: 'all', dateFrom: '', dateTo: '', tags: [] });
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Pagination state for current page
  const [currentPage, setCurrentPage] = useState(1);
  const IMAGES_PER_PAGE = 24;

  // Selection - Map of id -> image data to support cross-page selection
  const [selectedImages, setSelectedImages] = useState(new Map());
  const selectedIds = useMemo(() => new Set(selectedImages.keys()), [selectedImages]);
  const [isBatchTagModalOpen, setIsBatchTagModalOpen] = useState(false);
  const [lastClickedId, setLastClickedId] = useState(null); // For shift-click range selection
  const [lastActionWasSelect, setLastActionWasSelect] = useState(true); // Tracks if last action was select or deselect

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // CBIR Similarity Search Mode
  const [similarityMode, setSimilarityMode] = useState(false);
  const [similarityQueryImage, setSimilarityQueryImage] = useState(null);
  const [similarityResults, setSimilarityResults] = useState([]);
  const [similarityLoading, setSimilarityLoading] = useState(false);
  const [similarityTopK, setSimilarityTopK] = useState(20);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5);
  const [similarityLabelFilter, setSimilarityLabelFilter] = useState('all');
  const [similarityPage, setSimilarityPage] = useState(1);
  const SIMILARITY_PER_PAGE = 12;

  // Fetch all available tags from backend (using dedicated endpoint for efficiency)
  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await api.get('/images/tags');
        setAllCategories(tags);
      } catch (err) {
        console.error('Error fetching tags:', err);
      }
    };
    fetchTags();
  }, []);

  // Exit similarity mode
  const handleExitSimilarityMode = useCallback(() => {
    setSimilarityMode(false);
    setSimilarityQueryImage(null);
    setSimilarityResults([]);
    setSelectedImages(new Map());
    setSimilarityLabelFilter('all'); // Reset label filter
  }, []);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if input is focused (but allow ranges/buttons to be escaped)
      if (e.target.tagName === 'TEXTAREA' || (e.target.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button', 'submit'].includes(e.target.type))) {
        return;
      }

      if (e.key === 'Escape') {
        const modalOpen = isBatchTagModalOpen || lightboxImage;
        if (modalOpen) {
          // If modal is open, let it close first
          if (lightboxImage) setLightboxImage(null);
          // BatchTagModal handles its own close via callback usually, but if we control isOpen...
          if (isBatchTagModalOpen) setIsBatchTagModalOpen(false);
          return;
        }

        if (selectedIds.size > 0) {
          setSelectedImages(new Map());
        } else if (similarityMode) {
          handleExitSimilarityMode();
        } else if (filters.tags.length > 0 || filters.dateFrom || filters.dateTo || searchQuery || filters.sourceType !== 'all') {
          // Clear filters
          setFilters({ sourceType: 'all', dateFrom: '', dateTo: '', tags: [] });
          setSearchQuery('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBatchTagModalOpen, lightboxImage, selectedIds, similarityMode, filters, searchQuery, t, handleExitSimilarityMode]);

  // Convert array for rendering (already sorted from backend)
  const availableCategoriesForSimilarity = allCategories;

  useEffect(() => {
    // Pass all filters to the backend - server handles filtering and pagination
    fetchImages({
      page: currentPage,
      per_page: IMAGES_PER_PAGE,
      imageType: filters.tags,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      search: searchQuery,
      sourceType: filters.sourceType
    });
  }, [fetchImages, currentPage, filters, searchQuery]);

  // Handle page change
  const handlePageChange = useCallback((newPage) => {
    const maxPage = Math.max(1, pagination.totalPages);
    const boundedPage = Math.min(Math.max(1, newPage), maxPage);
    if (boundedPage !== currentPage) {
      setCurrentPage(boundedPage);
      // Keep selection when changing pages to allow multi-page selection
    }
  }, [currentPage, pagination.totalPages]);

  // CBIR Search Handler
  const handleSimilaritySearch = useCallback(async (queryImage, labelFilterOverride) => {
    if (!queryImage) return;

    // Use provided filter or default to 'all' (search across all categories)
    const effectiveLabelFilter = labelFilterOverride !== undefined
      ? labelFilterOverride
      : 'all';

    if (labelFilterOverride === undefined) {
      setSimilarityLabelFilter('all');
    }

    setSimilarityMode(true);
    setSimilarityQueryImage(queryImage);
    setSimilarityLoading(true);
    setSimilarityResults([]);
    setSelectedImages(new Map()); // Clear selection when entering similarity mode

    try {
      const payload = {
        image_id: queryImage.id,
        top_k: similarityTopK + 1, // +1 to account for query image being returned
        labels: effectiveLabelFilter !== 'all' ? [effectiveLabelFilter] : null
      };

      const response = await api.post('/cbir/search/sync', payload);

      // Filter out the query image and apply threshold
      const filteredMatches = response.matches
        .filter(match => match.image_id !== queryImage.id && match.similarity_score >= similarityThreshold)
        .slice(0, similarityTopK);

      setSimilarityResults(filteredMatches);
      setSimilarityPage(1); // Reset to first page on new search

      if (filteredMatches.length === 0) {
        showToast(t('similarity.noResults'), 'info');
      } else {
        showToast(`${t('similarity.found')} ${filteredMatches.length} ${t('similarity.similarImages')}`, 'success');
      }
    } catch (err) {
      console.error('Similarity search error:', err);
      showAlert(t('similarity.searchError'), err.message || t('similarity.searchErrorMessage'), 'error');
      setSimilarityMode(false);
      setSimilarityQueryImage(null);
    } finally {
      setSimilarityLoading(false);
    }
  }, [similarityTopK, similarityThreshold, t]);

  // Re-run search when parameters change (while in similarity mode)
  const handleUpdateSimilarityParams = useCallback(async () => {
    if (similarityMode && similarityQueryImage) {
      await handleSimilaritySearch(similarityQueryImage, similarityLabelFilter);
    }
  }, [similarityMode, similarityQueryImage, handleSimilaritySearch, similarityLabelFilter]);

  // Track previous filter/search values to detect changes and reset pagination
  const prevFiltersRef = React.useRef({ filters, searchQuery });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    // Check if filters or search changed (not just page)
    const filtersChanged =
      JSON.stringify(prev.filters) !== JSON.stringify(filters) ||
      prev.searchQuery !== searchQuery;

    if (filtersChanged && currentPage !== 1) {
      setCurrentPage(1);
    }
    prevFiltersRef.current = { filters, searchQuery };
  }, [filters, searchQuery, currentPage]);

  // Derived State: Filtered Images (or similarity results)
  // Note: All filtering is now done server-side. This useMemo only handles:
  // 1. Similarity mode - mapping results to expected format + pagination
  // 2. Client-side sorting - for immediate UX feedback without API call

  // All similarity images (for selection purposes)
  const allSimilarityImages = useMemo(() => {
    if (!similarityMode) return [];
    return similarityResults.map(result => ({
      id: result.image_id,
      imageId: result.image_id,
      filename: result.filename || t('image.noName'),
      uploadedDate: result.uploaded_date || new Date().toISOString(),
      fileSize: result.file_size || 0,
      sourceType: result.source_type || 'unknown',
      imageType: result.image_type || [],
      similarityScore: result.similarity_score,
      isFlagged: result.is_flagged || false
    }));
  }, [similarityMode, similarityResults, t]);

  // Similarity pagination info
  const similarityTotalPages = Math.ceil(allSimilarityImages.length / SIMILARITY_PER_PAGE);

  const filteredImages = useMemo(() => {
    // In similarity mode, show paginated similarity results
    if (similarityMode) {
      const startIndex = (similarityPage - 1) * SIMILARITY_PER_PAGE;
      const endIndex = startIndex + SIMILARITY_PER_PAGE;
      return allSimilarityImages.slice(startIndex, endIndex);
    }

    // Server handles all filtering now, just apply local sorting for UX
    let result = [...images];

    // Client-side sorting for immediate feedback
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.uploadedDate) - new Date(a.uploadedDate);
        case 'oldest': return new Date(a.uploadedDate) - new Date(b.uploadedDate);
        case 'name_asc': return a.filename.localeCompare(b.filename);
        case 'name_desc': return b.filename.localeCompare(a.filename);
        case 'size_desc': return b.fileSize - a.fileSize;
        default: return 0;
      }
    });

    return result;
  }, [images, sortBy, similarityMode, allSimilarityImages, similarityPage, SIMILARITY_PER_PAGE]);

  // Handlers

  const handleSelect = useCallback((id, event) => {
    // Determine the current image list for range selection
    const currentImageList = similarityMode ? allSimilarityImages : filteredImages;

    // Find the image data from current page images or similarity results
    const imageData = images.find(img => img.id === id) ||
      currentImageList.find(img => img.id === id);

    // Shift-click range selection/deselection
    if (event?.shiftKey && lastClickedId && lastClickedId !== id) {
      // Use the current page/view images for range selection
      const visibleImages = similarityMode ? allSimilarityImages : filteredImages;
      const lastIndex = visibleImages.findIndex(img => img.id === lastClickedId);
      const currentIndex = visibleImages.findIndex(img => img.id === id);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const startIndex = Math.min(lastIndex, currentIndex);
        const endIndex = Math.max(lastIndex, currentIndex);
        const rangeImages = visibleImages.slice(startIndex, endIndex + 1);

        // Use the last action type to determine select or deselect
        setSelectedImages(prev => {
          const newMap = new Map(prev);
          if (lastActionWasSelect) {
            // Select the range
            rangeImages.forEach(img => newMap.set(img.id, img));
          } else {
            // Deselect the range
            rangeImages.forEach(img => newMap.delete(img.id));
          }
          return newMap;
        });

        // Toggle action for next shift-click (so it does the opposite)
        setLastActionWasSelect(!lastActionWasSelect);
        return;
      }
    }

    // Regular click - toggle selection
    const wasSelected = selectedIds.has(id);
    setSelectedImages(prev => {
      const newMap = new Map(prev);
      if (newMap.has(id)) {
        newMap.delete(id);
      } else if (imageData) {
        newMap.set(id, imageData);
      }
      return newMap;
    });

    // Update anchor and action type for next shift-click
    setLastClickedId(id);
    setLastActionWasSelect(!wasSelected);
  }, [images, filteredImages, similarityMode, allSimilarityImages, lastClickedId, selectedIds, lastActionWasSelect]);

  const handleClearSelection = useCallback(() => setSelectedImages(new Map()), []);

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    // Filter out extracted images
    const selectedImages = images.filter(img => selectedIds.has(img.id));
    const uploadedImages = selectedImages.filter(img => img.sourceType !== 'extracted');
    const extractedCount = selectedImages.length - uploadedImages.length;

    if (uploadedImages.length === 0) {
      showAlert(
        t('batch.actionBlocked'),
        t('batch.extractedOnlyMessage').replace('{count}', extractedCount),
        'warning'
      );
      return;
    }

    let confirmMessage = t('batch.confirmDelete').replace('{count}', uploadedImages.length);
    if (extractedCount > 0) {
      confirmMessage += `\n\n${t('batch.confirmDeleteNote').replace('{count}', extractedCount)}`;
    }

    const confirmed = await showConfirm(t('batch.confirmation'), confirmMessage);
    if (confirmed) {
      let successCount = 0;

      // UI Otimista: limpar seleção imediatamente
      handleClearSelection();

      for (const img of uploadedImages) {
        // Bypass confirm dialog individual using the new option
        const success = await deleteImage(img, { skipConfirm: true });
        if (success) successCount++;
      }

      // Update local state is tricky without the hook's setImages executed per item or batch
      // So we call fetchImages to sync or manually update state if we exposed setImages (we didn't)
      // Actually, standard pattern is to use hook functions. BUT deleteImage has confirm.
      // Let's rely on fetchImages() at the end.

      if (successCount > 0) {
        showToast(`${successCount} ${t('batch.imagesDeleted')}`, 'success');
        fetchImages();
      }

      if (extractedCount > 0) {
        // Delay small alert to not conflict with toast if necessary, usually toast is enough
        setTimeout(() => showToast(`${extractedCount} ${t('batch.extractedIgnored')}`, 'info'), 500);
      }
    }
  };

  const handleTagSelected = () => {
    setIsBatchTagModalOpen(true);
  };

  const handleBatchTagConfirm = async (newTags) => {
    if (newTags.length === 0) return;

    const selectedArray = Array.from(selectedImages.values());
    let successCount = 0;

    for (const img of selectedArray) {
      await addImageTypes(img, newTags, { silent: true });
      successCount++;
    }
    showToast(`${newTags.length} ${t('batch.tagsAdded')} ${successCount} ${t('batch.images')}`);
    handleClearSelection();
  };

  const handleBatchRemoveTags = async (tagsToRemove) => {
    if (tagsToRemove.length === 0) return;

    const selectedArray = Array.from(selectedImages.values());
    const successfulTags = new Set();
    const failedTags = new Set();
    let errorCount = 0;

    // Iterate over images first, then tags - more logical grouping per image
    for (const img of selectedArray) {
      for (const tag of tagsToRemove) {
        try {
          await removeImageType(img, tag, { silent: true });
          successfulTags.add(tag);
        } catch (err) {
          console.error(`Error removing tag "${tag}" from image ${img.id}:`, err);
          failedTags.add(tag);
          errorCount++;
        }
      }
    }

    // Determine which tags were fully successful (removed from ALL images)
    const fullySuccessfulTags = [...successfulTags].filter(tag => !failedTags.has(tag));

    // Only update local state for tags that were successfully removed from all images
    if (fullySuccessfulTags.length > 0) {
      setSelectedImages(prev => {
        const newMap = new Map();
        for (const [id, img] of prev) {
          newMap.set(id, {
            ...img,
            imageType: (img.imageType || []).filter(t => !fullySuccessfulTags.includes(t))
          });
        }
        return newMap;
      });
    }

    // Show appropriate feedback based on results
    const tagsRemovedCount = fullySuccessfulTags.length;
    const imagesCount = selectedArray.length;

    if (errorCount > 0 && tagsRemovedCount > 0) {
      showToast(
        `${tagsRemovedCount} ${t('batchTag.tagsRemoved') || 'tag(s) removed'}. ${errorCount} ${t('batchTag.errorOccurred') || 'error(s) occurred'}.`,
        'warning'
      );
    } else if (errorCount > 0) {
      showToast(t('batchTag.removeError') || 'Failed to remove tags. Please try again.', 'error');
    } else {
      showToast(
        `${tagsRemovedCount} ${t('batchTag.tagsRemoved') || 'tag(s) removed from'} ${imagesCount} ${t('batch.images') || 'image(s)'}`,
        'success'
      );
    }

    // Refresh images to reflect changes
    fetchImages({ page: currentPage, per_page: IMAGES_PER_PAGE, imageType: filters.tags, dateFrom: filters.dateFrom, dateTo: filters.dateTo, search: searchQuery, sourceType: filters.sourceType });
  };

  // Map analysis types to page keys (matches PAGES in AppLayout)


  const handleAnalyzeSelected = useCallback((analysisType) => {
    const selectedArray = Array.from(selectedImages.values());
    if (selectedArray.length === 0) return;

    // Validate selection for cross copy-move
    if (analysisType === 'copyMoveCross' && selectedArray.length !== 2) {
      showToast(t('analyze.selectTwoImages'), 'warning');
      return;
    }

    // Determine mode based on analysis type
    let mode = 'single';
    if (analysisType === 'copyMoveCross') {
      mode = 'cross';
    } else if (analysisType === 'batchManipulation' || analysisType === 'batchCopyMove') {
      mode = 'batch';
    }

    const startAnalysisData = {
      imageIds: selectedArray.map(img => img.id || img.imageId),
      targetPage: analysisTypeToPageKey[analysisType],
      mode: mode  // 'single', 'cross', or 'batch'
    };

    sessionStorage.setItem('startAnalysis', JSON.stringify(startAnalysisData));
    showToast(t('analyze.navigatingToTool'), 'success');
    window.location.reload();
  }, [selectedImages, t]);

  // Find similar images handler
  const handleFindSimilar = useCallback(() => {
    if (selectedImages.size !== 1) {
      showToast(t('similarity.selectOneImage'), 'warning');
      return;
    }
    // Get the image directly from the selectedImages Map
    const queryImage = Array.from(selectedImages.values())[0];
    if (queryImage) {
      handleSimilaritySearch(queryImage);
    }
  }, [selectedImages, handleSimilaritySearch, t]);

  // View metadata handler - opens lightbox for selected image
  const handleViewMetadata = useCallback(async () => {
    if (selectedImages.size !== 1) return;

    const selectedImage = Array.from(selectedImages.values())[0];
    if (!selectedImage) return;

    // Load the image URL for the lightbox
    try {
      const blob = await api.download(`/images/${selectedImage.imageId || selectedImage.id}/download`);
      const url = URL.createObjectURL(blob);
      setLightboxImage(selectedImage);
      setLightboxUrl(url);
    } catch (err) {
      console.error('Error loading image for metadata view:', err);
      showToast(t('image.loadError'), 'error');
    }
  }, [selectedImages, t]);

  // Extract panels handler
  const handleExtractPanels = useCallback(async () => {
    if (selectedImages.size === 0) return;

    const imageIds = Array.from(selectedImages.keys());
    const result = await startExtraction(imageIds);

    // If extraction started successfully, wait for completion via polling
    // The hook will show toasts and update state
    // After a successful extraction, refresh the gallery
    if (result.success && !result.pending) {
      // Extraction completed synchronously (edge case)
      fetchImages({ page: currentPage, per_page: IMAGES_PER_PAGE, imageType: filters.tags, dateFrom: filters.dateFrom, dateTo: filters.dateTo, search: searchQuery, sourceType: filters.sourceType });
      handleClearSelection();
    } else if (result.success && result.pending) {
      // Extraction started, clear selection but don't refresh yet
      // The hook will notify on completion
      handleClearSelection();
    }
  }, [selectedImages, startExtraction, fetchImages, currentPage, IMAGES_PER_PAGE, handleClearSelection, filters, searchQuery]);

  // Refresh gallery when extraction completes
  useEffect(() => {
    if (extractionStatus === 'completed') {
      fetchImages({ page: currentPage, per_page: IMAGES_PER_PAGE, imageType: filters.tags, dateFrom: filters.dateFrom, dateTo: filters.dateTo, search: searchQuery, sourceType: filters.sourceType });
    }
  }, [extractionStatus, fetchImages, currentPage, IMAGES_PER_PAGE, filters, searchQuery]);

  const handleResetFilters = () => {
    setFilters({ sourceType: 'all', dateFrom: '', dateTo: '', tags: [] });
  };

  const hasActiveFilters = Object.values(filters).some(v =>
    v !== 'all' && v !== '' && (!Array.isArray(v) || v.length > 0)
  );

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden">

      {/* Batch Tag Modal */}
      <BatchTagModal
        isOpen={isBatchTagModalOpen}
        onClose={() => setIsBatchTagModalOpen(false)}
        onConfirm={handleBatchTagConfirm}
        onRemoveTags={handleBatchRemoveTags}
        selectedImages={Array.from(selectedImages.values())}
        count={selectedIds.size}
      />

      {/* Selection Toolbar */}
      <SelectionToolbar
        selectedCount={selectedIds.size}
        onClearSelection={handleClearSelection}
        onDelete={handleDeleteSelected}
        onTag={handleTagSelected}
        onAnalyze={handleAnalyzeSelected}
        onFindSimilar={!similarityMode ? handleFindSimilar : undefined}
        onViewMetadata={handleViewMetadata}
        onExtractPanels={handleExtractPanels}
        isExtracting={isExtracting}
      />

      {/* Filter Sidebar */}
      <ImageFilters
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        filters={filters}
        availableTags={availableCategoriesForSimilarity}
        onFilterChange={(key, value) => {
          if (key === 'reset') handleResetFilters();
          else setFilters(prev => ({ ...prev, [key]: value }));
        }}
      />

      {/* Similarity Mode Header */}
      {similarityMode && (
        <div className="flex-none px-8 py-4 border-b border-amber-200 dark:border-amber-800/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 z-30">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            {/* Left: Back button, query image, and title */}
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={handleExitSimilarityMode}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <FiArrowLeft />
                <span className="text-sm font-medium">{t('common.back')}</span>
              </button>

              {/* Query Image Thumbnail */}
              <QueryImageThumbnail
                image={similarityQueryImage}
                isSelected={selectedIds.has(similarityQueryImage?.id)}
                onSelect={handleSelect}
                isSelectionMode={selectedIds.size > 0}
              />

              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FiTarget className="text-amber-500" />
                  {t('similarity.title')}
                  {similarityLoading && <FiRefreshCw className="animate-spin text-sm text-gray-400" />}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {!similarityLoading && `${allSimilarityImages.length} ${t('similarity.resultsFound')}`}
                  {similarityLoading && t('similarity.searching')}
                </p>
              </div>
            </div>

            {/* Right: Parameters */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Top-K Slider */}
              <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <label className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">Top-K:</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={similarityTopK}
                  onChange={(e) => setSimilarityTopK(Number(e.target.value))}
                  className="w-24 accent-amber-500"
                />
                <span className="text-sm font-semibold text-gray-900 dark:text-white w-8">{similarityTopK}</span>
              </div>

              {/* Threshold Slider */}
              <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <label className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{t('similarity.threshold')}:</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={similarityThreshold}
                  onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                  className="w-24 accent-amber-500"
                />
                <span className="text-sm font-semibold text-gray-900 dark:text-white w-12">{(similarityThreshold * 100).toFixed(0)}%</span>
              </div>

              {/* Label Filter Dropdown */}
              <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <label className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{t('similarity.category')}:</label>
                <select
                  value={similarityLabelFilter}
                  onChange={(e) => setSimilarityLabelFilter(e.target.value)}
                  className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer min-w-[100px]"
                >
                  <option value="all" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{t('common.all')}</option>
                  {availableCategoriesForSimilarity.map(cat => (
                    <option key={cat} value={cat} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{cat}</option>
                  ))}
                </select>
              </div>

              {/* Search Button */}
              <button
                onClick={handleUpdateSimilarityParams}
                disabled={similarityLoading}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg font-medium transition-colors shadow-sm"
              >
                <FiZap />
                <span>{t('common.update')}</span>
              </button>
            </div>
          </div>

          {/* Selection Buttons and Pagination for Similarity Mode */}
          {allSimilarityImages.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-amber-200 dark:border-amber-800/50">
              {/* Selection Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedImages(prev => {
                      const newMap = new Map(prev);
                      filteredImages.forEach(img => newMap.set(img.id, img));
                      return newMap;
                    });
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
                >
                  {t('provenance.selectAllOnPage')}
                </button>
                <button
                  onClick={() => {
                    const pageIds = new Set(filteredImages.map(img => img.id));
                    setSelectedImages(prev => {
                      const newMap = new Map(prev);
                      pageIds.forEach(id => newMap.delete(id));
                      return newMap;
                    });
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                >
                  {t('provenance.clearPageSelection')}
                </button>
                <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                <button
                  onClick={() => {
                    setSelectedImages(prev => {
                      const newMap = new Map(prev);
                      allSimilarityImages.forEach(img => newMap.set(img.id, img));
                      return newMap;
                    });
                    showToast(`${allSimilarityImages.length} ${t('provenance.imagesSelected')}`, 'success');
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
                >
                  {t('similarity.selectAllResults')}
                </button>
                <button
                  onClick={() => setSelectedImages(new Map())}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('gallery.clearAllSelection')}
                </button>
                {selectedIds.size > 0 && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    ({selectedIds.size} {t('common.selected')})
                  </span>
                )}
              </div>

              {/* Pagination Controls */}
              {similarityTotalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSimilarityPage(1)}
                    disabled={similarityPage === 1}
                    className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('gallery.first')}
                  </button>
                  <button
                    onClick={() => setSimilarityPage(prev => Math.max(1, prev - 1))}
                    disabled={similarityPage === 1}
                    className="p-1 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <span className="text-xs text-gray-600 dark:text-gray-300 min-w-[80px] text-center">
                    {similarityPage}/{similarityTotalPages} ({allSimilarityImages.length})
                  </span>
                  <button
                    onClick={() => setSimilarityPage(prev => Math.min(similarityTotalPages, prev + 1))}
                    disabled={similarityPage === similarityTotalPages}
                    className="p-1 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <FiChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => setSimilarityPage(similarityTotalPages)}
                    disabled={similarityPage === similarityTotalPages}
                    className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('gallery.last')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Header - Hidden in similarity mode */}
      {!similarityMode && (
        <header className="flex-none px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200 dark:border-gray-800 bg-bg-main dark:bg-bg-main z-30">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  {t('gallery.title')}
                  {loading && <FiRefreshCw className="animate-spin text-lg text-gray-400" />}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 hidden md:block">
                  {t('gallery.subtitle')}
                </p>
              </div>

              {/* Pagination Controls */}
              {pagination.total > IMAGES_PER_PAGE && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPrev || loading}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    title={t('gallery.previousPage')}
                  >
                    <FiChevronLeft />
                  </button>
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 min-w-[60px] sm:min-w-[100px] text-center">
                    {currentPage}/{pagination.totalPages} <span className="hidden sm:inline">({pagination.total})</span>
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNext || loading}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    title={t('gallery.nextPage')}
                  >
                    <FiChevronRight />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3 flex-1 justify-end">
              <div className="relative flex-1 min-w-[120px] max-w-xs group">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-gray-400 shadow-sm"
                  placeholder={t('gallery.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <FiX />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  className="flex-shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 cursor-pointer shadow-sm text-sm min-w-0"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">{t('gallery.sortNewest')}</option>
                  <option value="oldest">{t('gallery.sortOldest')}</option>
                  <option value="name_asc">{t('gallery.sortNameAsc')}</option>
                  <option value="name_desc">{t('gallery.sortNameDesc')}</option>
                  <option value="size_desc">{t('gallery.sortSize')}</option>
                </select>

                <button
                  className={`flex-shrink-0 px-3 py-2.5 rounded-xl border transition-all flex items-center gap-2 shadow-sm ${hasActiveFilters
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-500/50 dark:text-indigo-300'
                    : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50'
                    }`}
                  onClick={() => setIsFilterPanelOpen(true)}
                >
                  <FiFilter className={hasActiveFilters ? "fill-current" : ""} />
                  <span>{t('common.filters')}</span>
                  {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-indigo-500"></span>}
                </button>

                <button
                  className="flex-shrink-0 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-indigo-600 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition-all shadow-sm"
                  onClick={() => fetchImages({ page: currentPage, per_page: IMAGES_PER_PAGE, imageType: filters.tags, dateFrom: filters.dateFrom, dateTo: filters.dateTo, search: searchQuery, sourceType: filters.sourceType })}
                  title={t('common.update')}
                >
                  <FiRefreshCw />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/50 animate-in fade-in slide-in-from-top-2">
              <span className="text-xs text-gray-400 self-center uppercase font-bold tracking-wider mr-2">{t('common.active')}:</span>
              {filters.sourceType !== 'all' && (
                <span className="text-xs flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100">
                  {t('common.origin')}: {filters.sourceType} <button onClick={() => setFilters(f => ({ ...f, sourceType: 'all' }))}><FiX /></button>
                </span>
              )}
              {filters.tags.map(tag => (
                <span key={tag} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100">
                  #{tag} <button onClick={() => setFilters(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))}><FiX /></button>
                </span>
              ))}
            </div>
          )}

          {/* Top Selection Buttons */}
          {pagination.total > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/50">
              <button
                onClick={() => {
                  setSelectedImages(prev => {
                    const newMap = new Map(prev);
                    filteredImages.forEach(img => newMap.set(img.id, img));
                    return newMap;
                  });
                }}
                className="px-3 py-1.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
              >
                {t('provenance.selectAllOnPage')}
              </button>
              <button
                onClick={() => {
                  const pageIds = new Set(filteredImages.map(img => img.id));
                  setSelectedImages(prev => {
                    const newMap = new Map(prev);
                    pageIds.forEach(id => newMap.delete(id));
                    return newMap;
                  });
                }}
                className="px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
              >
                {t('provenance.clearPageSelection')}
              </button>
              <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
              {/* Select All Filtered - only shows when filters are active */}
              {hasActiveFilters && (
                <button
                  onClick={async () => {
                    try {
                      // Build query params matching API format
                      const queryParams = {};
                      if (filters.tags.length > 0) queryParams.image_type = filters.tags.join(',');
                      if (filters.dateFrom) queryParams.date_from = filters.dateFrom;
                      if (filters.dateTo) queryParams.date_to = filters.dateTo;
                      if (searchQuery) queryParams.search = searchQuery;
                      if (filters.sourceType && filters.sourceType !== 'all') queryParams.source_type = filters.sourceType;

                      // Single lightweight API call to get filtered image IDs
                      const data = await api.get('/images/ids', queryParams);
                      const ids = data.ids || [];

                      setSelectedImages(prev => {
                        const newMap = new Map(prev);
                        ids.forEach(id => newMap.set(id, { id }));
                        return newMap;
                      });
                      showToast(`${ids.length} ${t('provenance.imagesSelected')}`, 'success');
                    } catch (err) {
                      console.error('Error fetching filtered image IDs:', err);
                      showToast(t('common.error') || 'Error', 'error');
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                >
                  {t('gallery.selectAllFiltered')}
                </button>
              )}
              {/* Select All - always visible, selects ALL images without filters */}
              <button
                onClick={async () => {
                  try {
                    // Single lightweight API call to get all image IDs
                    const data = await api.get('/images/ids');
                    const ids = data.ids || [];

                    setSelectedImages(prev => {
                      const newMap = new Map(prev);
                      // Store just the ID as key, with minimal object for the Map
                      ids.forEach(id => newMap.set(id, { id }));
                      return newMap;
                    });
                    showToast(`${ids.length} ${t('provenance.imagesSelected')}`, 'success');
                  } catch (err) {
                    console.error('Error fetching all image IDs:', err);
                    showToast(t('common.error') || 'Error', 'error');
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
              >
                {t('gallery.selectAllImages')}
              </button>
              <button
                onClick={() => setSelectedImages(new Map())}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {t('gallery.clearAllSelection')}
              </button>
              {selectedIds.size > 0 && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  ({selectedIds.size} {t('common.selected')})
                </span>
              )}
            </div>
          )}
        </header>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8" onClick={() => { /* Click outside to clear selection? Optional UX */ }}>
        {loading || similarityLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <FiAlertTriangle className="text-5xl text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('gallery.errorLoading')}</h3>
            <p className="text-gray-500 mb-6">{error}</p>
            <button onClick={() => fetchImages({ page: currentPage, per_page: IMAGES_PER_PAGE, imageType: filters.tags, dateFrom: filters.dateFrom, dateTo: filters.dateTo, search: searchQuery, sourceType: filters.sourceType })} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">{t('common.tryAgain')}</button>
          </div>
        ) : filteredImages.length === 0 ? (
          <EmptyState
            title={(searchQuery || hasActiveFilters || similarityMode) ? t('gallery.noResults') : t('gallery.empty')}
            description={(searchQuery || hasActiveFilters || similarityMode) ? t('gallery.noResultsDescription') : t('gallery.emptyDescription')}
            icon="image"
            actionLabel={!(searchQuery || hasActiveFilters || similarityMode) ? t('gallery.upload') : undefined}
            onAction={!(searchQuery || hasActiveFilters || similarityMode) ? () => showAlert('Info', t('sidebar.uploadImages'), 'info') : undefined}
            showAction={!(searchQuery || hasActiveFilters || similarityMode)}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
              {filteredImages.map((image, index) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  onSelect={handleSelect}
                  isSelected={selectedIds.has(image.id)}
                  isSelectionMode={selectedIds.size > 0}
                  similarityScore={image.similarityScore !== undefined ? image.similarityScore : null}
                  rank={image.similarityScore !== undefined ? (similarityMode ? (similarityPage - 1) * SIMILARITY_PER_PAGE + index + 1 : index + 1) : null}
                  onToggleFlag={toggleFlag}
                />
              ))}
            </div>

            {/* Bottom Pagination Controls */}
            {!similarityMode && pagination.total > IMAGES_PER_PAGE && (
              <div className="flex flex-col items-center gap-4 mt-8 pb-8">
                {/* Selection Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      // Select all images on current page
                      setSelectedImages(prev => {
                        const newMap = new Map(prev);
                        filteredImages.forEach(img => newMap.set(img.id, img));
                        return newMap;
                      });
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
                  >
                    {t('provenance.selectAllOnPage')}
                  </button>
                  <button
                    onClick={() => {
                      // Clear selection of images on current page only
                      const pageIds = new Set(filteredImages.map(img => img.id));
                      setSelectedImages(prev => {
                        const newMap = new Map(prev);
                        pageIds.forEach(id => newMap.delete(id));
                        return newMap;
                      });
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                  >
                    {t('provenance.clearPageSelection')}
                  </button>
                  <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                  {/* Select All Filtered - only shows when filters are active */}
                  {hasActiveFilters && (
                    <button
                      onClick={async () => {
                        try {
                          let allImages = [];
                          let page = 1;
                          const perPage = 100;
                          let hasMore = true;

                          while (hasMore) {
                            // Build query params matching API format
                            const queryParams = { page, per_page: perPage };
                            if (filters.tags.length > 0) queryParams.image_type = filters.tags.join(',');
                            if (filters.dateFrom) queryParams.date_from = filters.dateFrom;
                            if (filters.dateTo) queryParams.date_to = filters.dateTo;
                            if (searchQuery) queryParams.search = searchQuery;
                            if (filters.sourceType && filters.sourceType !== 'all') queryParams.source_type = filters.sourceType;
                            const data = await api.get('/images', queryParams);
                            const imageList = Array.isArray(data) ? data : (data.items || data.images || []);
                            allImages = [...allImages, ...imageList];

                            hasMore = imageList.length >= perPage;
                            page++;
                            if (page > 50) break;
                          }

                          setSelectedImages(prev => {
                            const newMap = new Map(prev);
                            allImages.forEach(img => newMap.set(img.id || img._id, img));
                            return newMap;
                          });
                          showToast(`${allImages.length} ${t('provenance.imagesSelected')}`, 'success');
                        } catch (err) {
                          console.error('Error fetching filtered images:', err);
                          showToast(t('common.error') || 'Error', 'error');
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                    >
                      {t('gallery.selectAllFiltered')}
                    </button>
                  )}
                  {/* Select All - always visible, selects ALL images without filters */}
                  <button
                    onClick={async () => {
                      try {
                        let allImages = [];
                        let page = 1;
                        const perPage = 100;
                        let hasMore = true;

                        while (hasMore) {
                          // No filters applied - fetch all images
                          const queryParams = { page, per_page: perPage };
                          const data = await api.get('/images', queryParams);
                          const imageList = Array.isArray(data) ? data : (data.items || data.images || []);
                          allImages = [...allImages, ...imageList];

                          hasMore = imageList.length >= perPage;
                          page++;
                          if (page > 50) break;
                        }

                        setSelectedImages(prev => {
                          const newMap = new Map(prev);
                          allImages.forEach(img => newMap.set(img.id || img._id, img));
                          return newMap;
                        });
                        showToast(`${allImages.length} ${t('provenance.imagesSelected')}`, 'success');
                      } catch (err) {
                        console.error('Error fetching all images:', err);
                        showToast(t('common.error') || 'Error', 'error');
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
                  >
                    {t('gallery.selectAllImages')}
                  </button>
                  <button
                    onClick={() => setSelectedImages(new Map())}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t('gallery.clearAllSelection')}
                  </button>
                  {selectedIds.size > 0 && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      ({selectedIds.size} {t('common.selected')})
                    </span>
                  )}
                </div>

                {/* Pagination Buttons */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1 || loading}
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('gallery.first')}
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPrev || loading}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <FiChevronLeft />
                  </button>

                  {/* Page number buttons */}
                  <div className="flex items-center gap-1">
                    {(() => {
                      const pages = [];
                      const totalPages = pagination.totalPages;
                      const current = currentPage;

                      // Show at most 5 page buttons
                      let start = Math.max(1, current - 2);
                      let end = Math.min(totalPages, start + 4);

                      // Adjust start if we're near the end
                      if (end - start < 4) {
                        start = Math.max(1, end - 4);
                      }

                      for (let i = start; i <= end; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => handlePageChange(i)}
                            disabled={loading}
                            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${i === current
                              ? 'bg-indigo-600 text-white'
                              : 'border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                          >
                            {i}
                          </button>
                        );
                      }
                      return pages;
                    })()}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNext || loading}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <FiChevronRight />
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={currentPage === pagination.totalPages || loading}
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('gallery.last')}
                  </button>

                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-4">
                    {pagination.total} {t('gallery.imagesTotal')}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {
        lightboxImage && (
          <LightboxModal
            isOpen={!!lightboxImage}
            onClose={() => {
              setLightboxImage(null);
              setLightboxUrl(null);
            }}
            imageUrl={lightboxUrl}
            title={lightboxImage?.filename}
            showSidebar={true}
          >
            <ImageMetadataSidebar
              image={images.find(i => i.id === lightboxImage.id) || lightboxImage}
              t={t}
              locale={locale}
              onTagAdd={addImageTypes}
              onTagRemove={removeImageType}
            />
          </LightboxModal>
        )
      }
    </div >
  );
};

export default ViewImagesPage;
