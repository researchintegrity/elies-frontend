// src/components/annotation/LabelsPanel.jsx
/**
 * Labels Panel Component
 * 
 * A side panel for managing labels and viewing/editing annotations.
 * Similar to Label Studio's regions panel.
 */
import React, { useState } from 'react';
import {
    FiTag,
    FiTrash2,
    FiEdit2,
    FiChevronDown,
    FiChevronRight,
    FiEye,
    FiEyeOff,
    FiPlus,
    FiCheck,
    FiX,
    FiLayers,
    FiCopy,
    FiSquare,
    FiCircle,
    FiEdit3,
} from 'react-icons/fi';
import { useAnnotation, ShapeTypes } from '../../context/AnnotationContext';
import { useLanguage } from '../../context/LanguageContext';

// Shape icon mapping
const ShapeIcon = ({ type, size = 14 }) => {
    switch (type) {
        case ShapeTypes.RECTANGLE:
            return <FiSquare size={size} />;
        case ShapeTypes.ELLIPSE:
            return <FiCircle size={size} />;
        case ShapeTypes.POLYGON:
            return <FiEdit3 size={size} />;
        default:
            return <FiSquare size={size} />;
    }
};

// Single Annotation Item
const AnnotationItem = ({ annotation, isSelected, onSelect, onDelete, onEditLabel, t }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(annotation.description || '');
    
    const handleSaveEdit = () => {
        onEditLabel(annotation.id, { description: editText });
        setIsEditing(false);
    };
    
    return (
        <div
            onClick={() => onSelect(annotation.id)}
            className={`
                group relative p-3 rounded-lg cursor-pointer transition-all duration-150
                ${isSelected 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-400 dark:border-indigo-600 shadow-sm' 
                    : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                }
            `}
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                {/* Shape Icon with Label Color */}
                <div 
                    className="w-7 h-7 rounded-md flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: annotation.label?.color || '#EF4444' }}
                >
                    <ShapeIcon type={annotation.type} size={14} />
                </div>
                
                {/* Label Name */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {annotation.label?.name || 'Unknown'}
                        </span>
                        {annotation.groupId && (
                            <span 
                                className="px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white"
                                style={{ backgroundColor: annotation.label?.color || '#3B82F6' }}
                            >
                                G{annotation.groupId}
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {annotation.type}
                    </span>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }}
                        className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500"
                        title={t('common.edit')}
                    >
                        <FiEdit2 size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(annotation.id); }}
                        className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-500"
                        title={t('common.delete')}
                    >
                        <FiTrash2 size={14} />
                    </button>
                </div>
            </div>
            
            {/* Description / Edit */}
            {isEditing ? (
                <div className="mt-2" onClick={e => e.stopPropagation()}>
                    <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        placeholder={t('annotation.placeholder')}
                        className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        rows={2}
                        autoFocus
                    />
                    <div className="flex justify-end gap-1 mt-1">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500"
                        >
                            <FiX size={14} />
                        </button>
                        <button
                            onClick={handleSaveEdit}
                            className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                            <FiCheck size={14} />
                        </button>
                    </div>
                </div>
            ) : annotation.description ? (
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                    {annotation.description}
                </p>
            ) : null}
        </div>
    );
};

// Label Filter Button
const LabelFilter = ({ label, isActive, count, onClick }) => (
    <button
        onClick={onClick}
        className={`
            flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all
            ${isActive 
                ? 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-800' 
                : 'opacity-70 hover:opacity-100'
            }
        `}
        style={{ 
            backgroundColor: `${label.color}20`, 
            color: label.color,
            ringColor: label.color,
        }}
    >
        <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: label.color }}
        />
        <span>{label.name}</span>
        <span className="px-1 bg-white/50 dark:bg-black/20 rounded">
            {count}
        </span>
    </button>
);

