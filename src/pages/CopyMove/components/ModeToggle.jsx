import React from 'react';
import { FiImage, FiLayers } from 'react-icons/fi';

const ModeToggle = ({ mode, onModeChange, t }) => (
    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
            onClick={() => onModeChange('single')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${mode === 'single'
                ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
        >
            <FiImage size={16} />
            {t('copyMove.singleMode')}
        </button>
        <button
            onClick={() => onModeChange('cross')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${mode === 'cross'
                ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
        >
            <FiLayers size={16} />
            {t('copyMove.crossMode')}
        </button>
    </div>
);

export default ModeToggle;
