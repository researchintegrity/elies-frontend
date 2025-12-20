import React from 'react';
import { FiX, FiFilter, FiCalendar, FiTag, FiDatabase } from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext';

const ImageFilters = ({ isOpen, onClose, filters, availableTags = [], onFilterChange }) => {
    const { t } = useLanguage();

    if (!isOpen) return null;

    const sourceOptions = [
        { id: 'all', label: t('filters.originAll') },
        { id: 'uploaded', label: t('filters.originUploaded') },
        { id: 'extracted', label: t('filters.originExtracted') }
    ];

    // Use available tags from images, fallback to default tags if none available
    const tagsToShow = availableTags.length > 0
        ? availableTags
        : ['figure', 'table', 'equation', 'diagram', 'plot'];

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 z-40 transform transition-transform duration-300 ease-in-out flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-lg">
                    <FiFilter className="text-indigo-500" />
                    {t('filters.title')}
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                    <FiX size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">

                {/* Source Type */}
                <section>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-4">
                        <FiDatabase className="text-gray-400" /> {t('filters.origin')}
                    </h4>
                    <div className="space-y-2">
                        {sourceOptions.map((option) => (
                            <label key={option.id} className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${filters.sourceType === option.id
                                    ? 'bg-indigo-500 border-indigo-500 text-white'
                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 group-hover:border-indigo-400'
                                    }`}>
                                    {filters.sourceType === option.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                                <input
                                    type="radio"
                                    name="sourceType"
                                    className="hidden"
                                    checked={filters.sourceType === option.id}
                                    onChange={() => onFilterChange('sourceType', option.id)}
                                />
                                <span className={`text-sm ${filters.sourceType === option.id ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {option.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </section>

                {/* Date Range */}
                <section>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-4">
                        <FiCalendar className="text-gray-400" /> {t('filters.date')}
                    </h4>
                    <div className="space-y-3">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('filters.dateFrom')}</label>
                        <input
                            type="date"
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            value={filters.dateFrom || ''}
                            onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                        />
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('filters.dateTo')}</label>
                        <input
                            type="date"
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            value={filters.dateTo || ''}
                            onChange={(e) => onFilterChange('dateTo', e.target.value)}
                        />
                    </div>
                </section>

                {/* Tags */}
                <section>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-4">
                        <FiTag className="text-gray-400" /> {t('filters.tags')}
                        {(filters.tags || []).length > 0 && (
                            <span className="ml-auto text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                {(filters.tags || []).length} {t('common.selected')}
                            </span>
                        )}
                    </h4>

                    {tagsToShow.length > 0 ? (
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                            {tagsToShow.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => {
                                        const currentTags = filters.tags || [];
                                        const newTags = currentTags.includes(tag)
                                            ? currentTags.filter(t => t !== tag)
                                            : [...currentTags, tag];
                                        onFilterChange('tags', newTags);
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${(filters.tags || []).includes(tag)
                                        ? 'bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-500/30 dark:text-indigo-300'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                            {t('filters.noTagsAvailable')}
                        </p>
                    )}
                </section>

            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <button
                    onClick={() => onFilterChange('reset')}
                    className="w-full py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm"
                >
                    {t('filters.clearFilters')}
                </button>
            </div>
        </div>
    );
};

export default ImageFilters;
