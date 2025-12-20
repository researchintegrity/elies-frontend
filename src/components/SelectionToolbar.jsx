import React from 'react';
import { FiX, FiTrash2, FiTag, FiBarChart2, FiTarget, FiInfo } from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext';

const SelectionToolbar = ({ selectedCount, onClearSelection, onDelete, onTag, onAnalyze, onFindSimilar, onViewMetadata }) => {
    const { t } = useLanguage();

    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center gap-6 animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center gap-3 border-r border-gray-200 dark:border-gray-700 pr-6">
                <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                    {selectedCount} {selectedCount > 1 ? t('selection.selectedPlural') : t('selection.selected')}
                </span>
                <button
                    onClick={onClearSelection}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                    title={t('selection.clearSelection')}
                >
                    <FiX />
                </button>
            </div>

            <div className="flex items-center gap-2">
                {/* View Metadata - Only shown when exactly 1 image is selected */}
                {selectedCount === 1 && onViewMetadata && (
                    <button
                        onClick={onViewMetadata}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium transition-colors"
                        title={t('selection.viewMetadataTitle')}
                    >
                        <FiInfo className="text-lg" />
                        <span>{t('selection.viewMetadata')}</span>
                    </button>
                )}

                {/* Find Similar - Only shown when exactly 1 image is selected */}
                {selectedCount === 1 && onFindSimilar && (
                    <button
                        onClick={onFindSimilar}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium transition-colors"
                        title={t('selection.findSimilarTitle')}
                    >
                        <FiTarget className="text-lg" />
                        <span>{t('selection.findSimilar')}</span>
                    </button>
                )}

                <button
                    onClick={onTag}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium transition-colors"
                >
                    <FiTag className="text-lg" />
                    <span>{t('selection.classify')}</span>
                </button>

                <button
                    onClick={onAnalyze}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium transition-colors"
                    title={t('sidebar.comingSoon')}
                >
                    <FiBarChart2 className="text-lg" />
                    <span>{t('selection.analyze')}</span>
                </button>

                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2"></div>

                <button
                    onClick={onDelete}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium transition-colors"
                >
                    <FiTrash2 className="text-lg" />
                    <span>{t('selection.delete')}</span>
                </button>
            </div>
        </div>
    );
};

export default SelectionToolbar;
