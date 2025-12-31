
import React from 'react';
import TagInput from '../TagInput';

const ImageMetadataSidebar = ({ image, t, locale, onTagAdd, onTagRemove }) => {
    if (!image) return null;

    return (
        <>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-6 -mt-4">
                <span>{new Date(image.uploadedDate).toLocaleDateString(locale)}</span>
                <span>•</span>
                <span>{(image.fileSize / 1024).toFixed(1)} KB</span>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">{t('lightbox.tagsClassification') || 'Tags & Classification'}</h3>
                <TagInput
                    tags={image.imageType || []}
                    onAdd={(tag) => onTagAdd(image, tag)}
                    onRemove={(tag) => onTagRemove(image, tag)}
                />
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">{t('lightbox.metadata') || 'Metadata'}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <span className="block text-gray-500 text-xs mb-1">{t('lightbox.origin') || 'Origin'}</span>
                        <span className="font-medium dark:text-gray-200 capitalize">{image.sourceType || 'Unknown'}</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <span className="block text-gray-500 text-xs mb-1">{t('lightbox.format') || 'Format'}</span>
                        <span className="font-medium dark:text-gray-200 uppercase">{image.filename?.split('.').pop() || 'JPG'}</span>
                    </div>
                </div>

                {/* Exif Metadata Placeholder */}
                {image.exifMetadata && Object.keys(image.exifMetadata).length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                        {Object.entries(image.exifMetadata).slice(0, 5).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-xs">
                                <span className="text-gray-500">{key}</span>
                                <span className="text-gray-900 dark:text-gray-300 truncate max-w-[120px]" title={String(value)}>{String(value)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default ImageMetadataSidebar;
