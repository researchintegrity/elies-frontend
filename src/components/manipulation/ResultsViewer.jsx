import React, { useState, useEffect } from 'react';
import { FiAlertCircle, FiCheck, FiDownload, FiInfo, FiLoader } from 'react-icons/fi';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';

const ResultsViewer = ({ analysisId, status, results, statusMessage }) => {
    const { t } = useLanguage();
    const [predMapUrl, setPredMapUrl] = useState(null);
    const [confMapUrl, setConfMapUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const hasPredMap = results?.pred_map;
    const hasConfMap = results?.conf_map;
    const hasResults = hasPredMap || hasConfMap || (results?.files && results.files.length > 0);

    useEffect(() => {
        // Track URLs created in this effect run for proper cleanup
        let predUrl = null;
        let confUrl = null;
        let isCancelled = false;

        // Reset state when dependencies change
        setPredMapUrl(null);
        setConfMapUrl(null);
        setError(null);

        if (status !== 'completed' || !results) return;
        if (!hasResults) { setLoading(false); return; }

        setLoading(true);
        const loadResults = async () => {
            const errors = [];

            // Load prediction map
            if (hasPredMap || results?.files?.some(f => f.includes('_pred_map'))) {
                try {
                    const blob = await api.download(`/analyses/${analysisId}/results/pred_map/download`);
                    if (!isCancelled) {
                        predUrl = URL.createObjectURL(blob);
                        setPredMapUrl(predUrl);
                    }
                } catch (err) {
                    console.error('Failed to download pred_map:', err);
                    errors.push(`Prediction Map: ${err.message}`);
                }
            }

            // Load confidence map
            if (hasConfMap || results?.files?.some(f => f.includes('_conf_map'))) {
                try {
                    const blob = await api.download(`/analyses/${analysisId}/results/conf_map/download`);
                    if (!isCancelled) {
                        confUrl = URL.createObjectURL(blob);
                        setConfMapUrl(confUrl);
                    }
                } catch (err) {
                    console.error('Failed to download conf_map:', err);
                    errors.push(`Confidence Map: ${err.message}`);
                }
            }

            if (!isCancelled) {
                // Only set error if both failed
                if (errors.length > 0 && !predUrl && !confUrl) {
                    setError(errors.join('; '));
                }
                setLoading(false);
            }
        };
        loadResults();

        return () => {
            isCancelled = true;
            if (predUrl) URL.revokeObjectURL(predUrl);
            if (confUrl) URL.revokeObjectURL(confUrl);
        };
    }, [status, results, analysisId, hasConfMap, hasPredMap, hasResults]);

    if (status === 'pending' || status === 'processing') {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-full border-4 border-emerald-100 dark:border-emerald-900/30" />
                    <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
                </div>
                <p className="font-medium text-lg mb-2">{status === 'pending' ? t('manipulation.pending') : t('manipulation.processing')}</p>
                {statusMessage && <p className="text-sm text-gray-400">{statusMessage}</p>}
            </div>
        );
    }

    if (status === 'failed') {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
                <FiAlertCircle className="w-12 h-12 mb-4" />
                <p className="font-medium text-lg">{t('manipulation.failed')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
                <FiAlertCircle className="w-8 h-8 mb-4" />
                <p className="font-medium">{t('manipulation.downloadError')}</p>
                <p className="text-sm mt-2 text-gray-500">{error}</p>
            </div>
        );
    }

    if (status === 'completed' && !hasResults) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                    <FiCheck className="w-8 h-8 text-green-500" />
                </div>
                <p className="font-medium text-lg text-gray-900 dark:text-white">{t('manipulation.noResults')}</p>
            </div>
        );
    }

    // Render single result image with label and download button
    const renderResultImage = (url, title, filename, isLoading) => (
        <div className="flex-1 space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">{title}</h4>
            <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 min-h-[250px] flex items-center justify-center">
                {isLoading ? (
                    <div className="flex flex-col items-center py-12 text-gray-500">
                        <FiLoader className="w-6 h-6 animate-spin mb-2" />
                        <span className="text-sm">{t('manipulation.loadingResults')}</span>
                    </div>
                ) : url ? (
                    <img src={url} alt={title} className="w-full h-auto" />
                ) : (
                    <span className="text-gray-400 text-sm">{t('manipulation.noVisualization')}</span>
                )}
            </div>
            {url && (
                <div className="flex justify-center">
                    <a href={url} download={filename} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        <FiDownload size={16} />{t('manipulation.downloadResult')}
                    </a>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Two-column layout for the result images */}
            <div className="flex gap-6">
                {renderResultImage(
                    predMapUrl,
                    t('manipulation.predictionMap'),
                    `trufor_pred_map_${analysisId}.png`,
                    loading && !predMapUrl
                )}
                {renderResultImage(
                    confMapUrl,
                    t('manipulation.confidenceMap'),
                    `trufor_conf_map_${analysisId}.png`,
                    loading && !confMapUrl
                )}
            </div>

            {/* Legend/Help text */}
            <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                    <FiInfo className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p className="font-medium text-gray-900 dark:text-white mb-1">{t('manipulation.resultLegendTitle')}</p>
                        <ul className="space-y-1 text-xs">
                            <li><strong>{t('manipulation.predictionMap')}:</strong> {t('manipulation.predictionMapDesc')}</li>
                            <li><strong>{t('manipulation.confidenceMap')}:</strong> {t('manipulation.confidenceMapDesc')}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultsViewer;
