// src/pages/JobsDashboardPage.jsx
/**
 * Jobs Dashboard Page
 * 
 * Provides real-time monitoring of background tasks (jobs) with:
 * - Statistics cards (pending, processing, completed, failed)
 * - Filterable and paginated job list
 * - Real-time updates via SSE
 * - Progress bars for running jobs
 * 
 * ELIS Scientific Integrity Platform
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    FiActivity,
    FiClock,
    FiCheck,
    FiX,
    FiLoader,
    FiRefreshCw,
    FiFilter,
    FiChevronLeft,
    FiChevronRight,
    FiAlertCircle,
    FiImage,
    FiFileText,
    FiSearch,
    FiTrash2,
    FiCopy,
    FiShare2,
    FiShield,
    FiDatabase,
    FiCalendar,
    FiChevronDown
} from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationsContext';
import { api } from '../services/api';
import { showToast } from '../utils/alert';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

/**
 * Job type configuration
 * Maps backend job_type values to icons and labels
 */
const JOB_TYPE_CONFIG = {
    cbir_index: { icon: FiDatabase, color: 'blue', labelKey: 'jobsDashboard.types.cbirIndex' },
    cbir_search: { icon: FiSearch, color: 'indigo', labelKey: 'jobsDashboard.types.cbirSearch' },
    cbir_delete: { icon: FiTrash2, color: 'red', labelKey: 'jobsDashboard.types.cbirDelete' },
    copy_move_single: { icon: FiCopy, color: 'purple', labelKey: 'jobsDashboard.types.copyMoveSingle' },
    copy_move_cross: { icon: FiCopy, color: 'violet', labelKey: 'jobsDashboard.types.copyMoveCross' },
    trufor: { icon: FiShield, color: 'orange', labelKey: 'jobsDashboard.types.trufor' },
    panel_extraction: { icon: FiImage, color: 'teal', labelKey: 'jobsDashboard.types.panelExtraction' },
    image_extraction: { icon: FiImage, color: 'cyan', labelKey: 'jobsDashboard.types.imageExtraction' },
    watermark_removal: { icon: FiFileText, color: 'amber', labelKey: 'jobsDashboard.types.watermarkRemoval' },
    provenance: { icon: FiShare2, color: 'green', labelKey: 'jobsDashboard.types.provenance' },
    image_deletion: { icon: FiTrash2, color: 'red', labelKey: 'jobsDashboard.types.imageDeletion' },
    document_deletion: { icon: FiTrash2, color: 'red', labelKey: 'jobsDashboard.types.documentDeletion' }
};

/**
 * Job status configuration
 * Maps backend status values to icons, colors and labels
 */
const STATUS_CONFIG = {
    pending: { icon: FiClock, color: 'yellow', labelKey: 'jobsDashboard.status.pending' },
    processing: { icon: FiLoader, color: 'blue', labelKey: 'jobsDashboard.status.processing', animate: true },
    completed: { icon: FiCheck, color: 'green', labelKey: 'jobsDashboard.status.completed' },
    failed: { icon: FiX, color: 'red', labelKey: 'jobsDashboard.status.failed' },
    partial: { icon: FiAlertCircle, color: 'orange', labelKey: 'jobsDashboard.status.partial' }
};

/**
 * Color classes for badges
 */
const COLOR_CLASSES = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Statistics Card Component
 */
const StatCard = ({ icon: Icon, label, value, color, animate = false }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
        <div className={`p-3 rounded-lg ${COLOR_CLASSES[color]}`}>
            <Icon className={`w-5 h-5 ${animate ? 'animate-spin' : ''}`} />
        </div>
        <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
    </div>
);

/**
 * Job Type Badge Component
 */
const TypeBadge = ({ type, t }) => {
    const config = JOB_TYPE_CONFIG[type] || { icon: FiActivity, color: 'gray', labelKey: type };
    const Icon = config.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${COLOR_CLASSES[config.color]}`}>
            <Icon size={12} />
            {t(config.labelKey) || type}
        </span>
    );
};

/**
 * Job Status Badge Component
 */
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

/**
 * Progress Bar Component
 */
const ProgressBar = ({ progress, status }) => {
    const isProcessing = status === 'processing';
    return (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-500 ${status === 'completed' ? 'bg-green-500' :
                    status === 'failed' ? 'bg-red-500' :
                        isProcessing ? 'bg-blue-500' : 'bg-yellow-500'
                    } ${isProcessing && progress < 100 ? 'animate-pulse' : ''}`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
        </div>
    );
};

