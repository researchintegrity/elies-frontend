import React, { useState, useMemo } from 'react';
import { FiX, FiTag, FiPlus, FiMinus } from 'react-icons/fi';
import TagInput from './TagInput';
import { useLanguage } from '../context/LanguageContext';

const BatchTagModal = ({ isOpen, onClose, onConfirm, onRemoveTags, selectedImages = [], count }) => {
    const { t } = useLanguage();
    const [tags, setTags] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [removingTag, setRemovingTag] = useState(null);

    // Calculate common tags (intersection of all imageType arrays from selected images)
    const commonTags = useMemo(() => {
        if (!selectedImages || selectedImages.length === 0) return [];
        const allTagSets = selectedImages.map(img => new Set(img.imageType || []));
        // Use first image's tags as base, filter to only those present in ALL images
        return [...allTagSets[0]].filter(tag =>
            allTagSets.every(set => set.has(tag))
        ).sort();
    }, [selectedImages]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        const finalTags = [...tags];
        if (inputValue.trim() && !tags.includes(inputValue.trim())) {
            finalTags.push(inputValue.trim());
        }

        onConfirm(finalTags);
        setTags([]);
        setInputValue('');
        onClose();
    };

    const handleRemoveTag = async (tag) => {
        if (!onRemoveTags) return;
        setRemovingTag(tag);
        try {
            await onRemoveTags([tag]);
        } finally {
            setRemovingTag(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <FiTag className="text-xl" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {t('batchTag.title')}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('batchTag.description')} <strong className="text-gray-900 dark:text-white">{count} {t('batchTag.selectedImages')}</strong>. {t('batchTag.addToExisting')}
                    </p>

                    {/* Common Tags Section (Remove) */}
                    {onRemoveTags && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                <FiMinus size={12} />
                                {t('batchTag.commonTags') || 'Common Tags'}
                            </label>
                            {commonTags.length > 0 ? (
                                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                    {commonTags.map(tag => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-sm font-medium border border-rose-200 dark:border-rose-500/30"
                                        >
                                            #{tag}
                                            <button
                                                onClick={() => handleRemoveTag(tag)}
                                                disabled={removingTag === tag}
                                                className="hover:text-rose-800 dark:hover:text-rose-200 p-0.5 rounded-full hover:bg-rose-200 dark:hover:bg-rose-800 transition-colors disabled:opacity-50"
                                                title={t('batchTag.removeTag') || 'Remove tag'}
                                            >
                                                {removingTag === tag ? (
                                                    <span className="block w-3 h-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <FiX size={14} />
                                                )}
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 dark:text-gray-500 italic p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                    {t('batchTag.noCommonTags') || 'No common tags among selected images'}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Add Tags Section */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <FiPlus size={12} />
                            {t('batchTag.newTags')}
                        </label>
                        <TagInput
                            tags={tags}
                            onAdd={(tag) => setTags(prev => [...prev, tag])}
                            onRemove={(tag) => setTags(prev => prev.filter(t => t !== tag))}
                            onInputChange={setInputValue}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={tags.length === 0 && !inputValue.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
                    >
                        {t('batchTag.addTags')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BatchTagModal;

