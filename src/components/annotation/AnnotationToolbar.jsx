// src/components/annotation/AnnotationToolbar.jsx
/**
 * Annotation Toolbar Component
 * 
 * A toolbar for selecting annotation tools, labels, and actions.
 * Similar to Label Studio's annotation toolbar.
 */
import React from 'react';
import {
    FiMousePointer,
    FiSquare,
    FiCircle,
    FiEdit3,
    FiTrash2,
    FiRotateCcw,
    FiRotateCw,
    FiZoomIn,
    FiZoomOut,
    FiDownload,
    FiSave,
    FiTag,
} from 'react-icons/fi';
import { useAnnotation, ToolTypes } from '../../context/AnnotationContext';
import { useLanguage } from '../../context/LanguageContext';

const ToolButton = ({ icon: Icon, label, isActive, onClick, disabled, shortcut }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
        className={`
            relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150
            ${isActive
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
    >
        <Icon size={18} />
        {shortcut && (
            <span className="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold px-1 rounded bg-gray-900/70 text-white">
                {shortcut}
            </span>
        )}
    </button>
);

const Divider = () => (
    <div className="w-px h-8 bg-gray-200 dark:bg-gray-600 mx-1" />
);

const AnnotationToolbar = ({
    onSave,
    onExport,
    onZoomIn,
    onZoomOut,
    onFitToScreen,
    zoom = 1,
    isSaving = false,
    hasUnsavedChanges = false,
}) => {
    const { state, actions, computed } = useAnnotation();
    const { t } = useLanguage();
    const { activeTool, isDrawing, activeLabel, availableLabels } = state;
    const { canUndo, canRedo, selectedAnnotation } = computed;

    const tools = [
        { id: ToolTypes.SELECT, icon: FiMousePointer, label: t('annotation.tools.select') || 'Select / Move', shortcut: 'V' },
        { id: ToolTypes.RECTANGLE, icon: FiSquare, label: t('annotation.tools.rectangle') || 'Rectangle', shortcut: 'R' },
        { id: ToolTypes.ELLIPSE, icon: FiCircle, label: t('annotation.tools.ellipse') || 'Ellipse', shortcut: 'E' },
        { id: ToolTypes.POLYGON, icon: FiEdit3, label: t('annotation.tools.polygon') || 'Polygon', shortcut: 'P' },
    ];

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
            {/* Drawing Tools */}
            <div className="flex items-center gap-1">
                {tools.map(tool => (
                    <ToolButton
                        key={tool.id}
                        icon={tool.icon}
                        label={tool.label}
                        shortcut={tool.shortcut}
                        isActive={activeTool === tool.id}
                        onClick={() => actions.setTool(tool.id)}
                        disabled={isDrawing && activeTool !== tool.id}
                    />
                ))}
            </div>

            <Divider />

            {/* Delete */}
            <ToolButton
                icon={FiTrash2}
                label={t('annotation.tools.delete') || 'Delete Selected'}
                shortcut="Del"
                onClick={actions.deleteSelected}
                disabled={!selectedAnnotation}
            />

            <Divider />

            {/* Undo/Redo */}
            <div className="flex items-center gap-1">
                <ToolButton
                    icon={FiRotateCcw}
                    label={t('annotation.actions.undo') || 'Undo'}
                    shortcut="Ctrl+Z"
                    onClick={actions.undo}
                    disabled={!canUndo}
                />
                <ToolButton
                    icon={FiRotateCw}
                    label={t('annotation.actions.redo') || 'Redo'}
                    shortcut="Ctrl+Y"
                    onClick={actions.redo}
                    disabled={!canRedo}
                />
            </div>

            <Divider />

            {/* Label Selector */}
            <div className="flex items-center gap-2">
                <FiTag className="text-gray-400" size={14} />
                <select
                    value={activeLabel?.id || ''}
                    onChange={(e) => {
                        const label = availableLabels.find(l => l.id === e.target.value);
                        if (label) actions.setActiveLabel(label);
                    }}
                    className="px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    {availableLabels.map(label => (
                        <option key={label.id} value={label.id}>
                            {label.name}
                        </option>
                    ))}
                </select>
                <div
                    className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: activeLabel?.color || '#EF4444' }}
                    title={`${t('annotation.labels.current') || 'Current label'}: ${activeLabel?.name}`}
                />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <button
                    onClick={onZoomOut}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
                    title={t('annotation.zoom.out') || 'Zoom Out'}
                >
                    <FiZoomOut size={16} />
                </button>
                <button
                    onClick={onFitToScreen}
                    className={`px-2 py-1 text-xs font-medium rounded ${zoom === 1
                            ? 'bg-indigo-600 text-white'
                            : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
                        }`}
                    title={t('annotation.zoom.fit') || 'Fit to Screen'}
                >
                    Fit
                </button>
                <span className="text-xs text-gray-500 min-w-[40px] text-center">
                    {Math.round(zoom * 100)}%
                </span>
                <button
                    onClick={onZoomIn}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
                    title={t('annotation.zoom.in') || 'Zoom In'}
                >
                    <FiZoomIn size={16} />
                </button>
            </div>

            <Divider />

            {/* Export */}
            <ToolButton
                icon={FiDownload}
                label={t('annotation.actions.export') || 'Export Annotations'}
                onClick={onExport}
                disabled={state.annotations.length === 0}
            />

            {/* Save */}
            <button
                onClick={onSave}
                disabled={isSaving || !hasUnsavedChanges}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${hasUnsavedChanges
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    }
                `}
            >
                {isSaving ? (
                    <span className="animate-spin">⏳</span>
                ) : (
                    <FiSave size={16} />
                )}
                <span>{t('annotation.actions.save') || 'Save'}</span>
            </button>

            {/* Annotation Count */}
            <div className="ml-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400">
                {state.annotations.length} {t('annotation.labels.regions') || 'regions'}
            </div>
        </div>
    );
};

export default AnnotationToolbar;
