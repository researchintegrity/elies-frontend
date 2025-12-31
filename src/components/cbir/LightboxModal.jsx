import React, { useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import PropTypes from 'prop-types';

const LightboxModal = ({ image, imageUrl, onClose, isResult = false, t }) => {
    useEffect(() => {
        if (!image) return;
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [image, onClose]);

    if (!image) return null;

    return (
        <div
            className="fixed inset-0 bg-black/95 z-[1000] flex backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div className="flex-1 flex items-center justify-center p-8 relative" onClick={e => e.stopPropagation()}>
                <button
                    className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors"
                    onClick={onClose}
                    aria-label={t('common.close') || 'Close'}
                >
                    <FiX size={32} />
                </button>

                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={image.filename}
                        className="max-h-[90vh] max-w-full object-contain rounded-lg shadow-2xl"
                    />
                ) : (
                    <div className="w-full h-full max-h-[80vh] aspect-video flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            <div
                className="w-[360px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 p-6 overflow-y-auto flex flex-col gap-6"
                onClick={e => e.stopPropagation()}
            >
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 break-words">
                        {image.filename}
                    </h2>
                    {isResult && image.similarity_score !== undefined && (
                        <div className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold mb-2">
                            {t('cbir.similarity')}: {(image.similarity_score * 100).toFixed(1)}%
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">{t('cbir.tags')}</h3>
                    <div className="flex flex-wrap gap-2">
                        {(image.imageType || image.image_type)?.length > 0 ? (
                            (image.imageType || image.image_type).map(tag => (
                                <span key={tag} className="text-xs px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-medium">
                                    #{tag}
                                </span>
                            ))
                        ) : (
                            <span className="text-xs text-gray-400 italic">{t('cbir.noTags')}</span>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">{t('cbir.info')}</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                            <span className="block text-gray-500 text-xs mb-1">{t('cbir.origin')}</span>
                            <span className="font-medium dark:text-gray-200 capitalize">
                                {(image.sourceType || image.source_type) === 'uploaded' ? 'Upload' : t('gallery.extracted')}
                            </span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                            <span className="block text-gray-500 text-xs mb-1">{t('pdfs.size')}</span>
                            <span className="font-medium dark:text-gray-200">
                                {image.fileSize || image.file_size ? `${((image.fileSize || image.file_size) / 1024).toFixed(1)} KB` : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

LightboxModal.propTypes = {
    image: PropTypes.object,
    imageUrl: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    isResult: PropTypes.bool,
    t: PropTypes.func.isRequired,
};

export default LightboxModal;
