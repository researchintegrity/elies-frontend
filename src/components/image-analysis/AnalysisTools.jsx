import React from 'react';
import { ANALYSIS_TOOLS } from '../../constants/analysisTools';

// Tool Button Component
const ToolButton = ({ tool, isSelected, onClick, t }) => {
    const Icon = tool.icon;
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${isSelected
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            title={t ? t(`analysis.tools.${tool.id}.description`) : tool.description}
        >
            <Icon size={16} />
            <span>{t ? t(`analysis.tools.${tool.id}`) : tool.name}</span>
        </button>
    );
};

const AnalysisTools = ({ selectedTool, onSelectTool, t }) => {
    const toolList = Object.values(ANALYSIS_TOOLS);

    return (
        <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 px-2">
                {toolList.map((tool) => (
                    <ToolButton
                        key={tool.id}
                        tool={tool}
                        isSelected={selectedTool === tool.id}
                        onClick={() => onSelectTool(tool.id)}
                        t={t}
                    />
                ))}
            </div>
        </div>
    );
};

export default AnalysisTools;
