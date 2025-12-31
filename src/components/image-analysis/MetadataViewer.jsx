import React from 'react';

const MetadataViewer = ({ metadata }) => {
    if (!metadata) return null;

    return (
        <div className="grid grid-cols-2 gap-3 p-4">
            {Object.entries(metadata).map(([key, value]) => (
                <div key={key} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <span className="block text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">{key}</span>
                    <span className="font-medium text-gray-900 dark:text-white text-sm break-all">{value}</span>
                </div>
            ))}
        </div>
    );
};

export default MetadataViewer;
