// src/components/analysis/ParametersDisplay.jsx
/**
 * Analysis parameters display component
 * Shows expandable list of analysis parameters
 */

import React, { useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';

const ParametersDisplay = ({ parameters, sourceImageId, targetImageId, t, defaultExpanded = false }) => {
    const [expanded, setExpanded] = useState(defaultExpanded);

    if (!parameters || Object.keys(parameters).length === 0) {
        return <span className="text-gray-400 text-xs">{t('analysisDashboard.noParameters')}</span>;
    }

    // Build display list
    const regularEntries = Object.entries(parameters).filter(([key]) =>
        key !== 'analysis_subtype' && key !== 'target_image_id' && key !== 'search_image_ids'
    );

    // Prepend Source/Target info
    const displayItems = [];
    if (sourceImageId) {
        displayItems.push({ key: 'Source Image', value: sourceImageId });
    }

    // Check both prop and parameters for target ID
    const effectiveTargetId = targetImageId || parameters.target_image_id;
    if (effectiveTargetId) {
        displayItems.push({ key: 'Target Image', value: effectiveTargetId });
    }

    if (parameters.search_image_ids) {
        // If multiple, join names (limit to first 3)
        const ids = Array.isArray(parameters.search_image_ids)
            ? parameters.search_image_ids
            : String(parameters.search_image_ids).split(',');

        const displayIds = ids.slice(0, 3);
        const hasMore = ids.length > 3;

        const idList = displayIds.map(id => id.trim()).join(', ');
        displayItems.push({
            key: 'Target Images',
            value: idList + (hasMore ? ` (+${ids.length - 3} more)` : '')
        });
    }

    // Add regular params
    regularEntries.forEach(([key, val]) => displayItems.push({ key, value: val }));

    const limit = defaultExpanded ? displayItems.length : 2;
    const finalDisplay = expanded ? displayItems : displayItems.slice(0, limit);

    return (
        <div className="space-y-1">
            {finalDisplay.map((item, idx) => (
                <div key={item.key + idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">{item.key}:</span>
                    <span className="text-gray-900 dark:text-gray-200 font-mono break-all text-right">
                        {typeof item.value === 'boolean' ? (item.value ? 'Yes' : 'No') : String(item.value)}
                    </span>
                </div>
            ))}
            {!defaultExpanded && displayItems.length > 2 && (
                <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-1"
                >
                    {expanded ? t('analysisDashboard.showLess') : t('analysisDashboard.showMore')}
                    <FiChevronDown className={`transition-transform ${expanded ? 'rotate-180' : ''}`} size={12} />
                </button>
            )}
        </div>
    );
};

export default ParametersDisplay;
