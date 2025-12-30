// src/pages/FlaggedImagesPage.jsx
/**
 * Flagged Images Page - Investigation Workspace
 * 
 * A dedicated page for in-depth analysis of flagged suspicious images.
 * Features split-view layout with image list + detail panel for annotations,
 * analysis history, and related images.
 * 
 * ELIS Scientific Integrity Platform
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FiFlag,
  FiAlertTriangle,
  FiCheck,
  FiRefreshCw,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiLayers,
  FiEye,
  FiInfo,
  FiEdit3,
  FiActivity,
  FiLink,
  FiClock,
  FiZap,
  FiCopy,
  FiTarget,
  FiExternalLink,
  FiMaximize2,
  FiMinimize2,
  FiPlay,
  FiImage,
  FiTrash2,
  FiChevronDown,
  FiBarChart2,
  FiGitBranch,
  FiFilter,
  FiCalendar,
  FiArrowLeft,
  FiTag,
  FiGrid,
  FiPlus,
} from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext';
import { useImages } from '../hooks/useImages';
import api, { API_BASE_URL } from '../services/api';
import SelectionToolbar from '../components/SelectionToolbar';
import TagInput from '../components/TagInput';
import AnnotationOverlay from '../components/AnnotationOverlay';
import { SkeletonCard, EmptyState } from '../components/common';
import AnnotationModal from '../components/annotation/AnnotationModal';
import DualImageComparisonModal from '../components/annotation/DualImageComparisonModal';
import BatchTagModal from '../components/BatchTagModal';
import LightboxModal from '../components/common/LightboxModal';
import ImageMetadataSidebar from '../components/common/ImageMetadataSidebar';
import { usePanelExtraction } from '../hooks/usePanelExtraction';
import { showToast, showConfirm, showAlert } from '../utils/alert';
import { AnalysisDetailsPanel, TypeBadge, StatusBadge } from '../components/analysis';
import ProvenanceGraph from '../components/ProvenanceGraph';
import RelationshipGraph from '../components/RelationshipGraph';

import AddRelatedImageModal from '../components/AddRelatedImageModal';
import RemoveRelationshipModal from '../components/RemoveRelationshipModal';


// --- Constants ---
const IMAGES_PER_PAGE = 12;
const TAB_DETAILS = 'details';
const TAB_ANNOTATIONS = 'annotations';
const TAB_ANALYSIS = 'analysis';
const TAB_RELATED = 'related';

// Analysis type configurations for display
const ANALYSIS_TYPE_CONFIG = {
  single_image_copy_move: { icon: FiCopy, color: 'blue', label: 'Copy-Move (Single)' },
  cross_image_copy_move: { icon: FiLayers, color: 'indigo', label: 'Copy-Move (Cross)' },
  trufor: { icon: FiZap, color: 'amber', label: 'Manipulation Detection' },
  provenance: { icon: FiTarget, color: 'purple', label: 'Provenance' },
  screening_tool: { icon: FiExternalLink, color: 'gray', label: 'Screening Tool' },
};

// Status configurations
const STATUS_CONFIG = {
  pending: { color: 'amber', label: 'Pending' },
  processing: { color: 'blue', label: 'Processing' },
  completed: { color: 'green', label: 'Completed' },
  failed: { color: 'red', label: 'Failed' },
};

// Analysis type mapping
const analysisTypeToPageKey = {
  'imageAnalysis': 'imageAnalysis',
  'manipulationDetection': 'manipulationDetection',
  'copyMoveSingle': 'copyMove',
  'copyMoveCross': 'copyMove',
  'provenance': 'provenance',
  'batchManipulation': 'manipulationDetection',
  'batchCopyMove': 'copyMove',
};

// Color utility
const COLOR_CLASSES = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// --- Helper Functions ---
const getThumbnailUrl = (imageId) => {
  const token = localStorage.getItem('authToken');
  return `${API_BASE_URL}/images/${imageId}/thumbnail${token ? `?token=${token}` : ''}`;
};

const getFullImageUrl = (imageId) => {
  const token = localStorage.getItem('authToken');
  return `${API_BASE_URL}/images/${imageId}/download${token ? `?token=${token}` : ''}`;
};

// --- Sub-Components ---

// Compact Image Row for Left Panel
const FlaggedImageRow = ({ image, isActive, isSelected, onClick, onSelect, isSelectionMode }) => {
  const [loading, setLoading] = useState(true);

  const handleSelectClick = (e) => {
    e.stopPropagation();
    if (onSelect) onSelect(image.id, e);
  };

  return (
    <div
      onClick={(e) => {
        // If shift key is held or in selection mode, toggle selection instead of opening detail
        if (e.shiftKey || isSelectionMode) {
          if (onSelect) onSelect(image.id, e);
        } else {
          onClick(image);
        }
      }}
      className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-150
        ${isSelected
          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500 ring-1 ring-indigo-300 dark:ring-indigo-700'
          : isActive
            ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-4 border-transparent'
        }`}
    >
      {/* Selection Checkbox */}
      <div
        className={`flex-shrink-0 transition-opacity duration-200 ${isSelected || isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        onClick={handleSelectClick}
      >
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
          ? 'bg-indigo-600 border-indigo-600 text-white'
          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 hover:border-indigo-500'
          }`}>
          {isSelected && <FiCheck size={12} strokeWidth={3} />}
        </div>
      </div>

      {/* Thumbnail */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
        {loading && (
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
        )}
        <img
          src={getThumbnailUrl(image.imageId)}
          alt={image.filename}
          className={`w-full h-full object-cover transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
          loading="lazy"
        />
        {/* Flag indicator */}
        <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
          <FiFlag size={8} className="text-white fill-current" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : isActive ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`}>
          {image.filename}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(image.uploadedDate).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};


// Tab Button
const TabButton = ({ icon: IconComponent, label, isActive, onClick, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all
      ${isActive
        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
  >
    <IconComponent size={16} />
    {label}
    {count !== undefined && count > 0 && (
      <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${isActive ? 'bg-red-200 dark:bg-red-800' : 'bg-gray-200 dark:bg-gray-700'}`}>
        {count}
      </span>
    )}
  </button>
);

// Analysis Row
const AnalysisRow = ({ analysis, onViewResults, onReproduce, t, locale }) => {
  const config = ANALYSIS_TYPE_CONFIG[analysis.type] || ANALYSIS_TYPE_CONFIG.screening_tool;
  const statusConfig = STATUS_CONFIG[analysis.status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
      {/* Type Icon */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${COLOR_CLASSES[config.color]}`}>
        <Icon size={18} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {config.label}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(analysis.created_at).toLocaleString(locale)}
        </p>
      </div>

      {/* Status Badge */}
      <span className={`px-2 py-1 text-[10px] font-medium rounded-full ${COLOR_CLASSES[statusConfig.color]}`}>
        {statusConfig.label}
      </span>

      {/* Actions */}
      {analysis.status === 'completed' && (
        <button
          onClick={() => onViewResults(analysis)}
          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
          title={t('flagged.viewResults') || 'View Results'}
        >
          <FiEye size={16} />
        </button>
      )}
      <button
        onClick={() => onReproduce(analysis)}
        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
        title={t('flagged.reproduce') || 'Reproduce'}
      >
        <FiPlay size={16} />
      </button>
    </div>
  );
};

// Related Image Card
const RelatedImageCard = ({ image, isSelected, onClick, onSelect, onToggleFlag, isSelectionMode, t }) => {
  const [loading, setLoading] = useState(true);
  const [isFlagged, setIsFlagged] = useState(image.isFlagged || false);

  const handleFlagClick = async (e) => {
    e.stopPropagation(); // Prevent card click
    try {
      await onToggleFlag(image);
      setIsFlagged(!isFlagged);
    } catch {
      // ignore
    }
  };

  const handleSelectClick = (e) => {
    e.stopPropagation();
    // Pass image data as third param so handleSelect can store it
    if (onSelect) onSelect(image.imageId || image.id, e, image);
  };

  return (
    <div
      className={`group relative rounded-lg overflow-hidden border transition-all ${isSelected
        ? 'border-indigo-500 ring-2 ring-indigo-300 dark:ring-indigo-700'
        : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700'
        }`}
    >
      <div
        onClick={(e) => {
          if (e.shiftKey || isSelectionMode) {
            // Pass image data as third param
            if (onSelect) onSelect(image.imageId || image.id, e, image);
          } else {
            onClick(image);
          }
        }}
        className="aspect-square bg-gray-100 dark:bg-gray-800 relative cursor-pointer"
      >
        {/* Selection Checkbox */}
        <div
          className={`absolute top-1.5 left-1.5 z-10 transition-opacity duration-200 ${isSelected || isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          onClick={handleSelectClick}
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${isSelected
            ? 'bg-indigo-600 border-indigo-600 text-white'
            : 'bg-white/90 dark:bg-gray-800/90 border-white dark:border-gray-400 hover:border-indigo-500'
            }`}>
            {isSelected && <FiCheck size={10} strokeWidth={3} />}
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
        )}
        <img
          src={getThumbnailUrl(image.imageId || image.id)}
          alt={image.filename}
          className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${loading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setLoading(false)}
          loading="lazy"
        />
      </div>
      <div className="p-2 flex items-center justify-between gap-1">
        <p className={`text-xs font-medium truncate flex-1 ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-white'}`}>{image.filename}</p>
        <button
          onClick={handleFlagClick}
          className={`flex-shrink-0 p-1 rounded transition-colors ${isFlagged
            ? 'text-red-500 bg-red-50 dark:bg-red-900/30'
            : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'
            }`}
          title={isFlagged ? (t('flagged.unflag') || 'Unflag') : (t('flagged.flag') || 'Flag')}
        >
          <FiFlag size={12} className={isFlagged ? 'fill-current' : ''} />
        </button>
      </div>
    </div>
  );
};