/**
 * Job Row Component
 */
const JobRow = ({ job, t, locale }) => {
    const [expanded, setExpanded] = useState(false);
    const createdDate = new Date(job.created_at);
    const typeConfig = JOB_TYPE_CONFIG[job.job_type] || { icon: FiActivity };
    const TypeIcon = typeConfig.icon;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all overflow-hidden">
            {/* Main Row */}
            <div className="flex items-center gap-4 p-4">
                {/* Type Icon */}
                <div className={`p-2.5 rounded-lg ${COLOR_CLASSES[typeConfig.color || 'blue']}`}>
                    <TypeIcon size={18} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {job.title}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                        <TypeBadge type={job.job_type} t={t} />
                        <span className="flex items-center gap-1">
                            <FiCalendar size={12} />
                            {createdDate.toLocaleString(locale)}
                        </span>
                    </div>
                </div>

                {/* Status */}
                <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={job.status} t={t} />
                    {job.status === 'processing' && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {Math.round(job.progress_percent)}%
                        </span>
                    )}
                </div>

                {/* Expand Button */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                    <FiChevronDown className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Progress Bar (always visible for processing jobs) */}
            {job.status === 'processing' && (
                <div className="px-4 pb-3">
                    <ProgressBar progress={job.progress_percent} status={job.status} />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {job.current_step || t('jobsDashboard.processing')}
                    </p>
                </div>
            )}

            {/* Expanded Details */}
            {expanded && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                            <span className="text-gray-500 dark:text-gray-400">{t('jobsDashboard.jobId')}:</span>
                            <p className="font-mono text-gray-900 dark:text-white truncate">{job.job_id}</p>
                        </div>
                        {job.started_at && (
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">{t('jobsDashboard.startedAt')}:</span>
                                <p className="text-gray-900 dark:text-white">
                                    {new Date(job.started_at).toLocaleString(locale)}
                                </p>
                            </div>
                        )}
                        {job.completed_at && (
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">{t('jobsDashboard.completedAt')}:</span>
                                <p className="text-gray-900 dark:text-white">
                                    {new Date(job.completed_at).toLocaleString(locale)}
                                </p>
                            </div>
                        )}
                        {job.current_step && (
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">{t('jobsDashboard.currentStep')}:</span>
                                <p className="text-gray-900 dark:text-white">{job.current_step}</p>
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {job.errors && job.errors.length > 0 && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/30">
                            <p className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
                                <FiAlertCircle className="flex-shrink-0 mt-0.5" size={12} />
                                {job.errors[0]}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * Skeleton Row for loading state
 */
const SkeletonRow = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
            <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
    </div>
);

/**
 * Empty State Component
 */
const EmptyState = ({ t }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
            <FiActivity className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('jobsDashboard.noJobs')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            {t('jobsDashboard.noJobsDescription')}
        </p>
    </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const JobsDashboardPage = () => {
    const { t, locale } = useLanguage();
    const { subscribeToEvents } = useNotifications();

    // State
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Statistics
    const [stats, setStats] = useState({
        total_jobs: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Filters
    const [filters, setFilters] = useState({
        job_type: null,
        status: null
    });
    const [showFilters, setShowFilters] = useState(false);

    // ========================================================================
    // DATA FETCHING
    // ========================================================================

    /**
     * Fetch jobs list with pagination and filters
     */
    const fetchJobs = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const params = {
                page: currentPage,
                per_page: pageSize
            };

            if (filters.job_type) params.job_type = filters.job_type;
            if (filters.status) params.status = filters.status;

            const response = await api.listJobs(params);

            setJobs(response.items || []);
            setTotalItems(response.total || 0);
            setTotalPages(response.total_pages || 1);
        } catch (err) {
            console.error('Failed to fetch jobs:', err);
            setError(err.message);
            showToast(t('jobsDashboard.fetchError'), 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentPage, pageSize, filters, t]);

    /**
     * Fetch job statistics
     */
    const fetchStats = useCallback(async () => {
        try {
            const response = await api.getJobStats();
            setStats(response);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    }, []);

    // ========================================================================
    // EFFECTS
    // ========================================================================

    // Initial fetch
    useEffect(() => {
        fetchJobs();
        fetchStats();
    }, [fetchJobs, fetchStats]);

    // Real-time updates via SSE
    useEffect(() => {
        const unsubscribe = subscribeToEvents((eventType, data) => {
            // Refresh on any job event
            if (['job_started', 'job_progress', 'job_completed', 'job_failed'].includes(eventType)) {
                console.log('Job update received:', eventType, data);
                fetchJobs(true);
                fetchStats();
            }
        });

        return unsubscribe;
    }, [subscribeToEvents, fetchJobs, fetchStats]);

    // ========================================================================
    // HANDLERS
    // ========================================================================

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value || null }));
        setCurrentPage(1);
    };

    const handleResetFilters = () => {
        setFilters({ job_type: null, status: null });
        setCurrentPage(1);
    };

    const handleRefresh = () => {
        fetchJobs(true);
        fetchStats();
    };

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <FiActivity className="text-primary-500" />
                        {t('jobsDashboard.title')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t('jobsDashboard.subtitle')}
                    </p>
                </div>

                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                    <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
                    {t('common.refresh')}
                </button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={FiClock}
                    label={t('jobsDashboard.status.pending')}
                    value={stats.pending}
                    color="yellow"
                />
                <StatCard
                    icon={FiLoader}
                    label={t('jobsDashboard.status.processing')}
                    value={stats.processing}
                    color="blue"
                    animate={stats.processing > 0}
                />
                <StatCard
                    icon={FiCheck}
                    label={t('jobsDashboard.status.completed')}
                    value={stats.completed}
                    color="green"
                />
                <StatCard
                    icon={FiX}
                    label={t('jobsDashboard.status.failed')}
                    value={stats.failed}
                    color="red"
                />
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    <FiFilter size={16} />
                    {t('jobsDashboard.filters')}
                    <FiChevronDown className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} size={14} />
                </button>

                <div className="text-sm text-gray-500 dark:text-gray-400">
                    {t('jobsDashboard.totalJobs')}: {totalItems}
                </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Type Filter */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                {t('jobsDashboard.filterByType')}
                            </label>
                            <select
                                value={filters.job_type || ''}
                                onChange={(e) => handleFilterChange('job_type', e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="">{t('jobsDashboard.allTypes')}</option>
                                {Object.keys(JOB_TYPE_CONFIG).map(type => (
                                    <option key={type} value={type}>
                                        {t(JOB_TYPE_CONFIG[type].labelKey) || type}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                {t('jobsDashboard.filterByStatus')}
                            </label>
                            <select
                                value={filters.status || ''}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="">{t('jobsDashboard.allStatuses')}</option>
                                {Object.keys(STATUS_CONFIG).map(status => (
                                    <option key={status} value={status}>
                                        {t(STATUS_CONFIG[status].labelKey) || status}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Clear Filters */}
                        <div className="flex items-end">
                            <button
                                onClick={handleResetFilters}
                                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                            >
                                {t('jobsDashboard.clearFilters')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Jobs List */}
            <div className="space-y-3">
                {loading ? (
                    // Skeleton loading
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : error ? (
                    // Error state
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
                        <FiAlertCircle className="mx-auto mb-2 text-red-500" size={32} />
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                        <button
                            onClick={() => fetchJobs()}
                            className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                            {t('common.tryAgain')}
                        </button>
                    </div>
                ) : jobs.length === 0 ? (
                    // Empty state
                    <EmptyState t={t} />
                ) : (
                    // Jobs list
                    jobs.map(job => (
                        <JobRow
                            key={job.job_id}
                            job={job}
                            t={t}
                            locale={locale}
                        />
                    ))
                )}
            </div>

            {/* Pagination */}
            {!loading && jobs.length > 0 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    {/* Page Size */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{t('jobsDashboard.perPage')}:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            {PAGE_SIZE_OPTIONS.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>

                    {/* Page Navigation */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {t('jobsDashboard.page')} {currentPage} {t('jobsDashboard.of')} {totalPages}
                        </span>

                        <div className="flex gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage <= 1}
                                className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <FiChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <FiChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobsDashboardPage;
