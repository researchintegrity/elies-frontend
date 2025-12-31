// src/components/analysis/StatusBadge.jsx
/**
 * Analysis status badge component
 * Displays the analysis status with appropriate icon and color
 */

import React from 'react';
import { STATUS_CONFIG, COLOR_CLASSES } from './analysisConfig';

const StatusBadge = ({ status, t, compact = false }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 ${compact ? 'px-2 py-0.5' : 'px-2.5 py-1'} rounded-full text-xs font-medium ${COLOR_CLASSES[config.color]}`}>
            <Icon size={compact ? 10 : 12} className={config.animate ? 'animate-spin' : ''} />
            {t(config.labelKey) || status}
        </span>
    );
};

export default StatusBadge;
