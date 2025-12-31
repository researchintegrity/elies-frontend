import { FiCopy, FiLayers, FiZap, FiTarget, FiExternalLink } from 'react-icons/fi';

// Analysis type configurations for display
export const ANALYSIS_TYPE_CONFIG = {
    single_image_copy_move: { icon: FiCopy, color: 'blue', label: 'Copy-Move (Single)' },
    cross_image_copy_move: { icon: FiLayers, color: 'indigo', label: 'Copy-Move (Cross)' },
    trufor: { icon: FiZap, color: 'amber', label: 'Manipulation Detection' },
    provenance: { icon: FiTarget, color: 'purple', label: 'Provenance' },
    screening_tool: { icon: FiExternalLink, color: 'gray', label: 'Screening Tool' },
};

// Status configurations
export const STATUS_CONFIG = {
    pending: { color: 'amber', label: 'Pending' },
    processing: { color: 'blue', label: 'Processing' },
    completed: { color: 'green', label: 'Completed' },
    failed: { color: 'red', label: 'Failed' },
};

// Color utility
export const COLOR_CLASSES = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
