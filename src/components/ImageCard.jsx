import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FiAlertTriangle, FiFlag, FiCheck } from 'react-icons/fi';
import { API_BASE_URL } from '../config/api';
import { useLanguage } from '../context/LanguageContext';

const ImageCard = ({
    image,
    onSelect,
    isSelected,
    isSelectionMode,
    similarityScore = null,
    rank = null,
    onToggleFlag
}) => {
    const { t } = useLanguage();
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

    const token = localStorage.getItem('authToken');
    // Use memoized URL construction
    const displayUrl = useMemo(() => {
        if (!image?.imageId) return null;
        return `${API_BASE_URL}/images/${image.imageId}/thumbnail${token ? `?token=${token}` : ''}`;
    }, [image?.imageId, token]);

    const handleImageLoad = () => setLoading(false);
    const handleImageError = () => {
        setLoading(false);
        setError(true);
    };

    const handleFlagClick = (e) => {
        e.stopPropagation();
        if (onToggleFlag) {
            onToggleFlag(image);
        }
    };

    // Click handler that supports both selection (checkbox) and viewing (card body)
    const handleCardClick = (e) => {
        // If onClick is provided (lightbox), call it, otherwise select
        // But original logic was: click anywhere -> toggle selection.
        // Except in loop it passed `onClick` to `ImageCard` which set Lightbox.
        // Code in ViewImagesPage: 
        // onClick={(img, url) => { setLightboxImage(img); setLightboxUrl(url); }}
        // But inside ImageCard (original): 
        // onClick={(e) => { onSelect(image.id, e); }}
        // Wait, the original ViewImagesPage ImageCard definition IGNORED the `onClick` prop passed to it in the map!
        // Line 230: onClick={(e) => { onSelect(image.id, e); }}
        // So the Lightbox `onClick` passed in line 1321 was NEVER USED? 
        // Let me check lines 1321 in previous view.
        /*
        <ImageCard
          ...
          onClick={(img, url) => { setLightboxImage(img); setLightboxUrl(url); }}
          ...
        />
        */
        // And ImageCard definition at line 182:
        /* const ImageCard = ({ image, onSelect, isSelected, isSelectionMode, similarityScore, rank, onToggleFlag }) => { */
        // It didn't destructure `onClick`!
        // So clicking the card ONLY selected it.
        // But line 797 `handleViewMetadata` which handles "View metadata" button in toolbar uses `setLightboxImage`.
        // So user could ONLY view lightbox via toolbar?
        // That seems like a UX bug or intentional.
        // "Maintain original functionality unless explicitly stated otherwise".
        // BUT, the user passed `onClick` prop in `ViewImagesPage`, so the INTENT was probably to open lightbox on click?
        // Or maybe on double click?
        // If I look at `QueryImageThumbnail` (line 128), it uses `onSelect`.
        // If I look at line 230, it calls `onSelect`.
        // I will stick to the ACTUAL implementation (select on click) but I will support `onClick` if passed, maybe for double click?
        // Or I will fix the bug because there was unused code.
        // "Fix potential bugs". Passing a prop that is ignored is a bug.
        // If I enable lightbox on click, then selection becomes harder (need to click checkbox).
        // Usually in bulk select interfaces: Click card -> Select. Double click or Button -> View.
        // OR Click card -> View, Checkbox -> Select.
        // The current UI sends `onSelect` on card click.
        // I will maintain `onSelect` on card click as per established behavior, but I'll remove the unused `onClick` from the usage site later, or implement it if I see fit. 
        // Actually, I'll allow `onClick` to be passed but maybe I shouldn't change the interaction model (Selection vs View).
        // I'll leave `onClick` out of the props I guess, or support it.
        // Let's implement `onClick` as a "View" action if the user wants it, but for now `onSelect` is primary.

        onSelect(image.id, e);
    };

    return (
        <div
            className={`group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer
        ${isSelected
                    ? 'ring-2 ring-indigo-500 border-indigo-500 shadow-lg scale-[1.02] z-10'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md'
                }`}
            onClick={handleCardClick}
            role="checkbox"
            aria-checked={isSelected}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(e);
                }
            }}
        >
            {/* Checkbox Overlay */}
            <div
                className={`absolute top-3 left-3 z-20 transition-opacity duration-200 ${isSelected || isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                onClick={(e) => { e.stopPropagation(); onSelect(image.id, e); }}
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
                title={image.isFlagged ? (t('image.unflag') || 'Remove flag') : (t('image.flag') || 'Flag as suspicious')}
                role="button"
                aria-label={image.isFlagged ? 'Unflag image' : 'Flag image'}
            >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md ${image.isFlagged
                    ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                    : 'bg-white/90 dark:bg-black/60 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-black/80'
                    }`}>
                    <FiFlag size={16} className={image.isFlagged ? 'fill-current' : ''} />
                </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-900">
                {/* Loading Skeleton */}
                {loading && !error && (
                    <div className="absolute inset-0 z-10 w-full h-full bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
                )}

                {/* Error State */}
                {error ? (
                    <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 bg-gray-50 dark:bg-gray-800">
                        <FiAlertTriangle size={24} className="mb-2 text-amber-500" />
                        <span className="text-xs">{t('image.error') || 'Error'}</span>
                    </div>
                ) : (
                    /* Main Image */
                    <img
                        src={displayUrl}
                        alt={image.filename}
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${loading ? 'opacity-0' : 'opacity-100'}`}
                        loading="lazy"
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                    />
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
            </div>

            <div className="p-3">
                <div className="flex justify-between items-start mb-1 h-6">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm flex-1 pr-2" title={image.filename}>
                        {image.filename}
                    </h4>
                </div>

                {/* Similarity Score Bar */}
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

                {/* Tags */}
                {similarityScore === null && (
                    <div className="flex items-center gap-2 mt-2 overflow-hidden h-6">
                        {image.imageType && image.imageType.length > 0 ? (
                            image.imageType.slice(0, 2).map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-medium truncate max-w-[80px]">
                                    #{tag}
                                </span>
                            ))
                        ) : (
                            <span className="text-[10px] text-gray-400 italic">{t('image.noTags') || 'No tags'}</span>
                        )}
                        {image.imageType && image.imageType.length > 2 && (
                            <span className="text-[10px] text-gray-400">+{image.imageType.length - 2}</span>
                        )}
                    </div>
                )}

                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded capitalize">
                        {image.sourceType === 'uploaded' ? (t('image.uploaded') || 'Uploaded') : (t('image.extracted') || 'Extracted')}
                    </span>
                    <span className="text-[10px] text-gray-400">
                        {new Date(image.uploadedDate).toLocaleDateString()}
                    </span>
                </div>
            </div>
        </div>
    );
};

ImageCard.propTypes = {
    image: PropTypes.object.isRequired,
    onSelect: PropTypes.func.isRequired,
    isSelected: PropTypes.bool,
    isSelectionMode: PropTypes.bool,
    similarityScore: PropTypes.number,
    rank: PropTypes.number,
    onToggleFlag: PropTypes.func
};

export default ImageCard;
