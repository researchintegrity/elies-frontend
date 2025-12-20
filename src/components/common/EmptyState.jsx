// src/components/common/EmptyState.jsx
// Flexible empty state component for galleries and lists
import React from 'react';
import { FiImage, FiFileText, FiSearch, FiUploadCloud } from 'react-icons/fi';

// Icon mapping for different contexts
const iconMap = {
    image: FiImage,
    document: FiFileText,
    search: FiSearch,
    default: FiImage
};

/**
 * EmptyState - A responsive empty state placeholder
 * @param {Object} props
 * @param {string} props.title - Main heading text
 * @param {string} props.description - Description text
 * @param {string} props.icon - Icon type: 'image', 'document', 'search', or 'default'
 * @param {string} props.actionLabel - Optional button label
 * @param {Function} props.onAction - Optional button click handler
 * @param {boolean} props.showAction - Whether to show the action button
 * @param {string} props.className - Additional CSS classes
 */
const EmptyState = ({
    title = 'No items found',
    description = 'There are no items to display.',
    icon = 'default',
    actionLabel,
    onAction,
    showAction = true,
    className = ''
}) => {
    const IconComponent = iconMap[icon] || iconMap.default;

    return (
        <div className={`col-span-full flex flex-col items-center justify-center px-6 sm:px-8 py-12 sm:py-20 text-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 ${className}`}>
            {/* Icon container - responsive sizing */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 sm:p-6 rounded-full mb-4 sm:mb-6">
                <IconComponent className="text-3xl sm:text-4xl text-gray-400 dark:text-gray-500" />
            </div>

            {/* Title */}
            <h3 className="text-lg sm:text-xl font-bold mb-2 text-gray-900 dark:text-white">
                {title}
            </h3>

            {/* Description */}
            <p className="max-w-md mb-6 sm:mb-8 text-sm sm:text-base text-gray-500 dark:text-gray-400 px-4">
                {description}
            </p>

            {/* Action button */}
            {showAction && actionLabel && onAction && (
                <button
                    className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 text-sm sm:text-base"
                    onClick={onAction}
                >
                    <FiUploadCloud className="text-lg" />
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
