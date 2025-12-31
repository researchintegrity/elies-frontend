import React from 'react';
import PropTypes from 'prop-types';
import { FiEye, FiPlay } from 'react-icons/fi';
import { ANALYSIS_TYPE_CONFIG, STATUS_CONFIG, COLOR_CLASSES } from './constants';

const AnalysisRow = ({ analysis, onViewResults, onReproduce, t, locale }) => {
    const config = ANALYSIS_TYPE_CONFIG[analysis.type] || ANALYSIS_TYPE_CONFIG.screening_tool;
    const statusConfig = STATUS_CONFIG[analysis.status] || STATUS_CONFIG.pending;
    const Icon = config.icon;

    return (
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
            {/* Type Icon */}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${COLOR_CLASSES[config.color]}`}>
                <Icon size={18} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {config.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(analysis.created_at).toLocaleString(locale)}
                </p>
            </div>

            {/* Status Badge */}
            <span className={`px-2 py-1 text-[10px] font-medium rounded-full ${COLOR_CLASSES[statusConfig.color]}`}>
                {statusConfig.label}
            </span>

            {/* Actions */}
            {analysis.status === 'completed' && (
                <button
                    onClick={() => onViewResults(analysis)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    title={t('flagged.viewResults') || 'View Results'}
                >
                    <FiEye size={16} />
                </button>
            )}
            <button
                onClick={() => onReproduce(analysis)}
                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                title={t('flagged.reproduce') || 'Reproduce'}
            >
                <FiPlay size={16} />
            </button>
        </div>
    );
};

AnalysisRow.propTypes = {
    analysis: PropTypes.object.isRequired,
    onViewResults: PropTypes.func.isRequired,
    onReproduce: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
    locale: PropTypes.string
};

export default AnalysisRow;
