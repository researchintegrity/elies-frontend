import React from 'react';
import PropTypes from 'prop-types';

const TabButton = ({ icon: IconComponent, label, isActive, onClick, count }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all
      ${isActive
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
    >
        <IconComponent size={16} />
        {label}
        {count !== undefined && count > 0 && (
            <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${isActive ? 'bg-red-200 dark:bg-red-800' : 'bg-gray-200 dark:bg-gray-700'}`}>
                {count}
            </span>
        )}
    </button>
);

TabButton.propTypes = {
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired,
    isActive: PropTypes.bool.isRequired,
    onClick: PropTypes.func.isRequired,
    count: PropTypes.number
};

export { TabButton };
