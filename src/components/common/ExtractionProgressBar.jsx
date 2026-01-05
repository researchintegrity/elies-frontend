import React, { useRef, useEffect } from 'react';
import { FiLoader, FiCheck, FiAlertCircle, FiFile } from 'react-icons/fi';

/**
 * Progress bar component for PDF extraction.
 * Shows current progress with animated bar and status text.
 * 
 * Props:
 *   status: ExtractionStatus object from useExtractionProgress hook
 *   onComplete: Optional callback when extraction completes
 */
const ExtractionProgressBar = ({ status, onComplete }) => {
    const {
        total_documents = 0,
        completed_documents = 0,
        processing_documents = 0,
        failed_documents = 0,
        total_extracted = 0,
        progress_percent = 0,
        current_step = '',
        status: jobStatus = 'pending',
        documents = []
    } = status || {};

    const isComplete = jobStatus === 'completed' || jobStatus === 'partial';
    const isFailed = jobStatus === 'failed';

    // Create a unique ID for this extraction job based on document IDs
    const jobIdentifier = documents.map(d => d.id).sort().join(',');

    // Track which jobs we've already called onComplete for
    const completedJobRef = useRef(null);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    // Call onComplete only once when status changes to complete
    useEffect(() => {
        if (isComplete && status && jobIdentifier && completedJobRef.current !== jobIdentifier) {
            completedJobRef.current = jobIdentifier;
            if (onCompleteRef.current) {
                onCompleteRef.current(status);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isComplete, jobIdentifier]);

    if (!status) return null;

    // Status colors - use red theme for PDFs
    const getStatusColor = () => {
        if (isFailed) return 'red';
        if (isComplete && failed_documents > 0) return 'yellow';
        if (isComplete) return 'green';
        return 'red'; // Use red for PDFs in progress
    };

    const color = getStatusColor();
    const colorMap = {
        red: {
            bg: 'bg-red-500',
            bgLight: 'bg-red-500/10',
            text: 'text-red-500',
            border: 'border-red-500/20'
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
        if (isFailed) return 'Extraction Failed';
        if (isComplete && failed_documents > 0) return 'Partially Complete';
        if (isComplete) return 'Extraction Complete';
        if (processing_documents > 0) return 'Extracting Images';
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
                        {completed_documents} / {total_documents}
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
                        <FiFile className="text-green-500" />
                        <span className="text-gray-600 dark:text-gray-300">
                            {total_extracted} images extracted
                        </span>
                    </div>
                    {failed_documents > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                            <FiAlertCircle className="text-red-500" />
                            <span className="text-gray-600 dark:text-gray-300">
                                {failed_documents} failed
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ExtractionProgressBar;
