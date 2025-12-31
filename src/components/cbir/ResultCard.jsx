import React, { useState } from 'react';
import { FiAlertTriangle, FiLink } from 'react-icons/fi';
import PropTypes from 'prop-types';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

const getThumbnailUrl = (imageId, token) => {
    return `${API_BASE_URL}/images/${imageId}/thumbnail${token ? `?token=${token}` : ''}`;
};

const ResultCard = ({ result, rank, onClick, onMarkAsRelated, t }) => {
    const { token } = useAuth();
    const imageUrl = result?.image_id ? getThumbnailUrl(result.image_id, token) : null;
    const [error, setError] = useState(false);
    const [linkingAsRelated, setLinkingAsRelated] = useState(false);

    const similarityPercent = (result.similarity_score * 100).toFixed(1);
    const getSimilarityTone = (score) => {
        if (score >= 0.9) return 'green';
        if (score >= 0.7) return 'amber';
        return 'red';
    };

    const toneToClasses = (tone) => {
        switch (tone) {
            case 'green':
                return 'text-green-700 border-green-600/40';
            case 'amber':
                return 'text-amber-700 border-amber-600/40';
            default:
                return 'text-red-700 border-red-600/40';
        }
    };

    const similarityTone = getSimilarityTone(result.similarity_score);
    const toneColors = {
        green: 'bg-green-500',
        amber: 'bg-amber-500',
        red: 'bg-red-500'
    };

    return (
        <div
            onClick={() => onClick?.(result, imageUrl)}
            className="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all cursor-pointer hover:shadow-lg"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.(result, imageUrl);
                }
            }}
        >
            <div className="aspect-square bg-gray-100 dark:bg-gray-900 overflow-hidden">
                {error ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800">
                        <FiAlertTriangle size={24} className="mb-2 text-amber-500" />
                        <span className="text-xs">{t('cbir.error')}</span>
                    </div>
                ) : (
                    <img
                        src={imageUrl}
                        alt={result.filename || 'Similar image'}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={() => setError(true)}
                    />
                )}
            </div>

            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">#{rank}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${toneColors[similarityTone]}`}></div>
                    <span className={`text-sm font-bold ${toneToClasses(similarityTone).split(' ')[0]}`}>
                        {similarityPercent}%
                    </span>
                </div>
            </div>

            <div className="p-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm mb-2" title={result.filename}>
                    {result.filename || t('cbir.noTags')}
                </h4>

                <div className="flex items-center gap-2 flex-wrap">
                    {result.image_type?.length > 0 ? (
                        result.image_type.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-medium">
                                #{tag}
                            </span>
                        ))
                    ) : (
                        <span className="text-[10px] text-gray-400 italic">{t('cbir.noTags')}</span>
                    )}
                </div>

                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded capitalize">
                        {result.source_type === 'uploaded' ? 'Upload' : t('gallery.extracted')}
                    </span>
                    <span className="text-[10px] text-gray-400">
                        {result.file_size ? `${(result.file_size / 1024).toFixed(0)} KB` : ''}
                    </span>
                </div>

                {/* Mark as Related Button */}
                {onMarkAsRelated && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setLinkingAsRelated(true);
                            onMarkAsRelated(result)
                                .finally(() => setLinkingAsRelated(false));
                        }}
                        disabled={linkingAsRelated}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <FiLink size={10} />
                        {linkingAsRelated ? t('cbir.linking') || 'Linking...' : t('cbir.markAsRelated') || 'Mark as Related'}
                    </button>
                )}
            </div>
        </div>
    );
};

ResultCard.propTypes = {
    result: PropTypes.shape({
        image_id: PropTypes.string,
        similarity_score: PropTypes.number,
        filename: PropTypes.string,
        image_type: PropTypes.arrayOf(PropTypes.string),
        source_type: PropTypes.string,
        file_size: PropTypes.number,
    }).isRequired,
    rank: PropTypes.number,
    onClick: PropTypes.func,
    onMarkAsRelated: PropTypes.func,
    t: PropTypes.func.isRequired,
};

export default ResultCard;
