import React from 'react';
import { FiX, FiTrash2, FiLayers } from 'react-icons/fi';
import { useLanguage } from '../../context/LanguageContext';
import CompactImagePreview from './CompactImagePreview';

const SelectedImagesSidebar = ({ isOpen, onClose, images, onRemove, onClearAll }) => {
    const { t } = useLanguage();

    return (
        <div
            className={`flex-shrink-0 z-30 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'
                }`}
            style={{ height: '100%' }}
        >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center gap-2">
                    <FiLayers className="text-emerald-500" />
                    <h3 className="font-bold text-gray-900 dark:text-white">
                        {t('manipulation.selectedImages')}
                    </h3>
                    <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">
                        {images.length}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <FiX size={20} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {images.length > 0 ? (
                    images.map((image) => (
                        <CompactImagePreview
                            key={image.id}
                            image={image}
                            onRemove={() => onRemove(image)}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-center text-gray-400">
                        <FiLayers size={32} className="mb-2 opacity-20" />
                        <p className="text-sm">{t('manipulation.noImages')}</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            {images.length > 0 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <button
                        onClick={onClearAll}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
                    >
                        <FiTrash2 size={16} />
                        {t('selection.clearSelection')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default SelectedImagesSidebar;