// Query Image Thumbnail for Similarity Mode (with selection support)
const QueryImageThumbnail = ({ image, isSelected, onSelect, isSelectionMode }) => {
  const token = localStorage.getItem('authToken');
  const imageUrl = useMemo(() => {
    if (!image) return null;
    return `${API_BASE_URL}/images/${image.imageId || image.id}/thumbnail${token ? `?token=${token}` : ''}`;
  }, [image, token]);

  if (!image) return null;

  const handleClick = (e) => {
    if (onSelect) onSelect(image.id, e);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex items-center gap-3 p-2 pr-4 rounded-xl shadow-md cursor-pointer transition-all duration-200 ${isSelected
        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-500 ring-2 ring-indigo-500/30'
        : 'bg-white dark:bg-gray-800 border-2 border-amber-400 dark:border-amber-500 hover:border-amber-500 dark:hover:border-amber-400'
        }`}
    >
      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
        {/* Selection Checkbox - inside the thumbnail */}
        <div
          className={`absolute top-1 left-1 z-10 transition-opacity duration-200 ${isSelected || isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          onClick={(e) => { e.stopPropagation(); handleClick(e); }}
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${isSelected
            ? 'bg-indigo-600 border-indigo-600 text-white'
            : 'bg-white/90 dark:bg-gray-800/90 border-white dark:border-gray-400 hover:border-indigo-500'
            }`}>
            {isSelected && <FiCheck size={12} strokeWidth={3} />}
          </div>
        </div>

        {imageUrl ? (
          <img src={imageUrl} alt={image.filename} className="w-full h-full object-cover" loading="lazy" />
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

// Similarity Result Card
const SimilarityResultCard = ({ image, onSelect, isSelected, isSelectionMode, similarityScore, rank, onToggleFlag, t }) => {
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

  const handleFlagClick = (e) => {
    e.stopPropagation();
    if (onToggleFlag) {
      onToggleFlag(image);
    }
  };

  return (
    <div
      className={`group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer
        ${isSelected
          ? 'ring-2 ring-indigo-500 border-indigo-500 shadow-lg scale-[1.02] z-10'
          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md'
        }`}
      onClick={(e) => {
        // Always toggle selection when clicking anywhere on the card
        if (onSelect) onSelect(image.image_id || image.id, e, image);
      }}
    >
      {/* Checkbox Overlay */}
      <div
        className={`absolute top-3 left-3 z-20 transition-opacity duration-200 ${isSelected || isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        onClick={(e) => { e.stopPropagation(); if (onSelect) onSelect(image.image_id || image.id, e, image); }}
      >
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
          : 'bg-white/80 dark:bg-black/50 border-white/50 dark:border-gray-400 hover:border-indigo-500'
          }`}>
          {isSelected && <FiCheck size={14} strokeWidth={3} />}
        </div>
      </div>

      {/* Flag Button */}
      <div
        className={`absolute top-3 right-3 z-20 transition-all duration-200 ${image.isFlagged ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'}`}
        onClick={handleFlagClick}
        title={image.isFlagged ? (t('flagged.unflag') || 'Remove flag') : (t('flagged.flag') || 'Flag as suspicious')}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md ${image.isFlagged
          ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
          : 'bg-white/90 dark:bg-black/60 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-black/80'
          }`}>
          <FiFlag size={16} className={image.isFlagged ? 'fill-current' : ''} />
        </div>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-900">
        {loading && !error && (
          <div className="absolute inset-0 z-10 w-full h-full bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 bg-gray-50 dark:bg-gray-800">
            <FiAlertTriangle size={24} className="mb-2 text-amber-500" />
            <span className="text-xs">{t('image.error') || 'Error'}</span>
          </div>
        ) : (
          <img
            src={getThumbnailUrl(image.image_id || image.id)}
            alt={image.filename}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${loading ? 'opacity-0' : 'opacity-100'}`}
            loading="lazy"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
          />
        )}

        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
      </div>

      <div className="p-3">
        <div className="flex justify-between items-start mb-1 h-6">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate pr-2 flex-1" title={image.filename}>
            {image.filename}
          </h4>
          {rank && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] font-medium border border-gray-200 dark:border-gray-600">
              #{rank}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${getScoreBgColor(similarityScore)}`}></div>
            <span className={`text-xs font-bold ${getScoreColor(similarityScore)}`}>
              {(similarityScore * 100).toFixed(0)}%
            </span>
          </div>
          <span className="text-[10px] text-gray-400">
            {image.fileSize ? (image.fileSize / 1024).toFixed(0) + ' KB' : ''}
          </span>
        </div>
      </div>
    </div>
  );
};


