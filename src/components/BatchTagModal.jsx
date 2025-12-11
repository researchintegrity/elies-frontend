import React, { useState } from 'react';
import { FiX, FiTag } from 'react-icons/fi';
import TagInput from './TagInput';

const BatchTagModal = ({ isOpen, onClose, onConfirm, count }) => {
    const [tags, setTags] = useState([]);
    const [inputValue, setInputValue] = useState('');

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
                            Classificar Imagens
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
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Adicione tags para classificar as <strong className="text-gray-900 dark:text-white">{count} imagens selecionadas</strong>.
                        Elas serão adicionadas às tags existentes.
                    </p>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Novas Tags</label>
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
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={tags.length === 0 && !inputValue.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
                    >
                        Adicionar Tags
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BatchTagModal;
