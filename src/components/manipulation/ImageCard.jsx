import React from 'react';
import { FiCheck, FiImage } from 'react-icons/fi';
import { useLanguage } from '../../context/LanguageContext';
import { getThumbnailUrl } from '../../hooks/useGallery';

// Image Card for Selection
const ImageCard = ({ image, isSelected, onClick, imageUrl, loading }) => {
    const { t } = useLanguage();

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(image);
        }
    };

    return (
        <div
            className={`group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer
                ${isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                }`}
            onClick={() => onClick(image)}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={`${t('manipulation.image')} ${image.filename}`}
        >
            {/* Selection Indicator */}
            <div className={`absolute top-2 left-2 z-10 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-white/80 dark:bg-black/50 border-white/50'
                    }`}>
                    {isSelected && <FiCheck size={14} strokeWidth={3} />}
                </div>
            </div>

            {/* Selected Badge */}
            {isSelected && (
                <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500 text-white">
                    {t('manipulation.selected')}
                </div>
            )}

            <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-900">
                {loading ? (
                    <div className="w-full h-full animate-pulse bg-gray-200 dark:bg-gray-700" />
                ) : imageUrl ? (
                    <img src={imageUrl} alt={image.filename} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <FiImage size={24} />
                    </div>
                )}
            </div>

            <div className="p-2">
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate" title={image.filename}>
                    {image.filename}
                </p>
            </div>
        </div>
    );
};

// Lazy Image Card - uses thumbnail URL for fast loading
export const LazyImageCard = ({ image, isSelected, onClick }) => {
    // Use thumbnail URL directly - browser handles caching
    const imageUrl = image?.id ? getThumbnailUrl(image.id) : null;

    return <ImageCard image={image} isSelected={isSelected} onClick={onClick} imageUrl={imageUrl} loading={false} />;
};

export default ImageCard;
