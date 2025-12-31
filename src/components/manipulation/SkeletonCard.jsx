import React from 'react';

const SkeletonCard = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="aspect-square bg-gray-200 dark:bg-gray-700" />
        <div className="p-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
    </div>
);

export default SkeletonCard;
