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
    FiCopy,
    FiShield,
    FiShare2,
    FiDatabase,
    FiDownload,
    FiEye,
    FiRepeat,
    FiExternalLink,
    FiChevronDown,
    FiTag,
    FiSliders,
    FiZap,
    FiSun,
    FiLayers
} from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { showAlert, showToast } from '../utils/alert';
import { SkeletonCard, EmptyState } from '../components/common';

// --- Constants ---
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
const ParametersDisplay = ({ parameters, t }) => {
    const [expanded, setExpanded] = useState(false);
    
    if (!parameters || Object.keys(parameters).length === 0) {
        return <span className="text-gray-400 text-xs">{t('analysisDashboard.noParameters')}</span>;
    }
    
    const entries = Object.entries(parameters).filter(([key]) => key !== 'analysis_subtype');
    const displayEntries = expanded ? entries : entries.slice(0, 2);
    
    return (
        <div className="space-y-1">
            {displayEntries.map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{key}:</span>
                    <span className="text-gray-900 dark:text-gray-200 font-medium">
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                    </span>
                </div>
            ))}
            {entries.length > 2 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
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
                        <option value="cbir_search">{t('analysisDashboard.types.cbir')}</option>
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
        </div>
    );
};

// Analysis Row
const AnalysisRow = ({ analysis, onViewDetails, onReproduce, t, locale }) => {
    const [imageUrl, setImageUrl] = useState(null);
    const [loadingImage, setLoadingImage] = useState(true);
    
    // Load thumbnail for source image
    useEffect(() => {
        let isMounted = true;
        const loadImage = async () => {
            if (!analysis.source_image_id) {
                setLoadingImage(false);
                return;
            }
            try {
                const blob = await api.download(`/images/${analysis.source_image_id}/download`);
                if (isMounted) {
                    setImageUrl(URL.createObjectURL(blob));
                }
            } catch (err) {
                console.error('Failed to load thumbnail:', err);
            } finally {
                if (isMounted) setLoadingImage(false);
            }
        };
        loadImage();
        return () => {
            isMounted = false;
            if (imageUrl) URL.revokeObjectURL(imageUrl);
        };
    }, [analysis.source_image_id]);
    
    const createdDate = new Date(analysis.created_at);
    const typeConfig = ANALYSIS_TYPE_CONFIG[analysis.type] || ANALYSIS_TYPE_CONFIG.external;
    const TypeIcon = typeConfig.icon;
    
    return (
        <div className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all duration-200 overflow-hidden">
            <div className="flex items-stretch">
                {/* Thumbnail */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-gray-100 dark:bg-gray-900 overflow-hidden">
                    {loadingImage ? (
                        <div className="w-full h-full animate-pulse bg-gray-200 dark:bg-gray-700" />
                    ) : imageUrl ? (
                        <img
                            src={imageUrl}
                            alt="Source"
                            className="w-full h-full object-cover"
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
                            {analysis.status === 'completed' && analysis.parameters && (
                                <button
                                    onClick={() => onReproduce(analysis)}
                                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                    title={t('analysisDashboard.reproduce')}
                                >
                                    <FiRepeat size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Parameters Preview */}
                    {analysis.parameters && Object.keys(analysis.parameters).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <ParametersDisplay parameters={analysis.parameters} t={t} />
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
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === page
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
                                        {Object.entries(analysis.parameters).map(([key, value]) => (
                                            <div key={key} className="flex justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400">{key}</span>
                                                <span className="text-gray-900 dark:text-white font-medium">
                                                    {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                                                </span>
                                            </div>
                                        ))}
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
    
    // Modal state
    const [selectedAnalysis, setSelectedAnalysis] = useState(null);
    
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
            showToast('error', t('analysisDashboard.fetchError'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentPage, pageSize, filters, t]);
    
    // Initial fetch and refetch on dependency changes
    useEffect(() => {
        fetchAnalyses();
    }, [fetchAnalyses]);
    
    // Handlers
    const handleFilterChange = useCallback((key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1); // Reset to first page on filter change
    }, []);
    
    const handleResetFilters = useCallback(() => {
        setFilters({
            type: null,
            status: null,
            date_from: null,
            date_to: null
        });
        setCurrentPage(1);
    }, []);
    
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
        // Copy parameters to clipboard or navigate to the appropriate tool
        const params = JSON.stringify(analysis.parameters, null, 2);
        navigator.clipboard.writeText(params);
        showToast('success', t('analysisDashboard.parametersCopied'));
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
            showToast('success', t('analysisDashboard.downloadSuccess'));
        } catch (err) {
            console.error('Download failed:', err);
            showToast('error', t('analysisDashboard.downloadError'));
        }
    }, [t]);
    
    // Check if any filters are active
    const hasActiveFilters = Object.values(filters).some(v => v !== null);
    
    return (
        <div className="space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                            <FiActivity className="text-indigo-600 dark:text-indigo-400" size={24} />
                        </div>
                        {t('analysisDashboard.title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {t('analysisDashboard.subtitle')}
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            showFilters || hasActiveFilters
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        <FiFilter size={16} />
                        {t('common.filters')}
                        {hasActiveFilters && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                        )}
                    </button>
                    
                    <button
                        onClick={() => fetchAnalyses(true)}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                        <FiRefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        {t('common.refresh')}
                    </button>
                </div>
            </div>
            
            {/* Filter Panel */}
            {showFilters && (
                <FilterPanel
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onReset={handleResetFilters}
                    t={t}
                />
            )}
            
            {/* Content */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <SkeletonRow key={i} />
                    ))}
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
                    description={hasActiveFilters ? t('analysisDashboard.noMatchingAnalyses') : t('analysisDashboard.noAnalysesDescription')}
                    icon="search"
                    actionLabel={hasActiveFilters ? t('analysisDashboard.clearFilters') : null}
                    onAction={hasActiveFilters ? handleResetFilters : null}
                    showAction={hasActiveFilters}
                />
            ) : (
                <>
                    {/* Analysis List */}
                    <div className="space-y-3">
                        {analyses.map(analysis => (
                            <AnalysisRow
                                key={analysis._id}
                                analysis={analysis}
                                onViewDetails={handleViewDetails}
                                onReproduce={handleReproduce}
                                t={t}
                                locale={locale}
                            />
                        ))}
                    </div>
                    
                    {/* Pagination */}
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        pageSize={pageSize}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                        t={t}
                    />
                </>
            )}
            
            {/* Detail Modal */}
            <AnalysisDetailModal
                analysis={selectedAnalysis}
                onClose={handleCloseDetails}
                onDownloadResult={handleDownloadResult}
                t={t}
                locale={locale}
            />
        </div>
    );
};

export default AnalysisDashboardPage;
