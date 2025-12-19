// src/pages/ViewImagesPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiImage,
  FiX,
  FiUploadCloud,
  FiEye,
  FiAlertTriangle,
  FiTrash2,
  FiMoreVertical,
  FiCheckCircle,
  FiCheck,
  FiTarget,
  FiZap,
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import { useImages } from '../hooks/useImages';
import { api } from '../services/api';
import { showAlert, showToast, showConfirm } from '../utils/alert';
import SelectionToolbar from '../components/SelectionToolbar';
import ImageFilters from '../components/ImageFilters';
import TagInput from '../components/TagInput';
import BatchTagModal from '../components/BatchTagModal';

// --- Components ---

const SkeletonCard = () => (
  <div className="bg-bg-card dark:bg-dark-card rounded-xl overflow-hidden h-72 border border-gray-200 dark:border-gray-800">
    <div className="w-full aspect-[4/3] bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 animate-pulse"></div>
      <div className="flex gap-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-16 animate-pulse"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-12 animate-pulse"></div>
      </div>
    </div>
  </div>
);

const EmptyState = ({ isSearch, onUploadClick }) => (
  <div className="col-span-full flex flex-col items-center justify-center px-8 py-20 text-center bg-bg-card dark:bg-dark-card rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-full mb-6">
      <FiImage className="text-4xl text-gray-400 dark:text-gray-500" />
    </div>
    <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
      {isSearch ? 'Nenhum resultado encontrado' : 'Galeria vazia'}
    </h3>
    <p className="max-w-md mb-8 text-gray-500 dark:text-gray-400">
      {isSearch
        ? 'Tente ajustar seus filtros ou buscar por outros termos.'
        : 'Comece enviando algumas imagens para análise ou extraindo de PDFs.'}
    </p>
    {!isSearch && (
      <button
        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20"
        onClick={onUploadClick}
      >
        <FiUploadCloud /> Fazer Upload
      </button>
    )}
  </div>
);

