// src/components/common/SkeletonCard.jsx
// Responsive skeleton loading card for image galleries
import React from 'react';

/**
 * SkeletonCard - A responsive loading placeholder for gallery items
 * @param {Object} props
 * @param {'grid'|'list'} props.variant - Card variant (default: 'grid')
 * @param {string} props.className - Additional CSS classes
 */
const SkeletonCard = ({ variant = 'grid', className = '' }) => {
    if (variant === 'list') {
        return (
            <div className={`flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse ${className}`}>
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
                <div className="hidden sm:flex gap-2">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                </div>
            </div>
        );
    }

    // Default grid variant
    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 ${className}`}>
            {/* Image placeholder - responsive aspect ratio */}
            <div className="w-full aspect-[4/3] bg-gray-200 dark:bg-gray-700 animate-pulse" />

            {/* Content placeholder */}
            <div className="p-3 sm:p-4 space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                <div className="flex gap-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse" />
                </div>
            </div>
        </div>
    );
};

/**
 * SkeletonGrid - Renders multiple skeleton cards in a responsive grid
 * @param {Object} props
 * @param {number} props.count - Number of skeleton cards to render (default: 6)
 * @param {'grid'|'list'} props.variant - Card variant
 * @param {string} props.className - Additional CSS classes for the container
 */
export const SkeletonGrid = ({ count = 6, variant = 'grid', className = '' }) => {
    const skeletons = Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} variant={variant} />
    ));

    if (variant === 'list') {
        return <div className={`space-y-3 ${className}`}>{skeletons}</div>;
    }

    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 ${className}`}>
            {skeletons}
        </div>
    );
};

export default SkeletonCard;
