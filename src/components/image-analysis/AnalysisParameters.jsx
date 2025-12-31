import React from 'react';
import { ANALYSIS_TOOLS } from '../../constants/analysisTools';

// Parameter Slider
const ParamSlider = ({ label, value, min, max, step = 1, unit = '', onChange }) => (
    <div className="space-y-1">
        <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                {value}{unit}
            </span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
    </div>
);

// Parameter Checkbox
const ParamCheckbox = ({ label, checked, onChange }) => (
    <label className="flex items-center gap-2 cursor-pointer">
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
    </label>
);

const AnalysisParameters = ({ selectedTool, params, setParams, t }) => {

    const renderParameters = () => {
        switch (selectedTool) {
            case 'ela':
                return (
                    <div className="space-y-4">
                        <ParamSlider
                            label={t('analysis.params.jpegQuality') || 'JPEG Quality'}
                            value={params.elaQuality}
                            min={50}
                            max={99}
                            onChange={(v) => setParams(p => ({ ...p, elaQuality: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.errorScale') || 'Error Scale'}
                            value={params.elaScale}
                            min={1}
                            max={50}
                            onChange={(v) => setParams(p => ({ ...p, elaScale: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.opacity') || 'Opacity'}
                            value={params.elaOpacity}
                            min={0}
                            max={100}
                            unit="%"
                            onChange={(v) => setParams(p => ({ ...p, elaOpacity: v }))}
                        />
                    </div>
                );

            case 'noise':
                return (
                    <div className="space-y-4">
                        <ParamSlider
                            label={t('analysis.params.noiseAmplitude') || 'Noise Amplitude'}
                            value={params.noiseAmplitude}
                            min={1}
                            max={100}
                            onChange={(v) => setParams(p => ({ ...p, noiseAmplitude: v }))}
                        />
                        <ParamCheckbox
                            label={t('analysis.params.equalizeHistogram') || 'Equalize Histogram'}
                            checked={params.noiseEqualize}
                            onChange={(v) => setParams(p => ({ ...p, noiseEqualize: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.opacity') || 'Opacity'}
                            value={params.noiseOpacity}
                            min={0}
                            max={100}
                            unit="%"
                            onChange={(v) => setParams(p => ({ ...p, noiseOpacity: v }))}
                        />
                    </div>
                );

            case 'gradient':
                return (
                    <div className="space-y-4">
                        <ParamCheckbox
                            label={t('analysis.params.equalizeHistogram') || 'Equalize Histogram'}
                            checked={params.gradientEqualize}
                            onChange={(v) => setParams(p => ({ ...p, gradientEqualize: v }))}
                        />
                        <ParamCheckbox
                            label={t('analysis.params.normalize') || 'Normalize'}
                            checked={params.gradientNormalize}
                            onChange={(v) => setParams(p => ({ ...p, gradientNormalize: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.intensity') || 'Intensity'}
                            value={params.gradientIntensity}
                            min={1}
                            max={20}
                            step={0.1}
                            onChange={(v) => setParams(p => ({ ...p, gradientIntensity: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.opacity') || 'Opacity'}
                            value={params.gradientOpacity}
                            min={0}
                            max={100}
                            unit="%"
                            onChange={(v) => setParams(p => ({ ...p, gradientOpacity: v }))}
                        />

                    </div>
                );

            case 'levelSweep':
                return (
                    <div className="space-y-4">
                        <ParamSlider
                            label={t('analysis.params.sweep') || 'Sweep'}
                            value={Math.round(params.sweepPosition * 100)}
                            min={0}
                            max={100}
                            unit="%"
                            onChange={(v) => setParams(p => ({ ...p, sweepPosition: v / 100 }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.width') || 'Width'}
                            value={params.sweepWidth}
                            min={8}
                            max={128}
                            onChange={(v) => setParams(p => ({ ...p, sweepWidth: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.opacity') || 'Opacity'}
                            value={params.sweepOpacity}
                            min={0}
                            max={100}
                            unit="%"
                            onChange={(v) => setParams(p => ({ ...p, sweepOpacity: v }))}
                        />
                    </div>
                );

            case 'cloneDetection':
                return (
                    <div className="space-y-4">
                        <ParamSlider
                            label={t('analysis.params.minSimilarity') || 'Minimal Similarity'}
                            value={params.cloneMinSimilarity}
                            min={0.1}
                            max={1}
                            step={0.01}
                            onChange={(v) => setParams(p => ({ ...p, cloneMinSimilarity: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.minDetail') || 'Minimal Detail'}
                            value={params.cloneMinDetail}
                            min={0}
                            max={0.5}
                            step={0.01}
                            onChange={(v) => setParams(p => ({ ...p, cloneMinDetail: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.minClusterSize') || 'Minimal Cluster Size'}
                            value={params.cloneMinClusterSize}
                            min={1}
                            max={32}
                            onChange={(v) => setParams(p => ({ ...p, cloneMinClusterSize: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.blockSize') || 'Block Size'}
                            value={params.cloneBlockSize}
                            min={2}
                            max={16}
                            onChange={(v) => setParams(p => ({ ...p, cloneBlockSize: v }))}
                        />
                        <ParamSlider
                            label={t('analysis.params.maxImageSize') || 'Maximal Image Size'}
                            value={params.cloneMaxImageSize}
                            min={256}
                            max={2048}
                            step={64}
                            unit="px"
                            onChange={(v) => setParams(p => ({ ...p, cloneMaxImageSize: v }))}
                        />
                        <ParamCheckbox
                            label={t('analysis.params.showQuantized') || 'Show Quantized Image'}
                            checked={params.cloneShowQuantized}
                            onChange={(v) => setParams(p => ({ ...p, cloneShowQuantized: v }))}
                        />
                    </div>
                );

            default:
                return (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        {t('analysis.noParams') || 'No adjustable parameters'}
                    </p>
                );
        }
    };


    return (
        <div className="h-full flex flex-col">
            <div className="flex-none p-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t('analysis.parameters') || 'Parameters'}
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-3">
                    {renderParameters()}
                </div>
            </div>

            <div className="flex-none p-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t(`analysis.tools.${selectedTool}.description`) || ANALYSIS_TOOLS[selectedTool]?.description}
                </p>
            </div>
        </div>
    );
};

export default AnalysisParameters;
