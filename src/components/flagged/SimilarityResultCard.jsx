import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FiCheck, FiFlag, FiAlertTriangle } from 'react-icons/fi';
import { API_BASE_URL } from '../../config/api';

const SimilarityResultCard = ({ image, onSelect, isSelected, isSelectionMode, similarityScore, rank, onToggleFlag, t }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const getThumbnailUrl = (imageId) => {
        const token = localStorage.getItem('authToken');
        return `${API_BASE_URL}/images/${imageId}/thumbnail${token ? `?token=${token}` : ''}`;
    };

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

SimilarityResultCard.propTypes = {
    image: PropTypes.object.isRequired,
    onSelect: PropTypes.func,
    isSelected: PropTypes.bool,
    isSelectionMode: PropTypes.bool,
    similarityScore: PropTypes.number,
    rank: PropTypes.number,
    onToggleFlag: PropTypes.func,
    t: PropTypes.func.isRequired
};

export default SimilarityResultCard;