// Detail Panel Component
const FlaggedImageDetailPanel = ({
  image,
  onUnflag,
  onNavigate,
  selectedIds,
  onSelect,
  isSelectionMode,
  onAddTag,
  onRemoveTag,
  annotationModalOpen,
  setAnnotationModalOpen,
  t,
  locale
}) => {
  const [activeTab, setActiveTab] = useState(TAB_DETAILS);
  const [analyses, setAnalyses] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  /* relatedImages replaced by relationshipGraph */
  // const [relatedImages, setRelatedImages] = useState([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [loadingRelationshipGraph, setLoadingRelationshipGraph] = useState(false);
  const [dualAnnotationCount, setDualAnnotationCount] = useState(0);
  const [selectedRelatedNode, setSelectedRelatedNode] = useState(null);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);
  const [relationshipGraph, setRelationshipGraph] = useState(null);
  const [showAddRelatedModal, setShowAddRelatedModal] = useState(false);
  const [graphDepth, setGraphDepth] = useState(5);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  // State for inline analysis details view
  const [showAnalyzeMenu, setShowAnalyzeMenu] = useState(false);
  const analyzeMenuRef = useRef(null);

  // State for inline analysis details view
  const [selectedAnalysisForView, setSelectedAnalysisForView] = useState(null);

  // Reset selected analysis and active tab when image changes
  useEffect(() => {
    setSelectedAnalysisForView(null);
  }, [image?.imageId]);

  // Analysis options for dropdown
  const analysisOptions = [
    { key: 'imageAnalysis', icon: FiImage, label: t('analyze.imageAnalysis') || 'Image Analysis' },
    { key: 'manipulationDetection', icon: FiZap, label: t('analyze.manipulationDetection') || 'Manipulation Detection' },
    { key: 'copyMoveSingle', icon: FiCopy, label: t('analyze.copyMoveSingle') || 'Copy-Move (Single)' },
    { key: 'provenance', icon: FiGitBranch, label: t('analyze.provenance') || 'Provenance' },
  ];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (analyzeMenuRef.current && !analyzeMenuRef.current.contains(event.target)) {
        setShowAnalyzeMenu(false);
      }
    };
    if (showAnalyzeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAnalyzeMenu]);

  // Fetch analyses for this image
  useEffect(() => {
    const fetchAnalyses = async () => {
      if (!image?.imageId) return;
      setLoadingAnalyses(true);
      try {
        const data = await api.getAnalysesByImage(image.imageId);
        setAnalyses(data || []);

        // Find related images from cross-image analyses
        const relatedImageIds = new Set();
        data?.forEach(analysis => {
          if (analysis.target_image_id && analysis.target_image_id !== image.imageId) {
            relatedImageIds.add(analysis.target_image_id);
          }
          if (analysis.source_image_id && analysis.source_image_id !== image.imageId) {
            relatedImageIds.add(analysis.source_image_id);
          }
        });

        // Fetch actual image data for related images to get flag status and filenames
        const relatedImagesData = [];
        for (const imageId of relatedImageIds) {
          try {
            const imgData = await api.get(`/images/${imageId}`);
            relatedImagesData.push({
              id: imageId,
              imageId: imageId,
              filename: imgData.filename || `Image ${imageId.slice(-6)}`,
              isFlagged: imgData.is_flagged || false
            });
          } catch {
            // Image might be deleted, add with minimal info
            relatedImagesData.push({
              id: imageId,
              imageId: imageId,
              filename: `Image ${imageId.slice(-6)}`,
              isFlagged: false
            });
          }
        }
        // setRelatedImages(relatedImagesData); // Removed: state variable no longer exists
      } catch (err) {
        console.error('Error fetching analyses:', err);
      } finally {
        setLoadingAnalyses(false);
      }
    };
    fetchAnalyses();
  }, [image?.imageId]);

  // Fetch relationship graph when Related tab is active or depth changes
  useEffect(() => {
    const fetchRelationshipGraph = async () => {
      if (!image?.imageId || activeTab !== TAB_RELATED) return;
      setLoadingRelationshipGraph(true);
      try {
        const graphData = await api.getRelationshipGraph(image.imageId, graphDepth);
        setRelationshipGraph(graphData);
      } catch (err) {
        console.error('Error fetching relationship graph:', err);
        setRelationshipGraph(null);
      } finally {
        setLoadingRelationshipGraph(false);
      }
    };
    fetchRelationshipGraph();
  }, [image?.imageId, activeTab, graphDepth]);

  // Fetch annotations for this image
  useEffect(() => {
    const fetchAnnotations = async () => {
      if (!image?.imageId) return;
      setLoadingAnnotations(true);
      try {
        const [singleData, dualData] = await Promise.all([
          api.getSingleAnnotations(image.imageId),
          api.getDualAnnotations(image.imageId)
        ]);
        setAnnotations(singleData || []);
        setDualAnnotationCount(dualData?.length || 0);
      } catch (err) {
        console.error('Error fetching annotations:', err);
      } finally {
        setLoadingAnnotations(false);
      }
    };
    fetchAnnotations();
  }, [image?.imageId]);

  // Handlers


  // Handler for navigating to full results page (from inline panel)
  const handleViewFullResults = (analysis) => {
    // Map analysis types to page keys (matches AnalysisDashboardPage)
    const typeToPageKey = {
      'trufor': 'manipulationDetection',
      'single_image_copy_move': 'copyMove',
      'cross_image_copy_move': 'copyMove',
      'provenance': 'provenance',
      'cbir_search': 'cbirSearch',
      'screening_tool': 'imageAnalysis'
    };

    const pageKey = typeToPageKey[analysis.type];
    if (pageKey && analysis.status === 'completed') {
      // Store analysis data for viewing results
      const viewResultsData = {
        analysisId: analysis._id,
        imageId: analysis.source_image_id,
        targetImageId: analysis.target_image_id || null,
        parameters: analysis.parameters,
        type: analysis.type,
        results: analysis.results || {},
        targetPage: pageKey
      };
      sessionStorage.setItem('viewResultsAnalysis', JSON.stringify(viewResultsData));
      // Navigate by refreshing
      window.location.reload();
    }
  };

  const handleReproduce = (analysis) => {
    // Map analysis types to page keys (matches AnalysisDashboardPage)
    const typeToPageKey = {
      'trufor': 'manipulationDetection',
      'single_image_copy_move': 'copyMove',
      'cross_image_copy_move': 'copyMove',
      'provenance': 'provenance',
      'cbir_search': 'cbirSearch',
      'screening_tool': 'imageAnalysis'
    };

    const pageKey = typeToPageKey[analysis.type];
    if (pageKey && analysis.source_image_id) {
      // Store parameters and target page in sessionStorage
      const reproduceData = {
        imageId: analysis.source_image_id,
        targetImageId: analysis.target_image_id || null,
        parameters: analysis.parameters,
        type: analysis.type,
        targetPage: pageKey
      };
      sessionStorage.setItem('reproduceAnalysis', JSON.stringify(reproduceData));
      // Navigate by refreshing
      window.location.reload();
    }
  };

  const handleStartNewAnalysis = (analysisType) => {
    // Map internal types to actual page keys
    const pageMapping = {
      'imageAnalysis': 'imageAnalysis',
      'manipulationDetection': 'manipulationDetection',
      'copyMove': 'copyMove',
      'copyMoveSingle': 'copyMove',
      'provenance': 'provenance'
    };

    const targetPage = pageMapping[analysisType] || analysisType;

    sessionStorage.setItem('startAnalysis', JSON.stringify({
      imageIds: [image.imageId],
      targetPage: targetPage,
      mode: 'single'
    }));

    if (onNavigate) {
      onNavigate(targetPage);
    } else {
      window.location.reload();
    }
  };

  const handleOpenAnnotation = () => {
    setAnnotationModalOpen(true);
  };

  const handleAnnotationSaveSuccess = async () => {
    // Refresh annotations after save
    try {
      const data = await api.getSingleAnnotations(image.imageId);
      setAnnotations(data || []);
    } catch (err) {
      console.error('Error refreshing annotations:', err);
    }
  };



  if (!image) return null;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
      {/* Header - Compact, no image */}
      <div className="flex-none px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Selection Checkbox for Main Image */}
            <div
              className={`flex-shrink-0 cursor-pointer transition-opacity duration-200 ${selectedIds?.has(image.id) || isSelectionMode ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
              onClick={() => onSelect && onSelect(image.id)}
              title={selectedIds?.has(image.id) ? 'Deselect image' : 'Select image'}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedIds?.has(image.id)
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 hover:border-indigo-500'
                }`}>
                {selectedIds?.has(image.id) && <FiCheck size={14} strokeWidth={3} />}
              </div>
            </div>
            <h3 className={`text-lg font-bold truncate flex-1 mr-4 ${selectedIds?.has(image.id) ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-white'}`}>
              {image.filename}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUnflag(image)}
              className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              title={t('flagged.unflag') || 'Remove flag'}
            >
              <FiFlag size={16} className="fill-current" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs - Right after header */}
      <div className="flex-none flex gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <TabButton
          icon={FiInfo}
          label={t('flagged.tabs.details') || 'Details'}
          isActive={activeTab === TAB_DETAILS}
          onClick={() => setActiveTab(TAB_DETAILS)}
        />
        <TabButton
          icon={FiEdit3}
          label={t('flagged.tabs.annotations') || 'Annotations'}
          isActive={activeTab === TAB_ANNOTATIONS}
          onClick={() => setActiveTab(TAB_ANNOTATIONS)}
          count={annotations.length}
        />
        <TabButton
          icon={FiActivity}
          label={t('flagged.tabs.analysis') || 'Analysis'}
          isActive={activeTab === TAB_ANALYSIS}
          onClick={() => setActiveTab(TAB_ANALYSIS)}
          count={analyses.length}
        />
        <TabButton
          icon={FiLink}
          label={t('flagged.tabs.related') || 'Related'}
          isActive={activeTab === TAB_RELATED}
          onClick={() => setActiveTab(TAB_RELATED)}
          count={relationshipGraph?.total_nodes_count > 1
            ? relationshipGraph.total_nodes_count - 1
            : (relationshipGraph?.nodes?.length > 1 ? relationshipGraph.nodes.length - 1 : 0)}
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Details Tab */}
        {activeTab === TAB_DETAILS && (
          <div className="h-full flex flex-col">
            {/* Image Preview - Now in Details tab */}
            <div className={`flex-shrink-0 ${imageExpanded ? 'flex-1 min-h-[300px]' : 'h-64'} bg-gray-100 dark:bg-gray-800 relative`}>
              <img
                src={getFullImageUrl(image.imageId)}
                alt={image.filename}
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => setImageExpanded(!imageExpanded)}
                className="absolute bottom-3 right-3 p-2 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                {imageExpanded ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
              </button>
            </div>

            {/* Metadata and Actions */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('flagged.origin') || 'Origin'}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{image.sourceType}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('flagged.uploaded') || 'Uploaded'}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{new Date(image.uploadedDate).toLocaleDateString(locale)}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('flagged.fileSize') || 'File Size'}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{(image.fileSize / 1024).toFixed(1)} KB</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('flagged.format') || 'Format'}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white uppercase">{image.filename.split('.').pop()}</span>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t('flagged.tags') || 'Tags'}</h4>
                <TagInput
                  tags={image.imageType || []}
                  onAdd={(tag) => onAddTag(image, tag)}
                  onRemove={(tag) => onRemoveTag(image, tag)}
                />
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t('flagged.quickActions') || 'Quick Actions'}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleOpenAnnotation}
                    className="flex items-center justify-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-sm font-medium"
                  >
                    <FiEdit3 size={16} />
                    {t('flagged.annotate') || 'Annotate'}
                  </button>

                  {/* Analyze Dropdown */}
                  <div className="relative" ref={analyzeMenuRef}>
                    <button
                      onClick={() => setShowAnalyzeMenu(!showAnalyzeMenu)}
                      className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg text-sm font-medium transition-colors ${showAnalyzeMenu
                        ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                        : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                        }`}
                    >
                      <FiBarChart2 size={16} />
                      {t('selection.analyze') || 'Analyze'}
                      <FiChevronDown size={14} className={`transition-transform ${showAnalyzeMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {showAnalyzeMenu && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                          {t('analyze.selectAnalysis') || 'Select Analysis'}
                        </div>
                        {analysisOptions.map((option) => {
                          const Icon = option.icon;
                          return (
                            <button
                              key={option.key}
                              onClick={() => {
                                setShowAnalyzeMenu(false);
                                handleStartNewAnalysis(option.key);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                            >
                              <Icon className="text-lg flex-shrink-0" />
                              <span className="text-sm font-medium">{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Annotations Tab */}
        {activeTab === TAB_ANNOTATIONS && (
          <div className="h-full flex flex-col">
            {/* Filter dual/cross-image annotations */}
            {(() => {
              const displayAnnotations = annotations; // Single annotations separated via API

              return (
                <>
                  {/* Header */}
                  <div className="flex-none flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {t('flagged.annotations') || 'Annotations'} ({displayAnnotations.length})
                    </h4>
                    <button
                      onClick={handleOpenAnnotation}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <FiEdit3 size={12} />
                      {t('flagged.editAnnotations') || 'Edit'}
                    </button>
                  </div>

                  {/* Dual Annotation Banner */}
                  {dualAnnotationCount > 0 && (
                    <div className="flex-none px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                        <FiLayers size={14} />
                        <span className="text-xs font-medium">
                          {t('flagged.hasDualAnnotations').replace('{count}', dualAnnotationCount) || `This image has ${dualAnnotationCount} linked annotation${dualAnnotationCount > 1 ? 's' : ''} related to other image${dualAnnotationCount > 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowComparisonModal(true)}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 underline"
                      >
                        {t('flagged.compareImages') || 'Compare Images'}
                      </button>
                    </div>
                  )}

                  {/* Image with Annotation Overlays */}
                  <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-800 p-4 overflow-hidden">
                    <div className="relative max-h-[50vh] max-w-full flex items-center justify-center">
                      <AnnotationOverlay
                        isActive={false}
                        annotations={displayAnnotations.map(a => {
                          // Normalize annotations to ensure 'coords' exists
                          if (a.coords) return a;
                          // Fallback for regions (convert 0-1 to %)
                          if (a.regions && a.regions.length > 0) {
                            const r = a.regions[0];
                            if (r.type === 'rect' || r.type === 'rectangle') {
                              return {
                                ...a,
                                type: 'rectangle', // Ensure type matches what Overlay expects
                                coords: {
                                  x: (r.x || 0) * 100,
                                  y: (r.y || 0) * 100,
                                  width: (r.width || 0) * 100,
                                  height: (r.height || 0) * 100
                                }
                              };
                            }
                          }
                          return a;
                        })}
                        onAnnotationClick={() => handleOpenAnnotation()}
                      >
                        <img
                          src={getFullImageUrl(image.imageId)}
                          alt={image.filename}
                          className="max-h-[50vh] max-w-full object-contain rounded shadow-sm"
                          draggable={false}
                        />
                      </AnnotationOverlay>

                      {/* Empty state overlay */}
                      {displayAnnotations.length === 0 && !loadingAnnotations && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-black/60 backdrop-blur-sm p-4 rounded-xl text-center text-white pointer-events-auto">
                            <FiEdit3 size={24} className="mx-auto mb-2 opacity-80" />
                            <p className="text-sm font-medium mb-2">{t('flagged.noAnnotations') || 'No annotations'}</p>
                            <button
                              onClick={handleOpenAnnotation}
                              className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              {t('flagged.addAnnotation') || 'Add Annotation'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Loading overlay */}
                      {loadingAnnotations && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm rounded">
                          <FiRefreshCw className="animate-spin text-indigo-600 dark:text-indigo-400" size={32} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Annotation List - Compact list below image */}
                  {displayAnnotations.length > 0 && (
                    <div className="flex-none max-h-28 overflow-y-auto p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                      <div className="flex flex-wrap gap-2">
                        {displayAnnotations.map((anno, index) => {
                          // Match color logic from AnnotationOverlay
                          const getGroupColor = (type, id) => {
                            if (type !== 'copy-move') return '#EF4444'; // Red for general manipulation
                            const colors = [
                              '#3B82F6', // Blue
                              '#10B981', // Green
                              '#F59E0B', // Amber
                              '#8B5CF6', // Purple
                              '#EC4899', // Pink
                              '#06B6D4', // Cyan
                            ];
                            return colors[((id || 1) - 1) % colors.length] || '#3B82F6';
                          };
                          const color = getGroupColor(anno.type, anno.group_id);
                          return (
                            <div
                              key={anno._id}
                              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs"
                            >
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                                {anno.text || anno.type || `Annotation ${index + 1}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Analysis Tab - Split View Layout */}
        {activeTab === TAB_ANALYSIS && (
          <div className="h-full flex">
            {/* Left Sidebar - Analysis List */}
            <div className="w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-gray-900/50">
              {/* Header */}
              <div className="flex-none p-3 border-b border-gray-200 dark:border-gray-800">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('flagged.analysisHistory') || 'Analysis History'} ({analyses.length})
                </h4>
              </div>

              {/* Start New Analysis Buttons */}
              <div className="flex-none p-2 border-b border-gray-200 dark:border-gray-800 relative z-20">
                <button
                  onClick={() => setShowAnalyzeMenu(!showAnalyzeMenu)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <span className="flex items-center gap-1.5">
                    <FiPlus size={14} />
                    {t('analyze.startNewAnalysis') || 'New Analysis'}
                  </span>
                  <FiChevronDown size={14} className={`transition-transform duration-200 ${showAnalyzeMenu ? 'rotate-180' : ''}`} />
                </button>

                {showAnalyzeMenu && (
                  <div
                    ref={analyzeMenuRef}
                    className="absolute top-full left-2 right-2 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 text-left"
                  >
                    <div className="py-1">
                      {analysisOptions.map((option) => (
                        <button
                          key={option.key}
                          onClick={() => {
                            handleStartNewAnalysis(option.key);
                            setShowAnalyzeMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 group border-b border-gray-100 dark:border-gray-800 last:border-0"
                        >
                          <option.icon size={14} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Analysis List */}
              <div className="flex-1 overflow-y-auto">
                {loadingAnalyses ? (
                  <div className="p-2 space-y-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    ))}
                  </div>
                ) : analyses.length === 0 ? (
                  <div className="text-center py-6 px-3 text-gray-400">
                    <FiActivity size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">{t('flagged.noAnalyses') || 'No analyses yet'}</p>
                  </div>
                ) : (
                  <div className="p-1 space-y-1">
                    {analyses.map(analysis => {
                      const isActive = selectedAnalysisForView?._id === analysis._id;
                      const getTypeIcon = (type) => {
                        switch (type) {
                          case 'trufor': return <FiZap size={12} />;
                          case 'single_image_copy_move':
                          case 'cross_image_copy_move': return <FiCopy size={12} />;
                          case 'provenance': return <FiLink size={12} />;
                          default: return <FiImage size={12} />;
                        }
                      };
                      const getStatusColor = (status) => {
                        switch (status) {
                          case 'completed': return 'text-green-500';
                          case 'failed': return 'text-red-500';
                          case 'processing': return 'text-yellow-500';
                          default: return 'text-gray-400';
                        }
                      };
                      return (
                        <button
                          key={analysis._id}
                          onClick={() => setSelectedAnalysisForView(analysis)}
                          className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${isActive
                            ? 'bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-300 dark:border-indigo-700'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
                            }`}
                        >
                          <span className={getStatusColor(analysis.status)}>
                            {getTypeIcon(analysis.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                              {analysis.type?.replace(/_/g, ' ') || 'Analysis'}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">
                              {new Date(analysis.created_at).toLocaleDateString(locale)}
                            </p>
                          </div>
                          {analysis.status === 'completed' && (
                            <FiCheck size={12} className="text-green-500 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Analysis Details */}
            <div className="flex-1 min-w-0 flex flex-col">
              {selectedAnalysisForView ? (
                <AnalysisDetailsPanel
                  analysis={selectedAnalysisForView}
                  onClose={() => setSelectedAnalysisForView(null)}
                  onReproduce={handleReproduce}
                  onViewResults={handleViewFullResults}
                  t={t}
                  locale={locale}
                  embedded={true}
                  ProvenanceGraph={ProvenanceGraph}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <FiActivity size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">{t('flagged.selectAnalysis') || 'Select an analysis'}</p>
                    <p className="text-xs mt-1">{t('flagged.selectAnalysisHint') || 'Choose from the list to view details'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Related Tab */}
        {activeTab === TAB_RELATED && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex-none flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t('flagged.relatedImages') || 'Related Images'} ({relationshipGraph?.nodes?.length > 1 ? relationshipGraph.nodes.length - 1 : 0})
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('flagged.relatedDescription') || 'Images linked via cross-image analysis or manual linking'}
                </p>
              </div>
              <div className="flex gap-2">
                {selectedRelatedNode && selectedRelatedNode.id !== image.imageId && (() => {
                  const directEdge = relationshipGraph.edges.find(e =>
                    (e.source === image.imageId && e.target === selectedRelatedNode.id) ||
                    (e.target === image.imageId && e.source === selectedRelatedNode.id)
                  );

                  return (
                    <button
                      onClick={() => {
                        if (!directEdge) return;
                        setShowRemoveConfirmModal(true);
                      }}
                      disabled={!directEdge}
                      title={directEdge ? (t('relationship.removeRelationship') || 'Remove relationship') : (t('relationship.indirectRelationship') || 'Cannot remove indirect relationship')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${directEdge
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed opacity-60'
                        }`}
                    >
                      <FiTrash2 size={12} />
                      {t('common.remove') || 'Remove'}
                    </button>
                  );
                })()}
                <button
                  onClick={() => setShowAddRelatedModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <FiPlus size={12} />
                  {t('flagged.addRelated') || 'Add Related'}
                </button>
                <button
                  onClick={() => setShowComparisonModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  title="Compare this image with another and add cross-image annotations"
                >
                  <FiLayers size={12} />
                  {t('flagged.compareImages') || 'Compare Images'}
                </button>
              </div>
            </div>

            {/* Add Related Modal */}
            <AddRelatedImageModal
              isOpen={showAddRelatedModal}
              onClose={() => setShowAddRelatedModal(false)}
              currentImageId={image.imageId}
              currentImageFilename={image.filename}
              onRelationshipsCreated={(count) => {
                showToast.success(`Linked ${count} image${count !== 1 ? 's' : ''} as related`);
                // Refresh the relationship graph
                setLoadingRelationshipGraph(true);
                api.getRelationshipGraph(image.imageId, graphDepth) // Use current depth
                  .then(data => setRelationshipGraph(data))
                  .catch(console.error)
                  .finally(() => setLoadingRelationshipGraph(false));
              }}
            />

            {/* Dual Image Comparison Modal */}
            <DualImageComparisonModal
              isOpen={showComparisonModal}
              selectedImage={image ? { id: image.imageId, filename: image.filename } : null}
              onClose={() => setShowComparisonModal(false)}
              onSaveSuccess={() => {
                showToast(t('flagged.annotationsSaved') || 'Annotations saved successfully', 'success');
                // Refresh the relationship graph
                setLoadingRelationshipGraph(true);
                api.getRelationshipGraph(image.imageId, graphDepth)
                  .then(data => setRelationshipGraph(data))
                  .catch(console.error)
                  .finally(() => setLoadingRelationshipGraph(false));
              }}
            />

            {/* Remove Relationship Modal */}
            <RemoveRelationshipModal
              isOpen={showRemoveConfirmModal}
              onClose={() => setShowRemoveConfirmModal(false)}
              sourceImage={image}
              targetNode={selectedRelatedNode}
              isRemoving={loadingRelationshipGraph}
              onConfirm={async () => {
                if (!selectedRelatedNode || !image) return;

                // Find edge again (safe)
                const edge = relationshipGraph.edges.find(e =>
                  (e.source === image.imageId && e.target === selectedRelatedNode.id) ||
                  (e.target === image.imageId && e.source === selectedRelatedNode.id)
                );

                if (!edge || !edge.id) {
                  showToast.error("Cannot remove: Relationship ID missing");
                  setShowRemoveConfirmModal(false);
                  return;
                }

                try {
                  setLoadingRelationshipGraph(true);
                  await api.removeRelationship(edge.id);
                  showToast.success(t('flagged.relationshipRemoved') || "Relationship removed");

                  // Refresh graph
                  const data = await api.getRelationshipGraph(image.imageId, graphDepth);
                  setRelationshipGraph(data);
                  setSelectedRelatedNode(null);
                  setShowRemoveConfirmModal(false);
                } catch (error) {
                  console.error("Failed to remove relationship", error);
                  showToast.error(t('flagged.removeRelationshipError') || "Failed to remove relationship");
                } finally {
                  setLoadingRelationshipGraph(false);
                }
              }}
            />

            {/* Graph Content */}
            <div className="flex-1 min-h-[400px]">
              {loadingRelationshipGraph ? (
                <div className="h-full flex items-center justify-center">
                  <FiRefreshCw className="animate-spin text-indigo-600 dark:text-indigo-400" size={32} />
                </div>
              ) : relationshipGraph && relationshipGraph.nodes && relationshipGraph.nodes.length > 1 ? (
                <RelationshipGraph
                  nodes={relationshipGraph.nodes}
                  edges={relationshipGraph.edges}
                  mstEdges={relationshipGraph.mst_edges}
                  queryImageId={image.imageId}
                  getImageUrl={getThumbnailUrl}
                  currentDepth={graphDepth}
                  onDepthChange={setGraphDepth}
                  totalNodesCount={relationshipGraph.total_nodes_count || 0}
                  onNodeClick={(node) => {
                    // Toggle selection
                    setSelectedRelatedNode(prev => (prev?.id === node.id ? null : node));

                    if (node.id !== image.imageId) {
                      // Navigate logic... kept but maybe secondary to selection?
                      // If we want to navigate on click, selection might be tricky.
                      // Let's allow selection on click. Double click to navigate?
                      // Or Selection is primary.
                      // Current code navigates on click.
                      // Updated: Click selects. Navigation info in toast.
                      // Or just select.
                    }
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-center py-12 text-gray-400">
                  <div>
                    <FiLink size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">{t('flagged.noRelated') || 'No related images'}</p>
                    <p className="text-xs mt-1 max-w-[250px] mx-auto">
                      {t('flagged.noRelatedHint') || 'Run cross-image analysis to find relationships, or manually add related images'}
                    </p>
                    <button
                      onClick={() => handleStartNewAnalysis('copyMove')}
                      className="mt-4 flex items-center gap-1.5 px-4 py-2 mx-auto text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <FiCopy size={12} />
                      {t('flagged.runCrossAnalysis') || 'Run Cross-Image Analysis'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Inline Annotation Modal */}
      <AnnotationModal
        isOpen={annotationModalOpen}
        imageUrl={getFullImageUrl(image.imageId)}
        imageId={image.imageId}
        imageName={image.filename}
        existingAnnotations={annotations}
        onClose={() => setAnnotationModalOpen(false)}
        onSaveSuccess={handleAnnotationSaveSuccess}
      />

      {/* Dual Image Comparison Modal */}
      {showComparisonModal && (
        <DualImageComparisonModal
          isOpen={showComparisonModal}
          onClose={() => setShowComparisonModal(false)}
          selectedImage={image}

          onSaveSuccess={() => {
            // Refresh annotations
            const fetchAnnotations = async () => {
              if (!image?.imageId) return;
              try {
                const [singleData, dualData] = await Promise.all([
                  api.getSingleAnnotations(image.imageId),
                  api.getDualAnnotations(image.imageId)
                ]);
                setAnnotations(singleData || []);
                setDualAnnotationCount(dualData?.length || 0);
              } catch (err) {
                console.error('Error fetching annotations:', err);
              }
            };
            fetchAnnotations();
          }}
        />
      )}
    </div >
  );
};

// --- Main Page Component ---
const FlaggedImagesPage = ({ onNavigate }) => {
  const { t, locale } = useLanguage();
  const { toggleFlag, deleteImage, addImageTypes, removeImageType } = useImages();

  // Panel extraction
  const {
    isExtracting,
    startExtraction,
    status: extractionStatus
  } = usePanelExtraction();

  // State
  const [flaggedImages, setFlaggedImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, hasPrev: false, hasNext: false });

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [availableTags, setAvailableTags] = useState([]);

  // Fetch tags on mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await api.get('/images/tags');
        setAvailableTags(tags);
      } catch (err) {
        console.error('Error fetching tags:', err);
      }
    };
    fetchTags();
  }, []);

  // Selected image for detail panel
  const [selectedImage, setSelectedImage] = useState(null);

  // Gallery collapse state - minimizes when image is selected
  const [isGalleryMinimized, setIsGalleryMinimized] = useState(false);

  // Selection state for batch operations
  const [selectedImages, setSelectedImages] = useState(new Map());
  const selectedIds = useMemo(() => new Set(selectedImages.keys()), [selectedImages]);
  const [lastClickedId, setLastClickedId] = useState(null);
  const [lastActionWasSelect, setLastActionWasSelect] = useState(true);

  // Annotation Modal State (Lifted from detail panel for ESC handling)
  const [annotationModalOpen, setAnnotationModalOpen] = useState(false);

  // Batch Tag Modal
  const [isBatchTagModalOpen, setIsBatchTagModalOpen] = useState(false);

  // Lightbox for metadata view
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // CBIR Similarity Search Mode
  const [similarityMode, setSimilarityMode] = useState(false);
  const [similarityQueryImage, setSimilarityQueryImage] = useState(null);
  const [similarityResults, setSimilarityResults] = useState([]);
  const [similarityLoading, setSimilarityLoading] = useState(false);
  const [similarityTopK, setSimilarityTopK] = useState(20);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5);
  const SIMILARITY_PER_PAGE = 12;
  const [similarityPage, setSimilarityPage] = useState(1);


  // Fetch flagged images
  const fetchFlaggedImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        per_page: IMAGES_PER_PAGE,
        flagged: true,
        include_annotated: true,
      };
      if (searchQuery) {
        params.search = searchQuery;
      }
      if (dateFrom) {
        params.date_from = dateFrom;
      }
      if (dateTo) {
        params.date_to = dateTo;
      }
      if (selectedTag) {
        params.image_type = selectedTag;
      }

      const response = await api.get('/images', params);

      // Transform response
      const imageList = Array.isArray(response) ? response : (response.items || response.images || []);
      const transformedImages = imageList.map(img => ({
        id: img._id || img.id,
        imageId: img._id || img.id,
        filename: img.filename,
        imageType: img.image_type || [],
        uploadedDate: img.uploaded_at || img.uploadedDate,
        sourceType: img.source_type || 'uploaded',
        isFlagged: img.is_flagged || false,
        analysisStatus: img.analysis_status,
        analysisResults: img.analysis_results,
        fileSize: img.file_size,
      }));

      setFlaggedImages(transformedImages);

      // Auto-select first image if none selected
      if (transformedImages.length > 0 && !selectedImage) {
        setSelectedImage(transformedImages[0]);
      }

      // Set pagination from response
      // Backend returns PaginatedImageResponse with: items, total, page, per_page, total_pages, has_next, has_prev
      const totalImages = response.total ?? transformedImages.length;
      const totalPages = response.total_pages ?? Math.ceil(totalImages / IMAGES_PER_PAGE);

      setPagination({
        total: totalImages,
        totalPages: totalPages,
        hasPrev: response.has_prev ?? (currentPage > 1),
        hasNext: response.has_next ?? (currentPage < totalPages),
      });
    } catch (err) {
      console.error('Error fetching flagged images:', err);
      setError(err.message || 'Failed to fetch flagged images');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, dateFrom, dateTo, selectedTag, selectedImage]);

  useEffect(() => {
    fetchFlaggedImages();
  }, [fetchFlaggedImages]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFrom, dateTo, selectedTag]);

  // Check if any filters are active
  const hasActiveFilters = dateFrom || dateTo || selectedTag;

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setDateFrom('');
    setDateTo('');
    setSelectedTag('');
    setSearchQuery('');
  }, []);

  // All similarity images (for selection purposes)
  const allSimilarityImages = useMemo(() => {
    if (!similarityMode) return [];

    // Create a set of flagged IDs for quick lookup
    const flaggedIds = new Set(flaggedImages.map(img => img.id));

    return similarityResults.map(result => ({
      id: result.image_id,
      imageId: result.image_id,
      filename: result.filename || t('image.noName') || 'Unknown',
      uploadedDate: result.uploaded_date || new Date().toISOString(),
      fileSize: result.file_size || 0,
      sourceType: result.source_type || 'unknown',
      imageType: result.image_type || [],
      similarityScore: result.similarity_score,
      // Check if this image is in the flagged list
      isFlagged: flaggedIds.has(result.image_id) || result.is_flagged || false
    }));
  }, [similarityMode, similarityResults, flaggedImages, t]);

  // Similarity pagination
  const similarityTotalPages = Math.ceil(allSimilarityImages.length / SIMILARITY_PER_PAGE);

  // Filter images by search query
  const filteredImages = useMemo(() => {
    if (similarityMode) {
      const startIndex = (similarityPage - 1) * SIMILARITY_PER_PAGE;
      const endIndex = startIndex + SIMILARITY_PER_PAGE;
      return allSimilarityImages.slice(startIndex, endIndex);
    }

    if (!searchQuery) return flaggedImages;
    const query = searchQuery.toLowerCase();
    return flaggedImages.filter(img =>
      img.filename.toLowerCase().includes(query) ||
      (img.imageType && img.imageType.some(tag => tag.toLowerCase().includes(query)))
    );
  }, [flaggedImages, searchQuery, similarityMode, allSimilarityImages, similarityPage, SIMILARITY_PER_PAGE]);

  // Handlers
  const handleImageClick = useCallback((image) => {
    setSelectedImage(image);
    setIsGalleryMinimized(true); // Collapse gallery when image selected
  }, []);

  // Selection handler with shift-click range support
  // imageDataParam is optional - used for images not in main lists (e.g., related images)
  const handleSelect = useCallback((id, event, imageDataParam) => {
    // Find the image data from various sources
    const imageData = imageDataParam ||
      flaggedImages.find(img => img.id === id) ||
      similarityResults.find(result => (result.image_id || result.id) === id) ||
      (selectedImage?.id === id ? selectedImage : null);

    // Shift-click range selection/deselection
    if (event?.shiftKey && lastClickedId && lastClickedId !== id) {
      const visibleImages = similarityMode ? allSimilarityImages : filteredImages;
      const lastIndex = visibleImages.findIndex(img => img.id === lastClickedId);
      const currentIndex = visibleImages.findIndex(img => img.id === id);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const startIndex = Math.min(lastIndex, currentIndex);
        const endIndex = Math.max(lastIndex, currentIndex);
        const rangeImages = visibleImages.slice(startIndex, endIndex + 1);

        setSelectedImages(prev => {
          const newMap = new Map(prev);
          if (lastActionWasSelect) {
            rangeImages.forEach(img => newMap.set(img.id, img));
          } else {
            rangeImages.forEach(img => newMap.delete(img.id));
          }
          return newMap;
        });

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
      } else {
        // Create image data object, either from provided data or construct minimal info
        const imgToAdd = imageData || { id: id, imageId: id, filename: `Image ${id.slice(-8)}` };
        newMap.set(id, {
          id: id,
          imageId: imgToAdd.imageId || imgToAdd.image_id || id,
          filename: imgToAdd.filename || `Image ${id.slice(-8)}`,
          sourceType: imgToAdd.sourceType || imgToAdd.source_type,
          imageType: imgToAdd.imageType || imgToAdd.image_type || []
        });
      }
      return newMap;
    });

    setLastClickedId(id);
    setLastActionWasSelect(!wasSelected);
  }, [flaggedImages, similarityResults, similarityMode, lastClickedId, selectedIds, lastActionWasSelect, selectedImage, allSimilarityImages, filteredImages]);

  const handleUnflag = async (image) => {
    try {
      await toggleFlag(image);
      // Remove from local state immediately
      setFlaggedImages(prev => prev.filter(img => img.id !== image.id));
      // If this was the selected image, select another
      if (selectedImage?.id === image.id) {
        const remaining = flaggedImages.filter(img => img.id !== image.id);
        setSelectedImage(remaining.length > 0 ? remaining[0] : null);
      }
      // Update selection if it was selected
      setSelectedImages(prev => {
        const newMap = new Map(prev);
        newMap.delete(image.id);
        return newMap;
      });
    } catch (err) {
      console.error('Error unflagging image:', err);
    }
  };

  const handleAddTag = async (image, tag) => {
    const success = await addImageTypes(image, tag);
    if (success) {
      if (selectedImage && selectedImage.id === image.id) {
        const newTags = Array.isArray(tag) ? tag : [tag];
        setSelectedImage(prev => ({
          ...prev,
          imageType: [...new Set([...(prev.imageType || []), ...newTags])]
        }));
      }
      fetchFlaggedImages();
    }
  };

  const handleRemoveTag = async (image, tag) => {
    const success = await removeImageType(image, tag);
    if (success) {
      if (selectedImage && selectedImage.id === image.id) {
        setSelectedImage(prev => ({
          ...prev,
          imageType: (prev.imageType || []).filter(t => t !== tag)
        }));
      }
      fetchFlaggedImages();
    }
  };



  const handleClearSelection = useCallback(() => {
    setSelectedImages(new Map());
    setLastClickedId(null);
  }, []);

  // Delete selected images
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const selectedArray = Array.from(selectedImages.values());
    const uploadedImages = selectedArray.filter(img => img.sourceType !== 'extracted');
    const extractedCount = selectedArray.length - uploadedImages.length;

    if (uploadedImages.length === 0) {
      showAlert(
        t('batch.actionBlocked'),
        t('batch.extractedOnlyMessage')?.replace('{count}', extractedCount) || `${extractedCount} extracted images cannot be deleted`,
        'warning'
      );
      return;
    }

    let confirmMessage = (t('batch.confirmDelete') || 'Delete {count} images?').replace('{count}', uploadedImages.length);
    if (extractedCount > 0) {
      confirmMessage += `\n\n${(t('batch.confirmDeleteNote') || '{count} extracted images will be skipped').replace('{count}', extractedCount)}`;
    }

    const confirmed = await showConfirm(t('batch.confirmation') || 'Confirm', confirmMessage);
    if (confirmed) {
      let successCount = 0;
      handleClearSelection();

      for (const img of uploadedImages) {
        const success = await deleteImage(img, { skipConfirm: true });
        if (success) successCount++;
      }

      if (successCount > 0) {
        showToast(`${successCount} ${t('batch.imagesDeleted') || 'images deleted'}`, 'success');
        fetchFlaggedImages();
      }
    }
  };

  // Tag selected images
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
    showToast(`${newTags.length} ${t('batch.tagsAdded') || 'tags added to'} ${successCount} ${t('batch.images') || 'images'}`);
    handleClearSelection();
  };

  // Analyze selected images


  const handleAnalyzeSelected = useCallback((analysisType) => {
    const selectedArray = Array.from(selectedImages.values());
    if (selectedArray.length === 0) return;

    if (analysisType === 'copyMoveCross' && selectedArray.length !== 2) {
      showToast(t('analyze.selectTwoImages') || 'Select exactly 2 images for cross copy-move', 'warning');
      return;
    }

    let mode = 'single';
    if (analysisType === 'copyMoveCross') {
      mode = 'cross';
    } else if (analysisType === 'batchManipulation' || analysisType === 'batchCopyMove') {
      mode = 'batch';
    }

    const startAnalysisData = {
      imageIds: selectedArray.map(img => img.imageId || img.id),
      targetPage: analysisTypeToPageKey[analysisType],
      mode: mode
    };

    sessionStorage.setItem('startAnalysis', JSON.stringify(startAnalysisData));
    showToast(t('analyze.navigatingToTool') || 'Navigating to analysis tool...', 'success');

    if (onNavigate) {
      onNavigate(startAnalysisData.targetPage);
    } else {
      window.location.reload();
    }
  }, [selectedImages, t, onNavigate]);

  // Find similar images (CBIR)
  const handleSimilaritySearch = useCallback(async (queryImage) => {
    if (!queryImage) return;

    setSimilarityMode(true);
    setSimilarityQueryImage(queryImage);
    setSimilarityLoading(true);
    setSimilarityResults([]);

    try {
      const payload = {
        image_id: queryImage.imageId || queryImage.id,
        top_k: similarityTopK + 1,
        labels: null
      };

      const response = await api.post('/cbir/search/sync', payload);

      const filteredMatches = response.matches
        .filter(match => match.image_id !== (queryImage.imageId || queryImage.id) && match.similarity_score >= similarityThreshold)
        .slice(0, similarityTopK);

      setSimilarityResults(filteredMatches);
      setSimilarityPage(1);

      if (filteredMatches.length === 0) {
        showToast(t('similarity.noResults') || 'No similar images found', 'info');
      } else {
        showToast(`${t('similarity.found') || 'Found'} ${filteredMatches.length} ${t('similarity.similarImages') || 'similar images'}`, 'success');
      }
    } catch (err) {
      console.error('Similarity search error:', err);
      showAlert(t('similarity.searchError') || 'Search Error', err.message || t('similarity.searchErrorMessage') || 'Failed to search for similar images', 'error');
      setSimilarityMode(false);
      setSimilarityQueryImage(null);
    } finally {
      setSimilarityLoading(false);
    }
  }, [similarityTopK, similarityThreshold, t]);

  const handleFindSimilar = useCallback(() => {
    if (selectedImages.size !== 1) {
      showToast(t('similarity.selectOneImage') || 'Select exactly 1 image to find similar', 'warning');
      return;
    }
    const queryImage = Array.from(selectedImages.values())[0];
    if (queryImage) {
      handleSimilaritySearch(queryImage);
    }
  }, [selectedImages, handleSimilaritySearch, t]);

  const handleExitSimilarityMode = useCallback(() => {
    setSimilarityMode(false);
    setSimilarityQueryImage(null);
    setSimilarityResults([]);
    setSelectedImages(new Map());
  }, []);

  // View metadata handler
  const handleViewMetadata = useCallback(async () => {
    if (selectedImages.size !== 1) return;

    const selectedImg = Array.from(selectedImages.values())[0];
    if (!selectedImg) return;

    try {
      const blob = await api.download(`/images/${selectedImg.imageId || selectedImg.id}/download`);
      const url = URL.createObjectURL(blob);
      setLightboxImage(selectedImg);
      setLightboxUrl(url);
    } catch (err) {
      console.error('Error loading image for metadata view:', err);
      showToast(t('image.loadError') || 'Error loading image', 'error');
    }
  }, [selectedImages, t]);

  // Extract panels handler
  const handleExtractPanels = useCallback(async () => {
    if (selectedImages.size === 0) return;

    const imageIds = Array.from(selectedImages.keys());
    const result = await startExtraction(imageIds);

    if (result.success && !result.pending) {
      fetchFlaggedImages();
      handleClearSelection();
    } else if (result.success && result.pending) {
      handleClearSelection();
    }
  }, [selectedImages, startExtraction, fetchFlaggedImages, handleClearSelection]);

  // Refresh when extraction completes
  useEffect(() => {
    if (extractionStatus === 'completed') {
      fetchFlaggedImages();
    }
  }, [extractionStatus, fetchFlaggedImages]);

  const handlePageChange = useCallback((newPage) => {
    const maxPage = Math.max(1, pagination.totalPages);
    const boundedPage = Math.min(Math.max(1, newPage), maxPage);
    if (boundedPage !== currentPage) {
      setCurrentPage(boundedPage);
    }
  }, [currentPage, pagination.totalPages]);




  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if input is focused (but allow ranges/buttons to be escaped)
      if (e.target.tagName === 'TEXTAREA' || (e.target.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button', 'submit'].includes(e.target.type))) {
        return;
      }

      if (e.key === 'Escape') {
        const modalOpen = isBatchTagModalOpen || lightboxImage || annotationModalOpen;
        if (modalOpen) {
          // If modal is open, let it close first
          if (lightboxImage) setLightboxImage(null);
          // BatchTagModal handles its own close via callback usually, but if we control isOpen...
          if (isBatchTagModalOpen) setIsBatchTagModalOpen(false);
          return;
        }

        // Priority order for ESC: selection -> selected image -> similarity mode -> filters
        if (selectedIds.size > 0) {
          handleClearSelection();
        } else if (selectedImage) {
          // Deselect image and expand gallery
          setSelectedImage(null);
          setIsGalleryMinimized(false);
        } else if (similarityMode) {
          handleExitSimilarityMode();
        } else if (hasActiveFilters || searchQuery) {
          handleClearFilters();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isBatchTagModalOpen, lightboxImage, selectedImage,
    similarityMode, selectedIds, hasActiveFilters, searchQuery,
    handleExitSimilarityMode, handleClearSelection, handleClearFilters,
    annotationModalOpen
  ]);

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden">
      {/* Batch Tag Modal */}
      <BatchTagModal
        isOpen={isBatchTagModalOpen}
        onClose={() => setIsBatchTagModalOpen(false)}
        onConfirm={handleBatchTagConfirm}
        count={selectedIds.size}
      />

      {/* Lightbox Modal */}
      <LightboxModal
        isOpen={!!lightboxImage}
        imageUrl={lightboxUrl}
        onClose={() => {
          setLightboxImage(null);
          setLightboxUrl(null);
        }}
        title={lightboxImage?.filename}
      >
        <ImageMetadataSidebar
          image={lightboxImage}
          t={t}
          locale={locale}
          onTagAdd={handleAddTag}
          onTagRemove={handleRemoveTag}
        />
      </LightboxModal>

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



      {/* Similarity Mode Header */}
      {similarityMode && (
        <div className="flex-none px-4 sm:px-6 py-4 border-b border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 z-30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {similarityQueryImage && (
                <QueryImageThumbnail
                  image={similarityQueryImage}
                  isSelected={selectedIds.has(similarityQueryImage.imageId || similarityQueryImage.id)}
                  isSelectionMode={selectedIds.size > 0}
                  onSelect={handleSelect}
                />
              )}

              <div>
                <h3 className="text-lg font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <FiZap className="fill-current" />
                  {t('similarity.title') || 'Similarity Search'}
                </h3>
                <p className="text-sm text-amber-600/80 dark:text-amber-500/80 max-w-md truncate">
                  {t('similarity.resultsFor') || 'Showing results for'}: {similarityQueryImage?.filename}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Controls */}
              {/* Top-K Slider */}
              <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800 shadow-sm">
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
              <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800 shadow-sm">
                <label className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{t('similarity.threshold') || 'Threshold'}:</label>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={similarityThreshold}
                  onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                  className="w-24 accent-amber-500"
                />
                <span className="text-sm font-semibold text-gray-900 dark:text-white w-8">{(similarityThreshold * 100).toFixed(0)}%</span>
              </div>

              <button
                onClick={async () => {
                  if (similarityQueryImage) {
                    await handleSimilaritySearch(similarityQueryImage);
                  }
                }}
                disabled={similarityLoading}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {similarityLoading ? <FiRefreshCw className="animate-spin" /> : <FiSearch />}
                <span>{t('common.update') || 'Update'}</span>
              </button>

              <div className="h-8 w-px bg-amber-200 dark:bg-amber-800 mx-2"></div>

              <button
                onClick={handleExitSimilarityMode}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiX />
                <span>{t('common.exit') || 'Exit'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      {!similarityMode && (
        <header className="flex-none px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-bg-main dark:bg-bg-main z-30">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                  <FiFlag className="text-red-500" />
                  {t('flagged.title') || 'Flagged Images'}
                  {loading && <FiRefreshCw className="animate-spin text-lg text-gray-400" />}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 hidden md:block">
                  {t('flagged.subtitle') || 'Investigation workspace for suspicious images'}
                </p>
              </div>

              {/* Stats */}
              {pagination.total > 0 && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">
                    {pagination.total} {t('flagged.flaggedImages') || 'flagged'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {/* Search */}
              <div className="relative group">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                <input
                  type="text"
                  className="w-48 sm:w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all placeholder:text-gray-400 shadow-sm"
                  placeholder={t('flagged.searchPlaceholder') || 'Search...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <FiX />
                  </button>
                )}
              </div>

              {/* Filter Toggle Button */}
              <button
                className={`flex-shrink-0 p-2.5 rounded-xl border transition-all shadow-sm ${showFilters || hasActiveFilters
                  ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-600 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700'
                  }`}
                onClick={() => setShowFilters(!showFilters)}
                title={t('common.filters') || 'Filters'}
              >
                <FiFilter />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {/* Refresh Button */}
              <button
                className="flex-shrink-0 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-600 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition-all shadow-sm"
                onClick={fetchFlaggedImages}
                title={t('common.refresh') || 'Refresh'}
              >
                <FiRefreshCw />
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex flex-wrap items-center gap-4">
              {/* Tag Filter */}
              <div className="flex items-center gap-2">
                <FiTag className="text-gray-400" />
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('filters.tag') || 'Tag'}</label>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-1.5 outline-none focus:border-red-500"
                >
                  <option value="">{t('filters.tagAll') || 'All Tags'}</option>
                  {availableTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('filters.dateFrom') || 'From'}</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-1.5 outline-none focus:border-red-500"
                />
              </div>

              {/* Date To */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('filters.dateTo') || 'To'}</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-1.5 outline-none focus:border-red-500"
                />
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  {t('filters.clearFilters') || 'Clear Filters'}
                </button>
              )}
            </div>
          )}
        </header>
      )}

      {/* Similarity View Grid */}
      {similarityMode && (
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50/50 dark:bg-gray-900/50">
          {similarityLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <FiRefreshCw size={32} className="animate-spin text-amber-500 mb-4" />
              <p className="text-gray-500">{t('similarity.searching') || 'Searching for similar images...'}</p>
            </div>
          ) : filteredImages.length === 0 ? (
            <EmptyState
              title={t('similarity.noResults') || 'No results'}
              description={t('similarity.noResultsDesc') || 'Try adjusting the threshold or search criteria.'}
              icon="search"
            />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {filteredImages.map((image, index) => (
                  <SimilarityResultCard
                    key={image.id}
                    image={image}
                    similarityScore={image.similarityScore}
                    rank={(similarityPage - 1) * SIMILARITY_PER_PAGE + index + 1}
                    isSelected={selectedIds.has(image.id)}
                    isSelectionMode={selectedIds.size > 0}
                    onSelect={handleSelect}
                    onToggleFlag={toggleFlag} // Using toggleFlag directly from props or hook? Need hook usage
                    t={t}
                  />
                ))}
              </div>

              {/* Similarity Pagination */}
              {similarityTotalPages > 1 && (
                <div className="flex justify-center mt-8 pb-8">
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <button
                      onClick={() => setSimilarityPage(Math.max(1, similarityPage - 1))}
                      disabled={similarityPage === 1}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      <FiChevronLeft size={20} />
                    </button>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {similarityPage} / {similarityTotalPages}
                    </span>
                    <button
                      onClick={() => setSimilarityPage(Math.min(similarityTotalPages, similarityPage + 1))}
                      disabled={similarityPage === similarityTotalPages}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      <FiChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {/* Main Content - Split View */}
      {!similarityMode && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Collapsible Image List */}
          <div
            className={`flex-shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-gray-900/50 transition-all duration-300 ease-in-out ${isGalleryMinimized ? 'w-16' : 'w-72'
              }`}
          >
            {/* List Header */}
            <div className="flex items-center justify-between px-2 py-3 border-b border-gray-200 dark:border-gray-800">
              {!isGalleryMinimized && (
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">
                  {t('flagged.imageList') || 'Images'}
                </span>
              )}
              <button
                onClick={() => setIsGalleryMinimized(!isGalleryMinimized)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mx-auto"
                title={isGalleryMinimized ? (t('common.expand') || 'Expand') : (t('common.collapse') || 'Collapse')}
              >
                {isGalleryMinimized ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
              </button>
              {!isGalleryMinimized && pagination.total > IMAGES_PER_PAGE && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPrev || loading}
                    className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    <FiChevronLeft size={14} />
                  </button>
                  <span className="text-xs text-gray-500">{currentPage}/{pagination.totalPages}</span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNext || loading}
                    className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    <FiChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Image List */}
            <div className={`flex-1 overflow-y-auto ${isGalleryMinimized ? 'p-1 space-y-1' : 'p-2 space-y-1'}`}>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <div key={i} className={`${isGalleryMinimized ? 'w-12 h-12 mx-auto' : 'flex items-center gap-3 p-2'}`}>
                    <div className={`${isGalleryMinimized ? 'w-12 h-12' : 'w-12 h-12'} rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse`} />
                    {!isGalleryMinimized && (
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
                      </div>
                    )}
                  </div>
                ))
              ) : error ? (
                <div className="text-center py-8 text-red-500">
                  <FiAlertTriangle size={24} className="mx-auto mb-2" />
                  {!isGalleryMinimized && <p className="text-sm">{t('flagged.error') || 'Error loading'}</p>}
                </div>
              ) : filteredImages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <FiFlag size={24} className="mx-auto mb-2 opacity-50" />
                  {!isGalleryMinimized && <p className="text-sm">{t('flagged.empty') || 'No flagged images'}</p>}
                </div>
              ) : isGalleryMinimized ? (
                // Minimized view: thumbnails only
                filteredImages.map(image => (
                  <button
                    key={image.id}
                    onClick={() => handleImageClick(image)}
                    className={`w-12 h-12 mx-auto block rounded-lg overflow-hidden border-2 transition-all ${selectedImage?.id === image.id
                      ? 'border-red-500 ring-2 ring-red-500/30'
                      : 'border-transparent hover:border-gray-300'
                      }`}
                    title={image.filename}
                  >
                    <img
                      src={`${API_BASE_URL}/images/${image.imageId}/thumbnail?token=${localStorage.getItem('authToken')}`}
                      alt={image.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))
              ) : (
                // Expanded view: full row
                filteredImages.map(image => (
                  <FlaggedImageRow
                    key={image.id}
                    image={image}
                    isActive={selectedImage?.id === image.id}
                    isSelected={selectedIds.has(image.id)}
                    onClick={handleImageClick}
                    onSelect={handleSelect}
                    isSelectionMode={selectedIds.size > 0}
                    t={t}
                  />
                ))
              )}
            </div>

            {/* Pagination Footer - only show when expanded and multiple pages */}
            {!isGalleryMinimized && pagination.totalPages > 1 && (
              <div className="flex-none border-t border-gray-200 dark:border-gray-800 px-3 py-3 bg-white dark:bg-gray-900">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPrev || loading}
                    className="px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    ←
                  </button>
                  <span className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-red-50 dark:bg-red-900/30 rounded-lg min-w-[60px] text-center">
                    {currentPage} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNext || loading}
                    className="px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Detail View */}
          <div className="flex-1 min-w-0">
            {selectedImage ? (
              <FlaggedImageDetailPanel
                image={selectedImage}
                onClose={() => { setSelectedImage(null); setIsGalleryMinimized(false); }}
                onUnflag={handleUnflag}
                onNavigate={onNavigate}
                onRefresh={fetchFlaggedImages}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                isSelectionMode={selectedIds.size > 0}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                annotationModalOpen={annotationModalOpen}
                setAnnotationModalOpen={setAnnotationModalOpen}
                t={t}
                locale={locale}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <FiImage size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">{t('flagged.selectImage') || 'Select an image'}</p>
                  <p className="text-sm mt-1">{t('flagged.selectImageHint') || 'Click an image from the list to view details'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlaggedImagesPage;
