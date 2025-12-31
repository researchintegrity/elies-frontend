import React from 'react';
import { FiImage, FiX } from 'react-icons/fi';
import { useLanguage } from '../../context/LanguageContext';
import { getThumbnailUrl } from '../../hooks/useGallery';

// Compact Selected Image Preview - uses thumbnail URL for fast loading
const CompactImagePreview = ({ image, onRemove }) => {
    const { t } = useLanguage();
    // Use thumbnail URL directly - browser handles caching
    const imageUrl = image?.id ? getThumbnailUrl(image.id) : null;

    if (!image) {
        return (
            <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <FiImage className="text-gray-400" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase text-emerald-500">{t('manipulation.image')}</span>
                    <p className="text-xs text-gray-400 italic truncate">{t('manipulation.notSelected')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
            <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                {imageUrl ? (
                    <img src={imageUrl} alt={image.filename} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full animate-pulse bg-gray-200 dark:bg-gray-700" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">{t('manipulation.image')}</span>
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{image.filename}</p>
            </div>
            <button onClick={onRemove} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600" aria-label={t('common.remove')}>
                <FiX size={14} />
            </button>
        </div>
    );
};

export default CompactImagePreview;
