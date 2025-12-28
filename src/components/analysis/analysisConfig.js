// src/components/analysis/analysisConfig.js
/**
 * Shared analysis configuration constants
 * Used by AnalysisDashboardPage and FlaggedImagesPage
 */

import {
    FiCopy,
    FiShield,
    FiSearch,
    FiShare2,
    FiExternalLink,
    FiClock,
    FiLoader,
    FiCheck,
    FiX,
    FiZap,
    FiActivity,
    FiSun,
    FiSliders,
    FiTag
} from 'react-icons/fi';

// Analysis type configurations
export const ANALYSIS_TYPE_CONFIG = {
    single_image_copy_move: {
        icon: FiCopy,
        color: 'blue',
        labelKey: 'analysisDashboard.types.singleCopyMove'
    },
    cross_image_copy_move: {
        icon: FiCopy,
        color: 'indigo',
        labelKey: 'analysisDashboard.types.crossCopyMove'
    },
    trufor: {
        icon: FiShield,
        color: 'purple',
        labelKey: 'analysisDashboard.types.trufor'
    },
    cbir_search: {
        icon: FiSearch,
        color: 'green',
        labelKey: 'analysisDashboard.types.cbir'
    },
    provenance: {
        icon: FiShare2,
        color: 'orange',
        labelKey: 'analysisDashboard.types.provenance'
    },
    external: {
        icon: FiExternalLink,
        color: 'gray',
        labelKey: 'analysisDashboard.types.external'
    }
};

// External analysis subtype icons (for Image Analysis page tools)
export const EXTERNAL_SUBTYPE_CONFIG = {
    ela: { icon: FiZap, label: 'Error Level Analysis', color: 'amber' },
    noise: { icon: FiActivity, label: 'Noise Analysis', color: 'teal' },
    gradient: { icon: FiSun, label: 'Luminance Gradient', color: 'yellow' },
    levelSweep: { icon: FiSliders, label: 'Level Sweep', color: 'cyan' },
    cloneDetection: { icon: FiCopy, label: 'Clone Detection', color: 'pink' },
    metadata: { icon: FiTag, label: 'Metadata', color: 'gray' }
};

// Status configurations
export const STATUS_CONFIG = {
    pending: {
        icon: FiClock,
        color: 'yellow',
        labelKey: 'analysisDashboard.status.pending'
    },
    processing: {
        icon: FiLoader,
        color: 'blue',
        labelKey: 'analysisDashboard.status.processing',
        animate: true
    },
    completed: {
        icon: FiCheck,
        color: 'green',
        labelKey: 'analysisDashboard.status.completed'
    },
    failed: {
        icon: FiX,
        color: 'red',
        labelKey: 'analysisDashboard.status.failed'
    }
};

// Color mapping for badges
export const COLOR_CLASSES = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
};
