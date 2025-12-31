// src/components/analysis/TypeBadge.jsx
/**
 * Analysis type badge component
 * Displays the analysis type with appropriate icon and color
 */

import React from 'react';
import { ANALYSIS_TYPE_CONFIG, SCREENING_TOOL_SUBTYPE_CONFIG, COLOR_CLASSES } from './analysisConfig';

const TypeBadge = ({ type, subtype, t, compact = false }) => {
    // For screening tool analyses, show the subtype with its specific icon/color
    if (type === 'screening_tool' && subtype && SCREENING_TOOL_SUBTYPE_CONFIG[subtype]) {
        const subtypeConfig = SCREENING_TOOL_SUBTYPE_CONFIG[subtype];
        const Icon = subtypeConfig.icon;
        return (
            <span className={`inline-flex items-center gap-1.5 ${compact ? 'px-2 py-0.5' : 'px-2.5 py-1'} rounded-full text-xs font-medium ${COLOR_CLASSES[subtypeConfig.color]}`}>
                <Icon size={compact ? 10 : 12} />
                {subtypeConfig.label}
            </span>
        );
    }

    const config = ANALYSIS_TYPE_CONFIG[type] || ANALYSIS_TYPE_CONFIG.screening_tool;
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 ${compact ? 'px-2 py-0.5' : 'px-2.5 py-1'} rounded-full text-xs font-medium ${COLOR_CLASSES[config.color]}`}>
            <Icon size={compact ? 10 : 12} />
            {t(config.labelKey) || type}
        </span>
    );
};

export default TypeBadge;
