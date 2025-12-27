// src/pages/AnalysisDashboardPage.jsx
/**
 * Analysis Dashboard Page
 * 
 * Provides a comprehensive view of all past analyses with filtering,
 * pagination, and the ability to view details and reproduce analyses.
 * 
 * ELIS Scientific Integrity Platform
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ProvenanceGraph from '../components/ProvenanceGraph';
import {
    FiActivity,
    FiFilter,
    FiRefreshCw,
    FiSearch,
    FiCalendar,
    FiChevronLeft,
    FiChevronRight,
    FiClock,
    FiCheck,
    FiX,
    FiLoader,
    FiAlertCircle,
    FiImage,
    FiSliders,
    FiCopy,
    FiShield,
    FiShare2,
    FiDatabase,
    FiDownload,
    FiEye,
    FiRepeat,
    FiPlay,
    FiExternalLink,
    FiChevronDown,
    FiTag,
    FiTarget,

    FiZap,
    FiSun,
    FiLayers,
    FiGrid,
    FiList,
    FiColumns,
    FiBarChart2,
    FiTrash2,
    FiFileText,
    FiAlertTriangle
} from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { API_BASE_URL } from '../config/api';
import { showAlert, showToast } from '../utils/alert';
import { SkeletonCard, EmptyState } from '../components/common';

// Helper to get thumbnail URL with auth token
const getThumbnailUrl = (imageId) => {
    const token = localStorage.getItem('authToken');
    return `${API_BASE_URL}/images/${imageId}/thumbnail${token ? `?token=${token}` : ''}`;
};

// --- Constants ---
const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds for processing analyses
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Analysis type configurations
const ANALYSIS_TYPE_CONFIG = {
    single_image_copy_move: {
        icon: FiCopy,
        color: 'blue',
        labelKey: 'analysisDashboard.types.singleCopyMove'
    },
    cross_image_copy_move: {
        icon: FiCopy,
        color: 'indigo',
        labelKey: 'analysisDashboard.types.crossCopyMove'
    },
    trufor: {
        icon: FiShield,
        color: 'purple',
        labelKey: 'analysisDashboard.types.trufor'
    },
    cbir_search: {
        icon: FiSearch,
        color: 'green',
        labelKey: 'analysisDashboard.types.cbir'
    },
    provenance: {
        icon: FiShare2,
        color: 'orange',
        labelKey: 'analysisDashboard.types.provenance'
    },
    external: {
        icon: FiExternalLink,
        color: 'gray',
        labelKey: 'analysisDashboard.types.external'
    }
};

// External analysis subtype icons (for Image Analysis page tools)
const EXTERNAL_SUBTYPE_CONFIG = {
    ela: { icon: FiZap, label: 'Error Level Analysis', color: 'amber' },
    noise: { icon: FiActivity, label: 'Noise Analysis', color: 'teal' },
    gradient: { icon: FiSun, label: 'Luminance Gradient', color: 'yellow' },
    levelSweep: { icon: FiSliders, label: 'Level Sweep', color: 'cyan' },
    cloneDetection: { icon: FiCopy, label: 'Clone Detection', color: 'pink' },
    metadata: { icon: FiTag, label: 'Metadata', color: 'gray' }
};

// Status configurations
const STATUS_CONFIG = {
    pending: {
        icon: FiClock,
        color: 'yellow',
        labelKey: 'analysisDashboard.status.pending'
    },
    processing: {
        icon: FiLoader,
        color: 'blue',
        labelKey: 'analysisDashboard.status.processing',
        animate: true
    },
    completed: {
        icon: FiCheck,
        color: 'green',
        labelKey: 'analysisDashboard.status.completed'
    },
    failed: {
        icon: FiX,
        color: 'red',
        labelKey: 'analysisDashboard.status.failed'
    }
};

// Color mapping for badges
const COLOR_CLASSES = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
};

// --- Skeleton Components ---
const SkeletonRow = () => (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
        <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
);

// --- Sub-Components ---

// Type Badge
const TypeBadge = ({ type, subtype, t }) => {
    // For external analyses, show the subtype with its specific icon/color
    if (type === 'external' && subtype && EXTERNAL_SUBTYPE_CONFIG[subtype]) {
        const subtypeConfig = EXTERNAL_SUBTYPE_CONFIG[subtype];
        const Icon = subtypeConfig.icon;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${COLOR_CLASSES[subtypeConfig.color]}`}>
                <Icon size={12} />
                {subtypeConfig.label}
            </span>
        );
    }

    const config = ANALYSIS_TYPE_CONFIG[type] || ANALYSIS_TYPE_CONFIG.external;
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${COLOR_CLASSES[config.color]}`}>
            <Icon size={12} />
            {t(config.labelKey) || type}
        </span>
    );
};

// Status Badge
const StatusBadge = ({ status, t }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${COLOR_CLASSES[config.color]}`}>
            <Icon size={12} className={config.animate ? 'animate-spin' : ''} />
            {t(config.labelKey) || status}
        </span>
    );
};

// Parameters Display (expandable)
const ParametersDisplay = ({ parameters, sourceImageId, targetImageId, t, defaultExpanded = false }) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    // Removed: useEffect that fetched image metadata for filenames
    // This was causing multiple API calls per analysis row just to display filenames
    // Now we display image IDs directly which is more efficient

    if (!parameters || Object.keys(parameters).length === 0) {
        return <span className="text-gray-400 text-xs">{t('analysisDashboard.noParameters')}</span>;
    }

    // Build display list
    const regularEntries = Object.entries(parameters).filter(([key]) =>
        key !== 'analysis_subtype' && key !== 'target_image_id' && key !== 'search_image_ids'
    );

    // Prepend Source/Target info
    const displayItems = [];
    if (sourceImageId) {
        displayItems.push({ key: 'Source Image', value: sourceImageId });
    }

    // Check both prop and parameters for target ID
    const effectiveTargetId = targetImageId || parameters.target_image_id;
    if (effectiveTargetId) {
        displayItems.push({ key: 'Target Image', value: effectiveTargetId });
    }

    if (parameters.search_image_ids) {
        // If multiple, join names (limit to first 3)
        const ids = Array.isArray(parameters.search_image_ids)
            ? parameters.search_image_ids
            : String(parameters.search_image_ids).split(',');

        const displayIds = ids.slice(0, 3);
        const hasMore = ids.length > 3;

        const idList = displayIds.map(id => id.trim()).join(', ');
        displayItems.push({
            key: 'Target Images',
            value: idList + (hasMore ? ` (+${ids.length - 3} more)` : '')
        });
    }

    // Add regular params
    regularEntries.forEach(([key, val]) => displayItems.push({ key, value: val }));

    const limit = defaultExpanded ? displayItems.length : 2;
    const finalDisplay = expanded ? displayItems : displayItems.slice(0, limit);

    return (
        <div className="space-y-1">
            {finalDisplay.map((item, idx) => (
                <div key={item.key + idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">{item.key}:</span>
                    <span className="text-gray-900 dark:text-gray-200 font-mono break-all text-right">
                        {typeof item.value === 'boolean' ? (item.value ? 'Yes' : 'No') : String(item.value)}
                    </span>
                </div>
            ))}
            {!defaultExpanded && displayItems.length > 2 && (
                <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-1"
                >
                    {expanded ? t('analysisDashboard.showLess') : t('analysisDashboard.showMore')}
                    <FiChevronDown className={`transition-transform ${expanded ? 'rotate-180' : ''}`} size={12} />
                </button>
            )}
        </div>
    );
};

// Filter Panel
const FilterPanel = ({ filters, onFilterChange, onReset, t }) => {
    const [showDateRange, setShowDateRange] = useState(false);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FiFilter size={16} />
                    {t('analysisDashboard.filters')}
                </h3>
                <button
                    onClick={onReset}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                >
                    <FiX size={12} />
                    {t('analysisDashboard.clearFilters')}
                </button>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Type Filter */}
                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {t('analysisDashboard.filterType')}
                    </label>
                    <select
                        value={filters.type || ''}
                        onChange={(e) => onFilterChange('type', e.target.value || null)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="">{t('analysisDashboard.allTypes')}</option>
                        <option value="single_image_copy_move">{t('analysisDashboard.types.singleCopyMove')}</option>
                        <option value="cross_image_copy_move">{t('analysisDashboard.types.crossCopyMove')}</option>
                        <option value="trufor">{t('analysisDashboard.types.trufor')}</option>
                        <option value="provenance">{t('analysisDashboard.types.provenance')}</option>
                        <option value="external">{t('analysisDashboard.types.external')}</option>
                    </select>
                </div>

                {/* Status Filter */}
                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {t('analysisDashboard.filterStatus')}
                    </label>
                    <select
                        value={filters.status || ''}
                        onChange={(e) => onFilterChange('status', e.target.value || null)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="">{t('analysisDashboard.allStatuses')}</option>
                        <option value="pending">{t('analysisDashboard.status.pending')}</option>
                        <option value="processing">{t('analysisDashboard.status.processing')}</option>
                        <option value="completed">{t('analysisDashboard.status.completed')}</option>
                        <option value="failed">{t('analysisDashboard.status.failed')}</option>
                    </select>
                </div>

                {/* Date From */}
                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {t('analysisDashboard.dateFrom')}
                    </label>
                    <input
                        type="date"
                        value={filters.date_from || ''}
                        onChange={(e) => onFilterChange('date_from', e.target.value || null)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>

                {/* Date To */}
                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {t('analysisDashboard.dateTo')}
                    </label>
                    <input
                        type="date"
                        value={filters.date_to || ''}
                        onChange={(e) => onFilterChange('date_to', e.target.value || null)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
            </div>
        </div >
    );
};

// Analysis Row - uses thumbnail URL for fast loading
const AnalysisRow = ({ analysis, onViewDetails, onReproduce, onViewResults, onFilterByImage, isFilterActive, t, locale, batchMode, isSelected, onToggleSelect }) => {
    // Use thumbnail URL directly - browser handles caching
    const imageUrl = analysis.source_image_id ? getThumbnailUrl(analysis.source_image_id) : null;
    const loadingImage = false; // No loading state needed with direct URLs
    const [imageError, setImageError] = useState(false);

    const createdDate = new Date(analysis.created_at);
    const typeConfig = ANALYSIS_TYPE_CONFIG[analysis.type] || ANALYSIS_TYPE_CONFIG.external;
    const TypeIcon = typeConfig.icon;

    return (
        <div className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all duration-200 overflow-hidden">
            <div className="flex items-stretch">
                {/* Checkbox for batch mode */}
                {batchMode && (
                    <div
                        className="flex items-center justify-center px-3 border-r border-gray-200 dark:border-gray-700 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); onToggleSelect(analysis._id); }}
                    >
                        <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 hover:border-indigo-500'
                                }`}
                        >
                            {isSelected && <FiCheck size={14} strokeWidth={3} />}
                        </div>
                    </div>
                )}
                {/* Thumbnail */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-gray-100 dark:bg-gray-900 overflow-hidden">
                    {loadingImage ? (
                        <div className="w-full h-full animate-pulse bg-gray-200 dark:bg-gray-700" />
                    ) : imageError ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-amber-500 bg-amber-50 dark:bg-amber-900/20 gap-1">
                            <FiAlertTriangle size={20} />
                            <span className="text-xs font-medium">{t('analysisDashboard.deleted')}</span>
                        </div>
                    ) : imageUrl ? (
                        <img
                            src={imageUrl}
                            alt="Source"
                            className="w-full h-full object-cover"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <TypeIcon size={24} />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <TypeBadge
                                    type={analysis.type}
                                    subtype={analysis.parameters?.analysis_subtype}
                                    t={t}
                                />
                                <StatusBadge status={analysis.status} t={t} />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <FiCalendar size={12} />
                                {createdDate.toLocaleString(locale)}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => onViewDetails(analysis)}
                                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                title={t('analysisDashboard.viewDetails')}
                            >
                                <FiEye size={16} />
                            </button>
                            {analysis.source_image_id && (
                                <button
                                    onClick={() => onFilterByImage && onFilterByImage(analysis.source_image_id)}
                                    className={`p-2 rounded-lg transition-colors ${isFilterActive
                                        ? 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/40 ring-1 ring-indigo-500/30'
                                        : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                        }`}
                                    title={isFilterActive ? t('analysisDashboard.clearFilter') : t('analysisDashboard.filterByImage')}
                                >
                                    <FiFilter size={16} className={isFilterActive ? "fill-current" : ""} />
                                </button>
                            )}
                            {analysis.status === 'completed' && analysis.parameters && (
                                <button
                                    onClick={() => onReproduce(analysis)}
                                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                    title={t('analysisDashboard.reproduce')}
                                >
                                    <FiRepeat size={16} />
                                </button>
                            )}
                            {analysis.status === 'completed' && (
                                <button
                                    onClick={() => onViewResults(analysis)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    title={t('analysisDashboard.viewResults') || 'View Results'}
                                >
                                    <FiPlay size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Parameters Preview */}
                    {analysis.parameters && Object.keys(analysis.parameters).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <ParametersDisplay
                                parameters={analysis.parameters}
                                sourceImageId={analysis.source_image_id}
                                targetImageId={analysis.target_image_id}
                                t={t}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Error message for failed analyses */}
            {analysis.status === 'failed' && analysis.error && (
                <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-900/30">
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <FiAlertCircle size={12} />
                        {analysis.error}
                    </p>
                </div>
            )}
        </div>
    );
};

// Analysis Card for Grid View - uses thumbnail URL for fast loading
const AnalysisCard = ({ analysis, onViewDetails, onReproduce, onViewResults, isActive, onFilterByImage, isFilterActive, t, locale, batchMode, isSelected, onToggleSelect }) => {
    // Use thumbnail URL directly - browser handles caching
    const imageUrl = analysis.source_image_id ? getThumbnailUrl(analysis.source_image_id) : null;
    const loadingImage = false; // No loading state needed with direct URLs
    const [imageError, setImageError] = useState(false);

    const createdDate = new Date(analysis.created_at);
    const typeConfig = ANALYSIS_TYPE_CONFIG[analysis.type] || ANALYSIS_TYPE_CONFIG.external;
    const TypeIcon = typeConfig.icon;

    return (
        <div
            className={`group relative bg-white dark:bg-gray-800 border rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col cursor-pointer ${isActive
                ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-indigo-500/50'
                }`}
            onClick={() => onViewDetails(analysis)}
        >
            {/* Thumbnail */}
            <div className="relative w-full pt-[65%] bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 rounded-t-xl overflow-hidden">
                {loadingImage ? (
                    <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700" />
                ) : imageError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-amber-500 bg-amber-50 dark:bg-amber-900/20 gap-1">
                        <FiAlertTriangle size={32} />
                        <span className="text-xs font-medium">{t('analysisDashboard.deleted')}</span>
                    </div>
                ) : imageUrl ? (
                    <img
                        src={imageUrl}
                        alt="Source"
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <TypeIcon size={40} />
                    </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                    <button
                        className="p-3 rounded-full bg-white/20 hover:bg-indigo-600 text-white backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-white/10"
                        onClick={(e) => { e.stopPropagation(); onViewDetails(analysis); }}
                        title={t('analysisDashboard.viewDetails')}
                    >
                        <FiEye className="text-xl" />
                    </button>
                    {analysis.source_image_id && (
                        <button
                            className={`p-3 rounded-full backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-white/10 ${isFilterActive
                                ? 'bg-indigo-600 text-white ring-2 ring-white/50'
                                : 'bg-white/20 hover:bg-indigo-600 text-white'
                                }`}
                            onClick={(e) => { e.stopPropagation(); onFilterByImage && onFilterByImage(analysis.source_image_id); }}
                            title={isFilterActive ? t('analysisDashboard.clearFilter') : t('analysisDashboard.filterByImage')}
                        >
                            <FiFilter className={`text-xl ${isFilterActive ? "fill-current" : ""}`} />
                        </button>
                    )}
                    {analysis.status === 'completed' && analysis.parameters && (
                        <button
                            className="p-3 rounded-full bg-white/20 hover:bg-green-600 text-white backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-white/10"
                            onClick={(e) => { e.stopPropagation(); onReproduce(analysis); }}
                            title={t('analysisDashboard.reproduce')}
                        >
                            <FiRepeat className="text-xl" />
                        </button>
                    )}
                    {analysis.status === 'completed' && (
                        <button
                            className="p-3 rounded-full bg-white/20 hover:bg-blue-600 text-white backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-white/10"
                            onClick={(e) => { e.stopPropagation(); onViewResults(analysis); }}
                            title={t('analysisDashboard.viewResults') || 'View Results'}
                        >
                            <FiPlay className="text-xl" />
                        </button>
                    )}
                </div>
            </div>

            {/* Status badge overlay */}
            <div className="absolute top-2 right-2">
                <StatusBadge status={analysis.status} t={t} />
            </div>

            {/* Checkbox for batch mode */}
            {batchMode && (
                <div
                    className="absolute top-2 left-2 z-10 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); onToggleSelect(analysis._id); }}
                >
                    <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white/80 dark:bg-black/50 border-white/50 dark:border-gray-400 hover:border-indigo-500'
                            }`}
                    >
                        {isSelected && <FiCheck size={14} strokeWidth={3} />}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <TypeBadge type={analysis.type} subtype={analysis.parameters?.analysis_subtype} t={t} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <FiCalendar size={12} />
                    {createdDate.toLocaleDateString(locale)}
                </p>
                {analysis.status === 'failed' && analysis.error && (
                    <p className="text-xs text-red-500 truncate mt-1" title={analysis.error}>
                        <FiAlertCircle className="inline mr-1" size={12} />
                        {analysis.error}
                    </p>
                )}
            </div>
        </div >
    );
};

// Compact List Row for Split View - uses thumbnail URL for fast loading
const AnalysisListRowCompact = ({ analysis, isActive, onClick, onFilterByImage, isFilterActive, t, locale, batchMode, isSelected, onToggleSelect }) => {
    const typeConfig = ANALYSIS_TYPE_CONFIG[analysis.type] || ANALYSIS_TYPE_CONFIG.external;
    const TypeIcon = typeConfig.icon;
    const createdDate = new Date(analysis.created_at);

    // Use thumbnail URL directly - browser handles caching
    const imageUrl = analysis.source_image_id ? getThumbnailUrl(analysis.source_image_id) : null;
    const loadingImage = false; // No loading state needed with direct URLs
    const [imageError, setImageError] = useState(false);

    return (
        <div
            className={`group flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isActive
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-500 pl-[calc(1rem-4px)]'
                : 'border-l-4 border-l-transparent'
                }`}
            onClick={() => onClick(analysis)}
        >
            {/* Checkbox for batch mode */}
            {batchMode && (
                <div
                    className="cursor-pointer flex-shrink-0 mt-1"
                    onClick={(e) => { e.stopPropagation(); onToggleSelect(analysis._id); }}
                >
                    <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 hover:border-indigo-500'
                            }`}
                    >
                        {isSelected && <FiCheck size={12} strokeWidth={3} />}
                    </div>
                </div>
            )}

            {/* Thumbnail replacing Type Icon box */}
            <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                {loadingImage ? (
                    <div className="w-full h-full animate-pulse bg-gray-200 dark:bg-gray-700" />
                ) : imageError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-amber-500 bg-amber-50 dark:bg-amber-900/20 gap-0.5">
                        <FiAlertTriangle size={16} />
                        <span className="text-[8px] font-medium">{t('analysisDashboard.deleted')}</span>
                    </div>
                ) : imageUrl ? (
                    <img
                        src={imageUrl}
                        alt="Source"
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <TypeIcon size={20} />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center h-12">
                <div className="flex items-center gap-2 mb-1">
                    <TypeBadge type={analysis.type} subtype={analysis.parameters?.analysis_subtype} t={t} compact />
                    <StatusBadge status={analysis.status} t={t} compact />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    {createdDate.toLocaleDateString(locale)}
                </span>
                {analysis.status === 'failed' && analysis.error && (
                    <p className="text-xs text-red-500 truncate mt-1" title={analysis.error}>
                        <FiAlertCircle className="inline mr-1" size={12} />
                        {analysis.error}
                    </p>
                )}
            </div>

            {/* Filter Action - Visible on hover or active */}
            {analysis.source_image_id && (isFilterActive || onFilterByImage) && (
                <button
                    className={`mt-1 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 ${isFilterActive
                        ? 'opacity-100 text-indigo-600 bg-indigo-100 dark:bg-indigo-900/40 ring-1 ring-indigo-500/30'
                        : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                        }`}
                    onClick={(e) => { e.stopPropagation(); onFilterByImage && onFilterByImage(analysis.source_image_id); }}
                    title={isFilterActive ? t('analysisDashboard.clearFilter') : t('analysisDashboard.filterByImage')}
                >
                    <FiFilter size={14} className={isFilterActive ? "fill-current" : ""} />
                </button>
            )}
        </div>
    );
};

// Details Panel for Split View
const AnalysisDetailsPanel = ({ analysis, onClose, onReproduce, onFilterByImage, onViewResults, t, locale }) => {
    const [activeTab, setActiveTab] = useState(analysis.type === 'cross_image_copy_move' ? 'comparison' : 'source');
    const [sourceUrl, setSourceUrl] = useState(null);
    const [targetUrl, setTargetUrl] = useState(null);
    const [resultUrl, setResultUrl] = useState(null);
    const [loadingSource, setLoadingSource] = useState(true);
    const [loadingTarget, setLoadingTarget] = useState(false);
    const [loadingResult, setLoadingResult] = useState(false);
    const [sourceError, setSourceError] = useState(false);
    const [targetError, setTargetError] = useState(false);
    const [imageUrls, setImageUrls] = useState({});

    // Load Provenance Graph Images - use thumbnail URLs
    useEffect(() => {
        if (analysis.type === 'provenance' && analysis.results?.graph?.nodes) {
            const newUrls = {};
            for (const node of analysis.results.graph.nodes) {
                if (!imageUrls[node.id]) {
                    newUrls[node.id] = getThumbnailUrl(node.id);
                }
            }
            if (Object.keys(newUrls).length > 0) {
                setImageUrls(prev => ({ ...prev, ...newUrls }));
            }
        }
    }, [analysis]);

    // Load Source Image - use thumbnail URL for detail panel
    useEffect(() => {
        if (analysis.source_image_id) {
            setSourceUrl(getThumbnailUrl(analysis.source_image_id));
        }
        setLoadingSource(false);
    }, [analysis.source_image_id]);

    // Load Target Image - use thumbnail URL for detail panel
    useEffect(() => {
        const targetId = analysis.parameters?.target_image_id || analysis.target_image_id;
        if (targetId) {
            setTargetUrl(getThumbnailUrl(targetId));
        }
        setLoadingTarget(false);
    }, [analysis.parameters?.target_image_id, analysis.target_image_id]);

    // Load Result Image
    // Load Result Image
    // Result Navigation State
    const [availableResults, setAvailableResults] = useState([]);
    const [currentResultIndex, setCurrentResultIndex] = useState(0);

    // Initialize available results
    useEffect(() => {
        if (!analysis.results) return;

        const results = [];
        // Define priority/order of results
        const resultKeys = [
            { key: 'pred_map', label: 'analysisDashboard.resultTypes.pred_map' },
            { key: 'conf_map', label: 'analysisDashboard.resultTypes.conf_map' },
            { key: 'noiseprint', label: 'analysisDashboard.resultTypes.noiseprint' },
            { key: 'matches_image', label: 'analysisDashboard.resultTypes.matches' },
            { key: 'clusters_image', label: 'analysisDashboard.resultTypes.clusters' },
            { key: 'result_image', label: 'analysisDashboard.resultTypes.result_image' }
        ];

        resultKeys.forEach(({ key, label }) => {
            if (analysis.results[key]) {
                let apiType = key;
                // Special handling: remove _image suffix for matches and clusters only
                if (key === 'matches_image' || key === 'clusters_image') {
                    apiType = key.replace('_image', '');
                }
                // result_image should REMAIN result_image

                results.push({ key, label, apiType });
            }
        });

        // Special handling for copy-move cross: prioritize clusters
        if (analysis.type === 'cross_image_copy_move') {
            // If we have clusters, make it first or default? logic is fine usually.
        }

        setAvailableResults(results);
        setCurrentResultIndex(0);
        setResultUrl(null); // Reset URL to trigger load
    }, [analysis]);

    // Cleanup result URL when switching results
    useEffect(() => {
        setResultUrl(null);
    }, [currentResultIndex]);

    const handleNextResult = (e) => {
        e.stopPropagation();
        if (availableResults.length <= 1) return;
        setCurrentResultIndex((prev) => (prev + 1) % availableResults.length);
    };

    const handlePrevResult = (e) => {
        e.stopPropagation();
        if (availableResults.length <= 1) return;
        setCurrentResultIndex((prev) => (prev - 1 + availableResults.length) % availableResults.length);
    };

    // Load Result Image
    useEffect(() => {
        if (activeTab === 'result' && analysis.status === 'completed' && !resultUrl && availableResults.length > 0) {

            // Skip provenance if graph is available
            if ((analysis.type === 'provenance' && analysis.results?.graph)) {
                return;
            }

            let isMounted = true;
            setLoadingResult(true);

            const loadResult = async () => {
                try {
                    const currentResult = availableResults[currentResultIndex];
                    if (!currentResult) return;

                    // Mapping for API endpoint types if needed specifically
                    // Using currentResult.apiType which was pre-calculated
                    // Copy-move keys: matches_image -> matches, clusters_image -> clusters
                    // Standard keys: pred_map -> pred_map

                    // Actually the download endpoint might map matches_image to matches/download?
                    // Let's use the logic from AnalysisDetailModal which had a mapping
                    // Or just strict check.
                    // api.download(`/analyses/${id}/results/${type}/download`)

                    let downloadType = currentResult.apiType;

                    const blob = await api.download(`/analyses/${analysis._id}/results/${downloadType}/download`);
                    if (isMounted) setResultUrl(URL.createObjectURL(blob));
                } catch (err) {
                    console.error("Failed to load result", err);
                } finally {
                    if (isMounted) setLoadingResult(false);
                }
            };
            loadResult();
            return () => { isMounted = false; };
        }
    }, [activeTab, analysis, resultUrl, availableResults, currentResultIndex]);

    // Cleanup URLs
    useEffect(() => {
        return () => {
            if (sourceUrl) URL.revokeObjectURL(sourceUrl);
            if (targetUrl) URL.revokeObjectURL(targetUrl);
            if (resultUrl) URL.revokeObjectURL(resultUrl);
        };
    }, [sourceUrl, targetUrl, resultUrl]);

    return (
        <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-lg flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center gap-3">
                    <TypeBadge type={analysis.type} subtype={analysis.parameters?.analysis_subtype} t={t} />
                    <StatusBadge status={analysis.status} t={t} />
                </div>
                <div className="flex items-center gap-2">
                    {analysis.source_image_id && (
                        <button
                            onClick={() => onFilterByImage && onFilterByImage(analysis.source_image_id)}
                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title={t('analysisDashboard.filterByImage')}
                        >
                            <FiFilter size={16} />
                        </button>
                    )}
                    {analysis.status === 'completed' && analysis.parameters && (
                        <button
                            onClick={() => onReproduce(analysis)}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title={t('analysisDashboard.reproduce')}
                        >
                            <FiRepeat size={16} />
                        </button>
                    )}
                    {analysis.status === 'completed' && (
                        <button
                            onClick={() => onViewResults(analysis)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title={t('analysisDashboard.viewResults') || 'View Full Results'}
                        >
                            <FiPlay size={16} />
                        </button>
                    )}
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500">
                        <FiX size={20} />
                    </button>
                </div>
            </div>

            {/* Visual Stage */}
            <div className="flex-1 bg-gray-100 dark:bg-gray-900 relative min-h-[300px] flex items-center justify-center overflow-hidden">
                {activeTab === 'source' ? (
                    loadingSource ? (
                        <div className="animate-pulse w-full h-full bg-gray-200 dark:bg-gray-800" />
                    ) : sourceError ? (
                        <div className="text-amber-500 flex flex-col items-center gap-3 p-8">
                            <FiAlertTriangle size={48} />
                            <span className="text-sm font-medium">{t('analysisDashboard.imageDeleted')}</span>
                            <span className="text-xs text-gray-400">{t('analysisDashboard.resultsStillAvailable')}</span>
                        </div>
                    ) : sourceUrl ? (
                        <img
                            src={sourceUrl}
                            alt="Source"
                            className="w-full h-full object-contain p-4"
                            onError={() => setSourceError(true)}
                        />
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                            <span className="text-sm">No source image</span>
                        </div>
                    )
                ) : activeTab === 'target' ? (
                    loadingTarget ? (
                        <div className="animate-pulse w-full h-full bg-gray-200 dark:bg-gray-800" />
                    ) : targetError ? (
                        <div className="text-amber-500 flex flex-col items-center gap-3 p-8">
                            <FiAlertTriangle size={48} />
                            <span className="text-sm font-medium">{t('analysisDashboard.imageDeleted')}</span>
                            <span className="text-xs text-gray-400">{t('analysisDashboard.resultsStillAvailable')}</span>
                        </div>
                    ) : targetUrl ? (
                        <img
                            src={targetUrl}
                            alt="Target"
                            className="w-full h-full object-contain p-4"
                            onError={() => setTargetError(true)}
                        />
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                            <span className="text-sm">No target image</span>
                        </div>
                    )
                ) : activeTab === 'comparison' ? (
                    <div className="w-full h-full flex flex-row items-center justify-center p-4 gap-4">
                        {/* Source Side */}
                        <div className="flex-1 h-full flex flex-col items-center overflow-hidden">
                            <span className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <FiImage size={14} /> {t('analysisDashboard.tabSource')}
                            </span>
                            {loadingSource ? (
                                <div className="animate-pulse w-full h-full bg-gray-200 dark:bg-gray-800 rounded-lg" />
                            ) : sourceUrl ? (
                                <img src={sourceUrl} alt="Source" className="w-full h-full object-contain rounded-lg border border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-white/5" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-sm">N/A</span>
                                </div>
                            )}
                        </div>

                        {/* Separator */}
                        <div className="h-full w-px bg-gray-200 dark:bg-gray-700" />

                        {/* Target Side */}
                        <div className="flex-1 h-full flex flex-col items-center overflow-hidden">
                            <span className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <FiTarget size={14} /> {t('analysisDashboard.tabTarget')}
                            </span>
                            {loadingTarget ? (
                                <div className="animate-pulse w-full h-full bg-gray-200 dark:bg-gray-800 rounded-lg" />
                            ) : targetUrl ? (
                                <img src={targetUrl} alt="Target" className="w-full h-full object-contain rounded-lg border border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-white/5" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-sm">N/A</span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    loadingResult ? (
                        <div className="animate-pulse w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                        </div>
                    ) : analysis.type === 'provenance' && analysis.results?.graph ? (
                        <div className="w-full h-full p-2 overflow-hidden">
                            <ProvenanceGraph
                                nodes={analysis.results.graph.nodes}
                                edges={analysis.results.graph.edges}
                                spanningTreeEdges={analysis.results.graph.spanning_tree_edges}
                                queryImageId={analysis.source_image_id}
                                getImageUrl={(id) => imageUrls[id]}
                                width={800}
                                height={500}
                            />
                        </div>
                    ) : resultUrl ? (
                        <div className="relative w-full h-full group">
                            <img src={resultUrl} alt="Result" className="w-full h-full object-contain p-4" />

                            {/* Result Type Badge */}
                            {availableResults.length > 0 && (
                                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur-sm shadow-sm border border-white/10 z-10">
                                    {availableResults[currentResultIndex] ? t(availableResults[currentResultIndex].label) : ''}
                                </div>
                            )}

                            {/* Navigation Arrows */}
                            {availableResults.length > 1 && (
                                <>
                                    <button
                                        onClick={handlePrevResult}
                                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 dark:bg-gray-800/80 p-3 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title={t('common.previous')}
                                    >
                                        <FiChevronLeft size={24} className="text-gray-700 dark:text-gray-300" />
                                    </button>
                                    <button
                                        onClick={handleNextResult}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 dark:bg-gray-800/80 p-3 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title={t('common.next')}
                                    >
                                        <FiChevronRight size={24} className="text-gray-700 dark:text-gray-300" />
                                    </button>
                                    {/* Dots Indicators */}
                                    <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex gap-2">
                                        {availableResults.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`w-2 h-2 rounded-full transition-colors ${idx === currentResultIndex ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center gap-2">
                            {/* Fallback for no preview */}
                            <span className="text-sm">Preview not available</span>
                            <button
                                onClick={() => onViewResults(analysis)}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                            >
                                {t('analysisDashboard.viewResults') || 'View Full Results'}
                            </button>
                        </div>
                    )
                )}

                {/* Tabs */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 dark:bg-gray-800/90 p-1 rounded-lg flex gap-1 shadow-lg backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('source')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'source'
                            ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        {t('analysisDashboard.tabSource')}
                    </button>
                    {analysis.parameters?.target_image_id && (
                        <button
                            onClick={() => setActiveTab('target')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'target'
                                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {t('analysisDashboard.tabTarget')}
                        </button>
                    )}
                    {/* Add Comparison Tab for Cross-Image Copy-Move */}
                    {analysis.type === 'cross_image_copy_move' && (
                        <button
                            onClick={() => setActiveTab('comparison')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'comparison'
                                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {t('analysisDashboard.tabComparison')}
                        </button>
                    )}
                    {analysis.status === 'completed' && (
                        <button
                            onClick={() => setActiveTab('result')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'result'
                                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {t('analysisDashboard.tabResult')}
                        </button>
                    )}
                </div>
            </div>

            {/* Details Section */}
            <div className="h-1/3 border-t border-gray-200 dark:border-gray-700 overflow-y-auto p-6 bg-white dark:bg-gray-800">
                <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <FiCalendar size={14} />
                        {t('analysisDashboard.generalInfo')}
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('analysisDashboard.created')}</span>
                            <p className="text-gray-900 dark:text-white">{new Date(analysis.created_at).toLocaleString(locale)}</p>
                        </div>
                        <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('analysisDashboard.updated')}</span>
                            <p className="text-gray-900 dark:text-white">{new Date(analysis.updated_at).toLocaleString(locale)}</p>
                        </div>
                    </div>
                </div>

                {/* Parameters */}
                {analysis.parameters && Object.keys(analysis.parameters).length > 0 && (
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <FiSliders size={14} />
                            {t('analysisDashboard.parameters')}
                        </h4>
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 space-y-2">
                            <ParametersDisplay
                                parameters={analysis.parameters}
                                sourceImageId={analysis.source_image_id}
                                targetImageId={analysis.parameters?.target_image_id || analysis.target_image_id}
                                t={t}
                                defaultExpanded={true}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Pagination Component
const Pagination = ({ currentPage, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange, t }) => {
    const pages = useMemo(() => {
        const range = [];
        const delta = 2;
        const left = Math.max(1, currentPage - delta);
        const right = Math.min(totalPages, currentPage + delta);

        for (let i = left; i <= right; i++) {
            range.push(i);
        }

        if (left > 1) {
            range.unshift(1);
            if (left > 2) range.splice(1, 0, '...');
        }
        if (right < totalPages) {
            if (right < totalPages - 1) range.push('...');
            range.push(totalPages);
        }

        return range;
    }, [currentPage, totalPages]);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            {/* Page size selector */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>{t('analysisDashboard.showing')}</span>
                <select
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                    {PAGE_SIZE_OPTIONS.map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
                <span>{t('analysisDashboard.of')} {totalItems} {t('analysisDashboard.analyses')}</span>
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <FiChevronLeft size={16} />
                </button>

                {pages.map((page, index) => (
                    page === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {page}
                        </button>
                    )
                ))}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <FiChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

// Analysis Detail Modal
const AnalysisDetailModal = ({ analysis, onClose, onDownloadResult, t, locale }) => {
    const [resultImages, setResultImages] = useState({});
    const [loadingResults, setLoadingResults] = useState(true);

    useEffect(() => {
        if (!analysis) return;

        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [analysis, onClose]);

    useEffect(() => {
        if (!analysis?.results) {
            setLoadingResults(false);
            return;
        }

        const loadResults = async () => {
            const images = {};
            // Map of result keys to API endpoint types
            // Backend expects: matches, clusters, pred_map, conf_map, noiseprint, result_image
            const resultTypeMapping = {
                'pred_map': 'pred_map',
                'conf_map': 'conf_map',
                'noiseprint': 'noiseprint',
                'matches_image': 'matches',      // Copy-move: stored as matches_image, API expects 'matches'
                'clusters_image': 'clusters',    // Copy-move: stored as clusters_image, API expects 'clusters'
                'result_image': 'result_image'   // External: stored and API both use 'result_image'
            };

            for (const [resultKey, apiType] of Object.entries(resultTypeMapping)) {
                if (analysis.results[resultKey]) {
                    try {
                        const blob = await api.download(`/analyses/${analysis._id}/results/${apiType}/download`);
                        images[resultKey] = URL.createObjectURL(blob);
                    } catch (err) {
                        console.error(`Failed to load ${resultKey}:`, err);
                    }
                }
            }

            setResultImages(images);
            setLoadingResults(false);
        };

        loadResults();

        return () => {
            Object.values(resultImages).forEach(url => URL.revokeObjectURL(url));
        };
    }, [analysis?._id]);

    if (!analysis) return null;

    const createdDate = new Date(analysis.created_at);
    const updatedDate = new Date(analysis.updated_at);

    return (
        <div
            className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${COLOR_CLASSES[ANALYSIS_TYPE_CONFIG[analysis.type]?.color || 'gray']}`}>
                            {React.createElement(ANALYSIS_TYPE_CONFIG[analysis.type]?.icon || FiActivity, { size: 20 })}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {t('analysisDashboard.analysisDetails')}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                ID: {analysis._id}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Info Section */}
                        <div className="space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                    {t('analysisDashboard.generalInfo')}
                                </h3>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('analysisDashboard.filterType')}</span>
                                        <div className="mt-1">
                                            <TypeBadge
                                                type={analysis.type}
                                                subtype={analysis.parameters?.analysis_subtype}
                                                t={t}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('analysisDashboard.filterStatus')}</span>
                                        <div className="mt-1"><StatusBadge status={analysis.status} t={t} /></div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('analysisDashboard.created')}</span>
                                        <p className="text-sm text-gray-900 dark:text-white">{createdDate.toLocaleString(locale)}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('analysisDashboard.updated')}</span>
                                        <p className="text-sm text-gray-900 dark:text-white">{updatedDate.toLocaleString(locale)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Parameters */}
                            {analysis.parameters && Object.keys(analysis.parameters).length > 0 && (
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                        <FiSliders size={14} />
                                        {t('analysisDashboard.parameters')}
                                    </h3>
                                    <div className="space-y-2">
                                        <ParametersDisplay
                                            parameters={analysis.parameters}
                                            sourceImageId={analysis.source_image_id}
                                            targetImageId={analysis.target_image_id}
                                            t={t}
                                            defaultExpanded={true}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {analysis.error && (
                                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-900/30">
                                    <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                                        <FiAlertCircle size={14} />
                                        {t('analysisDashboard.error')}
                                    </h3>
                                    <p className="text-sm text-red-600 dark:text-red-400">{analysis.error}</p>
                                </div>
                            )}
                        </div>

                        {/* Results Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <FiImage size={14} />
                                {t('analysisDashboard.results')}
                            </h3>

                            {loadingResults ? (
                                <div className="flex items-center justify-center h-48 bg-gray-100 dark:bg-gray-800 rounded-xl">
                                    <FiLoader className="animate-spin text-indigo-600" size={24} />
                                </div>
                            ) : Object.keys(resultImages).length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(resultImages).map(([type, url]) => {
                                        // Map result key to API type for download
                                        const apiTypeMap = {
                                            'matches_image': 'matches',
                                            'clusters_image': 'clusters',
                                            'result_image': 'result_image'
                                        };
                                        const apiType = apiTypeMap[type] || type;

                                        return (
                                            <div key={type} className="relative group">
                                                <img
                                                    src={url}
                                                    alt={type}
                                                    className="w-full aspect-square object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                                />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                    <button
                                                        onClick={() => onDownloadResult(analysis._id, apiType)}
                                                        className="p-2 bg-white rounded-lg text-gray-900 hover:bg-gray-100 transition-colors"
                                                    >
                                                        <FiDownload size={16} />
                                                    </button>
                                                </div>
                                                <span className="absolute bottom-2 left-2 text-xs bg-black/70 text-white px-2 py-0.5 rounded">
                                                    {type.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-48 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-400">
                                    <div className="text-center">
                                        <FiImage size={32} className="mx-auto mb-2" />
                                        <p className="text-sm">{t('analysisDashboard.noResults')}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---
const AnalysisDashboardPage = () => {
    const { t, locale } = useLanguage();

    // State
    const [analyses, setAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Statistics state
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        processing: 0,
        pending: 0,
        failed: 0
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Filter state
    const [filters, setFilters] = useState({
        type: null,
        status: null,
        date_from: null,
        date_to: null
    });
    const [showFilters, setShowFilters] = useState(false);

    // View mode state (like ViewPDFPage)
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
    const [isSplitView, setIsSplitView] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [selectedAnalysis, setSelectedAnalysis] = useState(null);

    // Batch selection state
    const [batchMode, setBatchMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Fetch analyses
    const fetchAnalyses = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            // Build query params
            const params = {
                page: currentPage,
                per_page: pageSize
            };

            if (filters.type) params.type = filters.type;
            if (filters.status) params.status = filters.status;
            if (filters.source_image_id) params.source_image_id = filters.source_image_id;
            if (filters.date_from) params.date_from = new Date(filters.date_from).toISOString();
            if (filters.date_to) params.date_to = new Date(filters.date_to).toISOString();

            const response = await api.get('/analyses', params);

            if (response.success) {
                setAnalyses(response.data);
                setTotalItems(response.pagination.total_items);
                setTotalPages(response.pagination.total_pages);
            } else {
                throw new Error(response.message || 'Failed to fetch analyses');
            }
        } catch (err) {
            console.error('Failed to fetch analyses:', err);
            setError(err.message);
            showToast(t('analysisDashboard.fetchError'), 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentPage, pageSize, filters, t]);

    // Initial fetch and refetch on dependency changes
    useEffect(() => {
        fetchAnalyses();
    }, [fetchAnalyses]);

    // Fetch global statistics from API (not just current page)
    const fetchStats = useCallback(async () => {
        try {
            const response = await api.get('/analyses/stats');
            if (response.success) {
                setStats(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    }, []);

    // Fetch stats on mount and when analyses change
    useEffect(() => {
        fetchStats();
    }, [fetchStats, analyses]);

    // Auto-refresh for processing analyses
    useEffect(() => {
        const hasProcessing = analyses.some(a => a.status === 'processing' || a.status === 'pending');
        if (!hasProcessing) return;

        const intervalId = setInterval(() => {
            fetchAnalyses(true); // Silent refresh
        }, AUTO_REFRESH_INTERVAL);

        return () => clearInterval(intervalId);
    }, [analyses, fetchAnalyses]);

    // Clear selection when view mode or split view changes
    useEffect(() => {
        setSelectedAnalysis(null);
    }, [viewMode, isSplitView]);

    // Handlers
    const handleFilterChange = useCallback((key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1); // Reset to first page on filter change
    }, []);

    const handleResetFilters = useCallback(() => {
        setFilters({
            type: null,
            status: null,
            source_image_id: null,
            date_from: null,
            date_to: null
        });
        setCurrentPage(1);
    }, []);

    const handleFilterByImage = useCallback((imageId) => {
        if (filters.source_image_id === imageId) {
            handleFilterChange('source_image_id', null);
        } else {
            handleFilterChange('source_image_id', imageId);
            showToast(t('analysisDashboard.filteringByImage') || 'Filtering by this source image', 'info');
        }
    }, [handleFilterChange, t, filters.source_image_id]);

    const handlePageChange = useCallback((page) => {
        setCurrentPage(page);
    }, []);

    const handlePageSizeChange = useCallback((size) => {
        setPageSize(size);
        setCurrentPage(1);
    }, []);

    const handleViewDetails = useCallback((analysis) => {
        setSelectedAnalysis(analysis);
    }, []);

    const handleCloseDetails = useCallback(() => {
        setSelectedAnalysis(null);
    }, []);

    const handleReproduce = useCallback((analysis) => {
        // Map analysis types to page keys (matches PAGES in AppLayout)
        const typeToPageKey = {
            'trufor': 'manipulationDetection',
            'single_image_copy_move': 'copyMove',
            'cross_image_copy_move': 'copyMove',
            'provenance': 'provenance',
            'cbir_search': 'cbirSearch',
            'external': 'imageAnalysis'
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
            // Navigate by refreshing - AppLayout will read from sessionStorage
            window.location.reload();
            showToast(t('analysisDashboard.navigatingToTool'), 'success');
        } else {
            // Fallback: copy parameters to clipboard
            const params = JSON.stringify(analysis.parameters, null, 2);
            navigator.clipboard.writeText(params);
            showToast(t('analysisDashboard.parametersCopied'), 'success');
        }
    }, [t]);

    // View stored results without re-running the analysis
    const handleViewResults = useCallback((analysis) => {
        // Map analysis types to page keys (matches PAGES in AppLayout)
        const typeToPageKey = {
            'trufor': 'manipulationDetection',
            'single_image_copy_move': 'copyMove',
            'cross_image_copy_move': 'copyMove',
            'provenance': 'provenance',
            'cbir_search': 'cbirSearch',
            'external': 'imageAnalysis'
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
            // Navigate by refreshing - AppLayout will read from sessionStorage
            window.location.reload();
            showToast(t('analysisDashboard.loadingResults') || 'Loading results...', 'success');
        } else {
            showToast(t('analysisDashboard.noResultsAvailable') || 'No results available for this analysis', 'warning');
        }
    }, [t]);

    const handleDownloadResult = useCallback(async (analysisId, resultType) => {
        try {
            const blob = await api.download(`/analyses/${analysisId}/results/${resultType}/download`);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${resultType}_${analysisId}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(t('analysisDashboard.downloadSuccess'), 'success');
        } catch (err) {
            console.error('Download failed:', err);
            showToast(t('analysisDashboard.downloadError'), 'error');
        }
    }, [t]);

    // Export handlers
    const handleExport = useCallback((format) => {
        const dataToExport = batchMode && selectedIds.size > 0
            ? analyses.filter(a => selectedIds.has(a._id))
            : analyses;

        if (dataToExport.length === 0) {
            showToast(t('analysisDashboard.noDataToExport'), 'error');
            return;
        }

        const exportData = dataToExport.map(a => ({
            id: a._id,
            type: a.type,
            status: a.status,
            created_at: a.created_at,
            updated_at: a.updated_at,
            parameters: a.parameters,
            error: a.error || null
        }));

        let content, filename, mimeType;
        if (format === 'json') {
            content = JSON.stringify(exportData, null, 2);
            filename = `analyses_export_${new Date().toISOString().split('T')[0]}.json`;
            mimeType = 'application/json';
        } else {
            // CSV format
            const headers = ['id', 'type', 'status', 'created_at', 'updated_at', 'parameters', 'error'];
            const csvRows = [headers.join(',')];
            exportData.forEach(a => {
                csvRows.push([
                    a.id,
                    a.type,
                    a.status,
                    a.created_at,
                    a.updated_at,
                    `"${JSON.stringify(a.parameters || {}).replace(/"/g, '""')}"`,
                    a.error || ''
                ].join(','));
            });
            content = csvRows.join('\n');
            filename = `analyses_export_${new Date().toISOString().split('T')[0]}.csv`;
            mimeType = 'text/csv';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShowExportMenu(false);
        showToast(t('analysisDashboard.exportSuccess'), 'success');
    }, [analyses, batchMode, selectedIds, t]);

    // Batch selection handlers
    const handleToggleSelect = useCallback((id) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        if (selectedIds.size === analyses.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(analyses.map(a => a._id)));
        }
    }, [analyses, selectedIds.size]);

    const handleBatchDelete = useCallback(async () => {
        if (selectedIds.size === 0) return;

        const confirmed = await showAlert(
            t('analysisDashboard.confirmBatchDelete'),
            `${t('analysisDashboard.deleteConfirmMessage')} ${selectedIds.size} ${t('analysisDashboard.analyses')}?`,
            'warning'
        );

        if (!confirmed) return;

        try {
            // Delete each selected analysis
            const deletePromises = Array.from(selectedIds).map(id =>
                api.delete(`/analyses/${id}`)
            );
            await Promise.all(deletePromises);

            showToast(`${selectedIds.size} ${t('analysisDashboard.deletedSuccessfully')}`, 'success');
            setSelectedIds(new Set());
            setBatchMode(false);
            fetchAnalyses();
        } catch (err) {
            console.error('Batch delete failed:', err);
            showToast(t('analysisDashboard.deleteError'), 'error');
        }
    }, [selectedIds, t, fetchAnalyses]);

    // Check if any filters are active
    const hasActiveFilters = Object.values(filters).some(v => v !== null);

    return (
        <div className="w-full h-full flex flex-col p-6 md:p-8 overflow-hidden relative text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {/* Header & Toolbar */}
            <header className="flex flex-wrap justify-between items-center mb-6 gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3 mb-1">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                            <FiActivity className="text-indigo-600 dark:text-indigo-400" size={24} />
                        </div>
                        {t('analysisDashboard.title')}
                    </h1>
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {loading ? t('common.loading') : `${totalItems} ${t('analysisDashboard.analyses')}`}
                    </span>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3 flex-1 justify-end items-center">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[120px] max-w-xs group">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg pl-10 pr-4 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-400 text-sm"
                            placeholder={t('analysisDashboard.searchPlaceholder') || 'Search...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filter Button */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showFilters || hasActiveFilters
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                            : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        <FiFilter size={16} />
                        <span className="hidden sm:inline">{t('common.filters')}</span>
                        {hasActiveFilters && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                        )}
                    </button>

                    {/* View Mode Toggle */}
                    <div className="flex bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-1">
                        <button
                            className={`p-2 rounded transition-colors ${viewMode === 'list' && !isSplitView ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                            onClick={() => { setViewMode('list'); setIsSplitView(false); }}
                            title={t('analysisDashboard.listView') || 'List View'}
                        >
                            <FiList size={16} />
                        </button>
                        <button
                            className={`p-2 rounded transition-colors ${viewMode === 'grid' && !isSplitView ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                            onClick={() => { setViewMode('grid'); setIsSplitView(false); }}
                            title={t('analysisDashboard.gridView') || 'Grid View'}
                        >
                            <FiGrid size={16} />
                        </button>
                        <div className="w-px bg-gray-200 dark:bg-gray-700 mx-1 my-1"></div>
                        <button
                            className={`p-2 rounded transition-colors ${isSplitView ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                            onClick={() => setIsSplitView(!isSplitView)}
                            title={t('analysisDashboard.splitView') || 'Split View'}
                        >
                            <FiColumns size={16} />
                        </button>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={() => fetchAnalyses(true)}
                        disabled={refreshing}
                        className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-500 hover:text-indigo-600 hover:border-indigo-500 rounded-lg transition-all disabled:opacity-50"
                        title={t('common.refresh')}
                    >
                        <FiRefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>

                    {/* Export Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="flex items-center gap-1 p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-500 hover:text-indigo-600 hover:border-indigo-500 rounded-lg transition-all"
                            title={t('analysisDashboard.export')}
                        >
                            <FiDownload size={16} />
                            <FiChevronDown size={12} />
                        </button>
                        {showExportMenu && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                                <button
                                    onClick={() => handleExport('csv')}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                                >
                                    <FiFileText size={14} />
                                    {t('analysisDashboard.exportCSV')}
                                </button>
                                <button
                                    onClick={() => handleExport('json')}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
                                >
                                    <FiFileText size={14} />
                                    {t('analysisDashboard.exportJSON')}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Batch Mode Toggle */}
                    <button
                        onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${batchMode
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                            : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        title={t('analysisDashboard.selectionMode')}
                    >
                        <FiLayers size={16} />
                        <span className="hidden sm:inline">{t('analysisDashboard.selection')}</span>
                    </button>
                </div>
            </header>

            {/* Batch Actions Bar */}
            {batchMode && (
                <div className="flex items-center gap-4 mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    <button
                        onClick={handleSelectAll}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        <FiCheck size={14} />
                        {selectedIds.size === analyses.length ? t('analysisDashboard.deselectAll') : t('analysisDashboard.selectAll')}
                    </button>
                    <span className="text-sm text-indigo-700 dark:text-indigo-300">
                        {selectedIds.size} {t('analysisDashboard.selected')}
                    </span>
                    {selectedIds.size > 0 && (
                        <>
                            <button
                                onClick={() => handleExport('csv')}
                                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                            >
                                <FiDownload size={14} />
                                {t('analysisDashboard.exportSelected')}
                            </button>
                            <button
                                onClick={handleBatchDelete}
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                            >
                                <FiTrash2 size={14} />
                                {t('analysisDashboard.deleteSelected')}
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Filter Panel */}
            {showFilters && (
                <FilterPanel
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onReset={handleResetFilters}
                    t={t}
                />
            )}

            {/* Statistics Summary Bar - Clickable Filters */}
            {!loading && (
                <div className="flex flex-wrap gap-3 mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    {/* Clear Image Filter Badge */}
                    {filters.source_image_id && (
                        <button
                            onClick={() => handleFilterChange('source_image_id', null)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors group"
                            title={t('analysisDashboard.clearImageFilter')}
                        >
                            <span className="text-sm font-medium">
                                {t('analysisDashboard.filteringByImage')}
                            </span>
                            <FiX size={14} className="group-hover:scale-110 transition-transform" />
                        </button>
                    )}

                    {/* All / Total */}
                    <button
                        onClick={() => handleFilterChange('status', null)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${!filters.status
                            ? 'bg-gray-200 dark:bg-gray-700 ring-2 ring-gray-400 dark:ring-gray-500'
                            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                    >
                        <FiDatabase className="text-gray-600 dark:text-gray-400" size={14} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
                            {stats.total || 0} {t('analysisDashboard.total') || 'Total'}
                        </span>
                    </button>

                    {/* Completed */}
                    <button
                        onClick={() => handleFilterChange('status', filters.status === 'completed' ? null : 'completed')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filters.status === 'completed'
                            ? 'bg-green-200 dark:bg-green-800/50 ring-2 ring-green-500'
                            : 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-800/50'
                            }`}
                    >
                        <FiCheck className="text-green-600 dark:text-green-400" size={14} />
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                            {stats.completed || 0} {t('analysisDashboard.status.completed')}
                        </span>
                    </button>

                    {/* Processing */}
                    <button
                        onClick={() => handleFilterChange('status', filters.status === 'processing' ? null : 'processing')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filters.status === 'processing'
                            ? 'bg-blue-200 dark:bg-blue-800/50 ring-2 ring-blue-500'
                            : 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/50'
                            }`}
                    >
                        <FiLoader className={`text-blue-600 dark:text-blue-400 ${stats.processing > 0 ? 'animate-spin' : ''}`} size={14} />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                            {stats.processing || 0} {t('analysisDashboard.status.processing')}
                        </span>
                    </button>

                    {/* Pending */}
                    <button
                        onClick={() => handleFilterChange('status', filters.status === 'pending' ? null : 'pending')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filters.status === 'pending'
                            ? 'bg-yellow-200 dark:bg-yellow-800/50 ring-2 ring-yellow-500'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-800/50'
                            }`}
                    >
                        <FiClock className="text-yellow-600 dark:text-yellow-400" size={14} />
                        <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                            {stats.pending || 0} {t('analysisDashboard.status.pending')}
                        </span>
                    </button>

                    {/* Failed */}
                    <button
                        onClick={() => handleFilterChange('status', filters.status === 'failed' ? null : 'failed')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filters.status === 'failed'
                            ? 'bg-red-200 dark:bg-red-800/50 ring-2 ring-red-500'
                            : 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800/50'
                            }`}
                    >
                        <FiAlertCircle className="text-red-600 dark:text-red-400" size={14} />
                        <span className="text-sm font-medium text-red-700 dark:text-red-400">
                            {stats.failed || 0} {t('analysisDashboard.status.failed')}
                        </span>
                    </button>


                </div>
            )}

            {/* Main Content Area */}
            <div className={`flex-1 overflow-hidden relative flex gap-6 min-h-0 ${showFilters ? 'mt-4' : ''}`}>

                {/* Document List/Grid Side */}
                <div className={`transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden ${isSplitView ? 'w-[400px] flex-shrink-0 border-r border-gray-200 dark:border-gray-800 pr-4' : 'w-full'
                    }`}>
                    {loading ? (
                        <div className={viewMode === 'grid' && !isSplitView ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-3'}>
                            {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-8 text-center">
                            <FiAlertCircle className="mx-auto text-red-500 mb-3" size={32} />
                            <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                            <button
                                onClick={() => fetchAnalyses()}
                                className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                            >
                                {t('common.tryAgain')}
                            </button>
                        </div>
                    ) : analyses.length === 0 ? (
                        <EmptyState
                            title={t('analysisDashboard.noAnalyses')}
                            description={hasActiveFilters || searchQuery ? t('analysisDashboard.noMatchingAnalyses') : t('analysisDashboard.noAnalysesDescription')}
                            icon="search"
                            actionLabel={(hasActiveFilters || searchQuery) ? t('analysisDashboard.clearFilters') : null}
                            onAction={(hasActiveFilters || searchQuery) ? () => { handleResetFilters(); setSearchQuery(''); } : null}
                            showAction={hasActiveFilters || !!searchQuery}
                        />
                    ) : (
                        <div className={
                            viewMode === 'grid' && !isSplitView
                                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6'
                                : 'pb-6'
                        }>
                            {/* Grid View */}
                            {viewMode === 'grid' && !isSplitView && (
                                analyses.map(analysis => (
                                    <AnalysisCard
                                        key={analysis._id}
                                        analysis={analysis}
                                        onViewDetails={handleViewDetails}
                                        onReproduce={handleReproduce}
                                        onFilterByImage={handleFilterByImage}
                                        isFilterActive={filters.source_image_id === analysis.source_image_id}
                                        isActive={selectedAnalysis?._id === analysis._id}
                                        t={t}
                                        locale={locale}
                                        batchMode={batchMode}
                                        isSelected={selectedIds.has(analysis._id)}
                                        onToggleSelect={handleToggleSelect}
                                    />
                                ))
                            )}

                            {/* List View (full) */}
                            {viewMode === 'list' && !isSplitView && (
                                <div className="space-y-3">
                                    {analyses.map(analysis => (
                                        <AnalysisRow
                                            key={analysis._id}
                                            analysis={analysis}
                                            onViewDetails={handleViewDetails}
                                            onReproduce={handleReproduce}
                                            onViewResults={handleViewResults}
                                            onFilterByImage={handleFilterByImage}
                                            isFilterActive={filters.source_image_id === analysis.source_image_id}
                                            t={t}
                                            locale={locale}
                                            batchMode={batchMode}
                                            isSelected={selectedIds.has(analysis._id)}
                                            onToggleSelect={handleToggleSelect}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Split View (compact list) */}
                            {isSplitView && (
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                    {analyses.map(analysis => (
                                        <AnalysisListRowCompact
                                            key={analysis._id}
                                            analysis={analysis}
                                            isActive={selectedAnalysis?._id === analysis._id}
                                            onClick={handleViewDetails}
                                            onViewDetails={handleViewDetails}
                                            onReproduce={handleReproduce}
                                            onViewResults={handleViewResults}
                                            onFilterByImage={handleFilterByImage}
                                            isFilterActive={filters.source_image_id === analysis.source_image_id}
                                            t={t}
                                            locale={locale}
                                            batchMode={batchMode}
                                            isSelected={selectedIds.has(analysis._id)}
                                            onToggleSelect={handleToggleSelect}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pagination - only show when not in split view or no selection */}
                    {!loading && !error && analyses.length > 0 && !isSplitView && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            pageSize={pageSize}
                            onPageChange={handlePageChange}
                            onPageSizeChange={handlePageSizeChange}
                            t={t}
                        />
                    )}
                </div>

                {/* Split View Preview Panel */}
                {isSplitView && (
                    <div className="flex-1 min-w-[350px] lg:min-w-[450px]">
                        {selectedAnalysis ? (
                            <AnalysisDetailsPanel
                                key={selectedAnalysis._id}
                                analysis={selectedAnalysis}
                                onClose={() => setSelectedAnalysis(null)}
                                onReproduce={handleReproduce}
                                onViewResults={handleViewResults}
                                onFilterByImage={handleFilterByImage}
                                t={t}
                                locale={locale}
                            />
                        ) : (
                            <div className="h-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-lg flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                    <FiActivity size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>{t('analysisDashboard.selectAnalysis') || 'Select an analysis to view details'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Detail Modal (only show when not in split view) */}
            {!isSplitView && (
                <AnalysisDetailModal
                    analysis={selectedAnalysis}
                    onClose={handleCloseDetails}
                    onDownloadResult={handleDownloadResult}
                    t={t}
                    locale={locale}
                />
            )}
        </div>
    );
};

export default AnalysisDashboardPage;
