import React, { useRef, useEffect } from 'react';
import { FiLoader, FiCheck, FiAlertCircle, FiImage } from 'react-icons/fi';

/**
 * Sanitize text content for safe rendering.
 * Strips HTML tags and limits length as defense-in-depth.
 */
const sanitizeText = (text, maxLength = 200) => {
    if (typeof text !== 'string') return '';
    // Strip any HTML tags
    const stripped = text.replace(/<[^>]*>/g, '');
    // Limit length to prevent UI overflow
    return stripped.length > maxLength
        ? stripped.substring(0, maxLength) + '...'
        : stripped;
};

/**
 * Progress bar component for batch image indexing.
 * Shows current progress with animated bar and status text.
 * 
 * Props:
 *   status: IndexingJobResponse object from API
 *   onComplete: Optional callback when indexing completes
 */
const IndexingProgressBar = ({ status, onComplete }) => {
    const {
        total_images = 0,
        processed_images = 0,
        indexed_images = 0,
        failed_images = 0,
        progress_percent = 0,
        current_step = '',
        status: jobStatus = 'pending',
        job_id = '',
        errors = []
    } = status || {};

    const isComplete = jobStatus === 'completed' || jobStatus === 'partial';
    const isFailed = jobStatus === 'failed';

    // Track which job_ids we've already called onComplete for
    const completedJobRef = useRef(null);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    // Call onComplete only once when status changes to complete
    useEffect(() => {
        if (isComplete && status && job_id && completedJobRef.current !== job_id) {
            completedJobRef.current = job_id;
            if (onCompleteRef.current) {
                onCompleteRef.current(status);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isComplete, job_id]);

    if (!status) return null;

    // Status colors
    const getStatusColor = () => {
        if (isFailed) return 'red';
        if (isComplete && failed_images > 0) return 'yellow';
        if (isComplete) return 'green';
        return 'primary';
    };

    const color = getStatusColor();
    const colorMap = {
        primary: {
            bg: 'bg-primary-500',
            bgLight: 'bg-primary-500/10',
            text: 'text-primary-500',
            border: 'border-primary-500/20'
        },
        green: {
            bg: 'bg-green-500',
            bgLight: 'bg-green-500/10',
            text: 'text-green-500',
            border: 'border-green-500/20'
        },
        yellow: {
            bg: 'bg-yellow-500',
            bgLight: 'bg-yellow-500/10',
            text: 'text-yellow-500',
            border: 'border-yellow-500/20'
        },
        red: {
            bg: 'bg-red-500',
            bgLight: 'bg-red-500/10',
            text: 'text-red-500',
            border: 'border-red-500/20'
        }
    };

    const colors = colorMap[color];

    // Status icon
    const StatusIcon = () => {
        if (isFailed) return <FiAlertCircle className={`text-xl ${colors.text}`} />;
        if (isComplete) return <FiCheck className={`text-xl ${colors.text}`} />;
        return <FiLoader className={`text-xl ${colors.text} animate-spin`} />;
    };

    // Status label
    const getStatusLabel = () => {
        if (isFailed) return 'Indexing Failed';
        if (isComplete && failed_images > 0) return 'Partially Complete';
        if (isComplete) return 'Indexing Complete';
        if (jobStatus === 'processing') return 'Indexing in Progress';
        return 'Preparing...';
    };

    return (
        <div className={`w-full p-4 rounded-xl border ${colors.border} ${colors.bgLight} 
            transition-all duration-300 animate-fade-in`}>

            {/* Header Row */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${colors.bgLight} flex items-center justify-center`}>
                        <StatusIcon />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                            {getStatusLabel()}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {current_step}
                        </p>
                    </div>
                </div>

                {/* Progress Text */}
                <div className="text-right">
                    <p className={`font-bold ${colors.text} text-lg`}>
                        {Math.round(progress_percent)}%
                    </p>
                    <p className="text-xs text-gray-400">
                        {processed_images} / {total_images}
                    </p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colors.bg} rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${Math.min(100, progress_percent)}%` }}
                />
            </div>

            {/* Stats Row (if complete) */}
            {isComplete && (
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm">
                        <FiImage className="text-green-500" />
                        <span className="text-gray-600 dark:text-gray-300">
                            {indexed_images} indexed
                        </span>
                    </div>
                    {failed_images > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                            <FiAlertCircle className="text-red-500" />
                            <span className="text-gray-600 dark:text-gray-300">
                                {failed_images} failed
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Error messages (if failed) */}
            {isFailed && errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                            Upload failed - Images were not saved
                        </p>
                        <ul className="text-xs text-red-600 dark:text-red-300 space-y-1">
                            {errors.slice(0, 3).map((error, idx) => (
                                <li key={idx}>• {sanitizeText(error)}</li>
                            ))}
                            {errors.length > 3 && (
                                <li className="text-red-400">...and {errors.length - 3} more</li>
                            )}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IndexingProgressBar;