// Main Panel Component
const LabelsPanel = ({ onClose }) => {
    const { t } = useLanguage();
    const { state, actions } = useAnnotation();
    const { annotations, selectedId, availableLabels, nextGroupId, activeLabel } = state;
    
    const [filterLabel, setFilterLabel] = useState(null);
    const [isAddingLabel, setIsAddingLabel] = useState(false);
    const [newLabelName, setNewLabelName] = useState('');
    const [newLabelColor, setNewLabelColor] = useState('#6366F1');
    
    // Filter annotations by label
    const filteredAnnotations = filterLabel 
        ? annotations.filter(a => a.label?.id === filterLabel)
        : annotations;
    
    // Count annotations per label
    const labelCounts = availableLabels.reduce((acc, label) => {
        acc[label.id] = annotations.filter(a => a.label?.id === label.id).length;
        return acc;
    }, {});
    
    // Handle add new label
    const handleAddLabel = () => {
        if (!newLabelName.trim()) return;
        
        const newLabel = {
            id: newLabelName.toLowerCase().replace(/\s+/g, '-'),
            name: newLabelName.trim(),
            color: newLabelColor,
        };
        
        actions.addLabel(newLabel);
        setNewLabelName('');
        setIsAddingLabel(false);
    };
    
    // Handle update annotation
    const handleUpdateAnnotation = (id, updates) => {
        actions.updateAnnotation({ id, ...updates });
    };
    
    // Handle delete annotation
    const handleDeleteAnnotation = (id) => {
        if (confirm(t('common.confirm'))) {
            actions.deleteAnnotation(id);
        }
    };
    
    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <FiLayers className="text-indigo-600" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                        {t('annotation.listTitle')}
                    </h3>
                    <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
                        {annotations.length}
                    </span>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                    >
                        <FiX size={18} />
                    </button>
                )}
            </div>
            
            {/* Label Filters */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                    <FiTag className="text-gray-400" size={14} />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('annotation.filterByLabel')}
                    </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <button
                        onClick={() => setFilterLabel(null)}
                        className={`
                            px-2 py-1 rounded-full text-xs font-medium transition-all
                            ${!filterLabel 
                                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                            }
                        `}
                    >
                        All ({annotations.length})
                    </button>
                    {availableLabels.map(label => (
                        <LabelFilter
                            key={label.id}
                            label={label}
                            isActive={filterLabel === label.id}
                            count={labelCounts[label.id] || 0}
                            onClick={() => setFilterLabel(filterLabel === label.id ? null : label.id)}
                        />
                    ))}
                </div>
            </div>
            
            {/* Active Label Selector (for new annotations) */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('annotation.activeLabel')}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={activeLabel?.id || ''}
                        onChange={(e) => {
                            const label = availableLabels.find(l => l.id === e.target.value);
                            if (label) actions.setActiveLabel(label);
                        }}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {availableLabels.map(label => (
                            <option key={label.id} value={label.id}>
                                {label.name}
                            </option>
                        ))}
                    </select>
                    <div 
                        className="w-8 h-8 rounded-lg border-2 border-white shadow-md"
                        style={{ backgroundColor: activeLabel?.color || '#EF4444' }}
                    />
                </div>
                
                {/* Group ID for copy-move */}
                {activeLabel?.id === 'copy-move' && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="flex items-center gap-2">
                            <FiCopy className="text-blue-500" size={14} />
                            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                {t('annotation.groupId')}: {nextGroupId}
                            </span>
                            <button
                                onClick={actions.incrementGroupId}
                                className="ml-auto text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200"
                            >
                                Next Group
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Annotations List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredAnnotations.length === 0 ? (
                    <div className="text-center py-8">
                        <FiEdit3 className="mx-auto text-gray-300 dark:text-gray-600 mb-2" size={32} />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('annotation.noAnnotations')}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {t('annotation.drawRegionHint')}
                        </p>
                    </div>
                ) : (
                    filteredAnnotations.map(annotation => (
                        <AnnotationItem
                            key={annotation.id}
                            annotation={annotation}
                            isSelected={selectedId === annotation.id}
                            onSelect={actions.selectAnnotation}
                            onDelete={handleDeleteAnnotation}
                            onEditLabel={handleUpdateAnnotation}
                            t={t}
                        />
                    ))
                )}
            </div>
            
            {/* Add New Label */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                {isAddingLabel ? (
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={newLabelName}
                            onChange={(e) => setNewLabelName(e.target.value)}
                            placeholder="Label name..."
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                        />
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={newLabelColor}
                                onChange={(e) => setNewLabelColor(e.target.value)}
                                className="w-10 h-10 rounded cursor-pointer"
                            />
                            <div className="flex-1 flex justify-end gap-1">
                                <button
                                    onClick={() => setIsAddingLabel(false)}
                                    className="px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleAddLabel}
                                    disabled={!newLabelName.trim()}
                                    className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {t('common.add')}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAddingLabel(true)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                    >
                        <FiPlus size={16} />
                        <span>{t('annotation.addLabel')}</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default LabelsPanel;
