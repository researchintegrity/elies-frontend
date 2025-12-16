import React, { useState, useRef, useEffect } from 'react';
import { FiX, FiPlus, FiTag } from 'react-icons/fi';

const TagInput = ({ tags = [], onAdd, onRemove, suggestions = [], readOnly = false, onInputChange }) => {
    const [inputValue, setInputValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef(null);

    // Common scientific/document tags for suggestions
    const defaultSuggestions = [
        'figure', 'table', 'equation', 'diagram',
        'microscopy', 'plot', 'western-blot', 'text',
        'screenshot', 'photo'
    ];

    const allSuggestions = Array.from(new Set([...defaultSuggestions, ...suggestions]));

    const filteredSuggestions = allSuggestions.filter(
        s => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
    );

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            onAdd(inputValue.trim().toLowerCase());
            setInputValue('');
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            onRemove(tags[tags.length - 1]);
        }
    };

    const handleSuggestionClick = (tag) => {
        onAdd(tag);
        setInputValue('');
        inputRef.current?.focus();
    };

    return (
        <div className={`w-full ${readOnly ? '' : 'group'}`}>
            <div className={`flex flex-wrap items-center gap-2 p-2 rounded-lg border transition-all duration-200 ${isFocused
                ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-gray-800'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800'
                }`}
                onClick={() => !readOnly && inputRef.current?.focus()}
            >
                {tags.length === 0 && !isFocused && (
                    <div className="text-gray-400 text-sm flex items-center gap-2 px-1">
                        <FiTag />
                        <span>Adicionar tags...</span>
                    </div>
                )}

                {tags.map((tag) => (
                    <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium border border-indigo-100 dark:border-indigo-500/20"
                    >
                        #{tag}
                        {!readOnly && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemove(tag); }}
                                className="hover:text-red-500 p-0.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors"
                            >
                                <FiX size={12} />
                            </button>
                        )}
                    </span>
                ))}

                {!readOnly && (
                    <div className="relative flex-1 min-w-[100px]">
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
                            value={inputValue}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                if (onInputChange) onInputChange(e.target.value);
                            }}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                            placeholder={tags.length > 0 ? "" : ""}
                        />

                        {/* Suggestions Dropdown */}
                        {isFocused && inputValue && filteredSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 mt-2 w-full min-w-[150px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                {filteredSuggestions.map(suggestion => (
                                    <button
                                        key={suggestion}
                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                    >
                                        <FiPlus size={14} /> {suggestion}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TagInput;