const LightboxModal = ({ image, onClose, imageUrl, onTagAdd, onTagRemove }) => {
  if (!image) return null;

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

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

      {/* Sidebar de Metadados */}
      <div
        className="w-[360px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 p-6 overflow-y-auto flex flex-col gap-6"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 break-words">
            {image.filename}
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <span>{new Date(image.uploadedDate).toLocaleDateString()}</span>
            <span>•</span>
            <span>{(image.fileSize / 1024).toFixed(1)} KB</span>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Tags & Classificação</h3>
          <TagInput
            tags={image.imageType || []}
            onAdd={(tag) => onTagAdd(image, tag)}
            onRemove={(tag) => onTagRemove(image, tag)}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Metadados</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <span className="block text-gray-500 text-xs mb-1">Origem</span>
              <span className="font-medium dark:text-gray-200 capitalize">{image.sourceType}</span>
            </div>
            {/* Placeholder para Dimensões/Resolução se disponível no futuro */}
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <span className="block text-gray-500 text-xs mb-1">Formato</span>
              <span className="font-medium dark:text-gray-200 uppercase">{image.filename.split('.').pop()}</span>
            </div>
          </div>

          {/* Exif Metadata Placeholder */}
          {image.exifMetadata && Object.keys(image.exifMetadata).length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
              {Object.entries(image.exifMetadata).slice(0, 5).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-gray-500">{key}</span>
                  <span className="text-gray-900 dark:text-gray-300 truncate max-w-[120px]" title={String(value)}>{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Query Image Thumbnail for Similarity Mode (with selection support)
const QueryImageThumbnail = ({ image, isSelected, onSelect, isSelectionMode }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadImage = async () => {
      try {
        const blob = await api.download(`/images/${image.imageId || image.id}/download`);
        const url = URL.createObjectURL(blob);
        if (isMounted) {
          setImageUrl(url);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    };
    if (image) loadImage();
    return () => {
      isMounted = false;
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [image?.id, image?.imageId]);

  if (!image) return null;

  const handleClick = () => {
    if (onSelect) onSelect(image.id);
  };

  return (
    <div 
      onClick={handleClick}
      className={`group relative flex items-center gap-3 p-2 pr-4 rounded-xl shadow-md cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-500 ring-2 ring-indigo-500/30' 
          : 'bg-white dark:bg-gray-800 border-2 border-amber-400 dark:border-amber-500 hover:border-amber-500 dark:hover:border-amber-400'
      }`}
    >
      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
        {/* Selection Checkbox - inside the thumbnail */}
        <div 
          className={`absolute top-1 left-1 z-10 transition-opacity duration-200 ${isSelected || isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          onClick={(e) => { e.stopPropagation(); handleClick(); }}
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${
            isSelected
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-white/90 dark:bg-gray-800/90 border-white dark:border-gray-400 hover:border-indigo-500'
          }`}>
            {isSelected && <FiCheck size={12} strokeWidth={3} />}
          </div>
        </div>

        {loading ? (
          <div className="w-full h-full animate-pulse bg-gray-200 dark:bg-gray-600" />
        ) : imageUrl ? (
          <img src={imageUrl} alt={image.filename} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <FiImage size={20} />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">Query</span>
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px]" title={image.filename}>
          {image.filename}
        </p>
      </div>
    </div>
  );
};
const ImageCard = ({ image, onClick, onSelect, isSelected, isSelectionMode, similarityScore, rank }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Helper function for score color
  const getScoreColor = (score) => {
    if (score >= 0.9) return 'text-green-600 dark:text-green-400';
    if (score >= 0.7) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 0.5) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score) => {
    if (score >= 0.9) return 'bg-green-500';
    if (score >= 0.7) return 'bg-emerald-500';
    if (score >= 0.5) return 'bg-amber-500';
    return 'bg-red-500';
  };

  useEffect(() => {
    let isMounted = true;
    const loadImage = async () => {
      try {
        const blob = await api.download(`/images/${image.imageId}/download`);
        const url = URL.createObjectURL(blob);
        if (isMounted) {
          setImageUrl(url);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };
    if (image.imageId) loadImage();
    return () => {
      isMounted = false;
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [image.imageId]);

  return (
    <div
      className={`group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer
        ${isSelected
          ? 'ring-2 ring-indigo-500 border-indigo-500 shadow-lg scale-[1.02] z-10'
          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md'
        }`}
      onClick={(e) => {
        // Se estiver em modo de seleção ou segurando Ctrl/Cmd, faz toggle da seleção
        if (isSelectionMode || e.ctrlKey || e.metaKey) {
          e.stopPropagation();
          onSelect(image.id);
        } else {
          onClick(image, imageUrl);
        }
      }}
    >
      {/* Checkbox Overlay (Visible on Hover or Selected) */}
      <div
        className={`absolute top-3 left-3 z-20 transition-opacity duration-200 ${isSelected || isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        onClick={(e) => { e.stopPropagation(); onSelect(image.id); }}
      >
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
          : 'bg-white/80 dark:bg-black/50 border-white/50 dark:border-gray-400 hover:border-indigo-500'
          }`}>
          {isSelected && <FiCheck size={14} strokeWidth={3} />}
        </div>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-900">
        {loading ? (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 bg-gray-50 dark:bg-gray-800">
            <FiAlertTriangle size={24} className="mb-2 text-amber-500" />
            <span className="text-xs">Erro</span>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={image.filename}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}

        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
      </div>

      <div className="p-3">
        <div className="flex justify-between items-start mb-1 h-6">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm flex-1 pr-2" title={image.filename}>
            {image.filename}
          </h4>
        </div>

        {/* Similarity Score Bar - Only show when in similarity mode */}
        {similarityScore !== null && (
          <div className="flex items-center gap-2 mt-2 px-2 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">#{rank}</span>
              <div className={`w-1.5 h-1.5 rounded-full ${getScoreBgColor(similarityScore)}`}></div>
            </div>
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${getScoreBgColor(similarityScore)}`}
                style={{ width: `${similarityScore * 100}%` }}
              ></div>
            </div>
            <span className={`text-[10px] font-bold ${getScoreColor(similarityScore)}`}>
              {(similarityScore * 100).toFixed(0)}%
            </span>
          </div>
        )}

        {/* Tags - Only show when NOT in similarity mode */}
        {similarityScore === null && (
        <div className="flex items-center gap-2 mt-2 overflow-hidden h-6">
          {image.imageType && image.imageType.length > 0 ? (
            image.imageType.slice(0, 2).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-medium truncate max-w-[80px]">
                #{tag}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-gray-400 italic">Sem tags</span>
          )}
          {image.imageType && image.imageType.length > 2 && (
            <span className="text-[10px] text-gray-400">+{image.imageType.length - 2}</span>
          )}
        </div>
        )}

        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded capitalize">
            {image.sourceType === 'uploaded' ? 'Upload' : 'Extraída'}
          </span>
          <span className="text-[10px] text-gray-400">
            {new Date(image.uploadedDate).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
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
    removeImageType
  } = useImages();

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

  // Accumulated categories from all visited pages (persisted state)
  const [allCategories, setAllCategories] = useState(new Set());
  
  // Update available categories when images change (accumulate from all pages)
  useEffect(() => {
    if (images.length > 0) {
      setAllCategories(prev => {
        const newSet = new Set(prev);
        images.forEach(img => {
          (img.imageType || []).forEach(type => newSet.add(type));
        });
        return newSet;
      });
    }
  }, [images]);
  
  // Convert Set to sorted array for rendering
  const availableCategoriesForSimilarity = useMemo(() => {
    return Array.from(allCategories).sort();
  }, [allCategories]);

  useEffect(() => {
    fetchImages({ page: currentPage, per_page: IMAGES_PER_PAGE });
  }, [fetchImages, currentPage]);

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

      if (filteredMatches.length === 0) {
        showToast('Nenhuma imagem similar encontrada.', 'info');
      } else {
        showToast(`Encontradas ${filteredMatches.length} imagens similares!`, 'success');
      }
    } catch (err) {
      console.error('Similarity search error:', err);
      showAlert('Erro na busca', err.message || 'Erro ao buscar imagens similares.', 'error');
      setSimilarityMode(false);
      setSimilarityQueryImage(null);
    } finally {
      setSimilarityLoading(false);
    }
  }, [similarityTopK, similarityThreshold]);

  // Re-run search when parameters change (while in similarity mode)
  const handleUpdateSimilarityParams = useCallback(async () => {
    if (similarityMode && similarityQueryImage) {
      await handleSimilaritySearch(similarityQueryImage, similarityLabelFilter);
    }
  }, [similarityMode, similarityQueryImage, handleSimilaritySearch, similarityLabelFilter]);

  // Exit similarity mode
  const handleExitSimilarityMode = useCallback(() => {
    setSimilarityMode(false);
    setSimilarityQueryImage(null);
    setSimilarityResults([]);
    setSelectedImages(new Map());
    setSimilarityLabelFilter('all'); // Reset label filter
  }, []);

  // Derived State: Filtered Images (or similarity results)
  const filteredImages = useMemo(() => {
    // In similarity mode, only show similarity results (or empty if none)
    if (similarityMode) {
      return similarityResults.map(result => ({
        id: result.image_id,
        imageId: result.image_id,
        filename: result.filename || 'Sem nome',
        uploadedDate: result.uploaded_date || new Date().toISOString(),
        fileSize: result.file_size || 0,
        sourceType: result.source_type || 'unknown',
        imageType: result.image_type || [],
        similarityScore: result.similarity_score
      }));
    }

    let result = [...images];

    // 1. Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(img =>
        img.filename.toLowerCase().includes(query)
      );
    }

    // 2. Filters
    if (filters.sourceType !== 'all') {
      result = result.filter(img => img.sourceType === filters.sourceType);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      result = result.filter(img => new Date(img.uploadedDate) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      // Ajustar para fim do dia
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(img => new Date(img.uploadedDate) <= toDate);
    }

    if (filters.tags && filters.tags.length > 0) {
      result = result.filter(img =>
        filters.tags.some(tag => (img.imageType || []).includes(tag))
      );
    }

    // 3. Sorting
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
  }, [images, searchQuery, sortBy, filters, similarityMode, similarityResults]);

  // Handlers

  const handleSelect = useCallback((id) => {
    // Find the image data from current page images or similarity results
    const imageData = images.find(img => img.id === id) || 
                      filteredImages.find(img => img.id === id);
    
    setSelectedImages(prev => {
      const newMap = new Map(prev);
      if (newMap.has(id)) {
        newMap.delete(id);
      } else if (imageData) {
        newMap.set(id, imageData);
      }
      return newMap;
    });
  }, [images, filteredImages]);

  const handleClearSelection = () => setSelectedImages(new Map());

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    // Filter out extracted images
    const selectedImages = images.filter(img => selectedIds.has(img.id));
    const uploadedImages = selectedImages.filter(img => img.sourceType !== 'extracted');
    const extractedCount = selectedImages.length - uploadedImages.length;

    if (uploadedImages.length === 0) {
      showAlert(
        'Ação Bloqueada',
        `Você selecionou ${extractedCount} imagem(ns) extraída(s). Elas só podem ser removidas excluindo o PDF original.`,
        'warning'
      );
      return;
    }

    let confirmMessage = `Tem certeza que deseja excluir ${uploadedImages.length} imagens?`;
    if (extractedCount > 0) {
      confirmMessage += `\n\n(Atenção: ${extractedCount} imagens extraídas selecionadas serão ignoradas e não serão excluídas)`;
    }

    const confirmed = await showConfirm('Confirmação', confirmMessage);
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
        showToast(`${successCount} imagens excluídas com sucesso.`, 'success');
        fetchImages();
      }

      if (extractedCount > 0) {
        // Delay small alert to not conflict with toast if necessary, usually toast is enough
        setTimeout(() => showToast(`${extractedCount} imagens extraídas foram ignoradas.`, 'info'), 500);
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
      await addImageTypes(img, newTags);
      successCount++;
    }
    showToast(`${newTags.length} tags adicionadas a ${successCount} imagens.`);
    handleClearSelection();
  };

  const handleAnalyzeSelected = () => {
    showToast("Funcionalidade de análise em lote em breve!", "info");
  };

  // Find similar images handler
  const handleFindSimilar = useCallback(() => {
    if (selectedImages.size !== 1) {
      showToast('Selecione exatamente uma imagem para buscar similares.', 'warning');
      return;
    }
    // Get the image directly from the selectedImages Map
    const queryImage = Array.from(selectedImages.values())[0];
    if (queryImage) {
      handleSimilaritySearch(queryImage);
    }
  }, [selectedImages, handleSimilaritySearch]);

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
      />

      {/* Filter Sidebar */}
      <ImageFilters
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        filters={filters}
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
                <span className="text-sm font-medium">Voltar</span>
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
                  Busca por Similaridade
                  {similarityLoading && <FiRefreshCw className="animate-spin text-sm text-gray-400" />}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {!similarityLoading && `${filteredImages.length} resultados encontrados`}
                  {similarityLoading && 'Buscando...'}
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
                <label className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">Limiar:</label>
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
                <label className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">Categoria:</label>
                <select
                  value={similarityLabelFilter}
                  onChange={(e) => setSimilarityLabelFilter(e.target.value)}
                  className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer min-w-[100px]"
                >
                  <option value="all" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Todas</option>
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
                <span>Atualizar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header - Hidden in similarity mode */}
      {!similarityMode && (
      <header className="flex-none px-8 py-6 border-b border-gray-200 dark:border-gray-800 bg-bg-main dark:bg-bg-main z-30">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                Galeria
                {loading && <FiRefreshCw className="animate-spin text-lg text-gray-400" />}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Gerencie, organize e analise suas imagens extraídas e enviadas.
              </p>
            </div>
            
            {/* Pagination Controls */}
            {pagination.total > IMAGES_PER_PAGE && (
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPrev || loading}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  title="Página anterior"
                >
                  <FiChevronLeft />
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[140px] text-center">
                  {currentPage} / {pagination.totalPages} ({pagination.total} imagens)
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNext || loading}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  title="Próxima página"
                >
                  <FiChevronRight />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 group">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-gray-400 shadow-sm"
                placeholder="Buscar imagens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <FiX />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <select
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 cursor-pointer shadow-sm text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Mais recentes</option>
                <option value="oldest">Mais antigas</option>
                <option value="name_asc">Nome (A-Z)</option>
                <option value="name_desc">Nome (Z-A)</option>
                <option value="size_desc">Tamanho</option>
              </select>

              <button
                className={`px-4 py-2.5 rounded-xl border transition-all flex items-center gap-2 shadow-sm ${hasActiveFilters
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-500/50 dark:text-indigo-300'
                  : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50'
                  }`}
                onClick={() => setIsFilterPanelOpen(true)}
              >
                <FiFilter className={hasActiveFilters ? "fill-current" : ""} />
                <span className="hidden sm:inline">Filtros</span>
                {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-indigo-500"></span>}
              </button>

              <button
                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-indigo-600 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition-all shadow-sm"
                onClick={() => fetchImages({ page: currentPage, per_page: IMAGES_PER_PAGE })}
                title="Atualizar"
              >
                <FiRefreshCw />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/50 animate-in fade-in slide-in-from-top-2">
            <span className="text-xs text-gray-400 self-center uppercase font-bold tracking-wider mr-2">Ativos:</span>
            {filters.sourceType !== 'all' && (
              <span className="text-xs flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100">
                Origem: {filters.sourceType} <button onClick={() => setFilters(f => ({ ...f, sourceType: 'all' }))}><FiX /></button>
              </span>
            )}
            {filters.tags.map(tag => (
              <span key={tag} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100">
                #{tag} <button onClick={() => setFilters(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))}><FiX /></button>
              </span>
            ))}
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
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Erro ao carregar imagens</h3>
            <p className="text-gray-500 mb-6">{error}</p>
            <button onClick={() => fetchImages({ page: currentPage, per_page: IMAGES_PER_PAGE })} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">Tentar Novamente</button>
          </div>
        ) : filteredImages.length === 0 ? (
          <EmptyState isSearch={!!searchQuery || hasActiveFilters || similarityMode} onUploadClick={() => showAlert('Info', 'Use o menu lateral para Upload', 'info')} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
              {filteredImages.map((image, index) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  onClick={(img, url) => {
                    setLightboxImage(img);
                    setLightboxUrl(url);
                  }}
                  onSelect={handleSelect}
                  isSelected={selectedIds.has(image.id)}
                  isSelectionMode={selectedIds.size > 0}
                  similarityScore={image.similarityScore !== undefined ? image.similarityScore : null}
                  rank={image.similarityScore !== undefined ? index + 1 : null}
                />
              ))}
            </div>
            
            {/* Bottom Pagination Controls */}
            {!similarityMode && pagination.total > IMAGES_PER_PAGE && (
              <div className="flex items-center justify-center gap-4 mt-8 pb-8">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1 || loading}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Primeira
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
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                            i === current
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
                  Última
                </button>
                
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-4">
                  {pagination.total} imagens no total
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <LightboxModal
          image={images.find(i => i.id === lightboxImage.id) || lightboxImage}
          imageUrl={lightboxUrl}
          onClose={() => {
            setLightboxImage(null);
            setLightboxUrl(null);
          }}
          onTagAdd={addImageTypes}
          onTagRemove={removeImageType}
        />
      )}
    </div>
  );
};

export default ViewImagesPage;
