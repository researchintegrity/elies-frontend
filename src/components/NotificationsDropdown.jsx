// src/components/NotificationsDropdown.jsx
/**
 * Notifications Dropdown Component
 * 
 * Displays a dropdown list of notifications when the bell icon is clicked.
 * Shows unread count badge and allows marking notifications as read.
 * 
 * @module NotificationsDropdown
 */
import React, { useState, useRef, useEffect } from 'react';
import {
    FiBell, FiCheck, FiCheckCircle, FiAlertTriangle,
    FiFileText, FiActivity, FiTrash2, FiX
} from 'react-icons/fi';
import { useNotifications } from '../context/NotificationsContext';
import { useLanguage } from '../context/LanguageContext';

// =============================================================================
// Notification Item Component
// =============================================================================
const NotificationItem = ({ notification, onMarkRead, t }) => {
    const isCompleted = notification.status === 'completed';
    const isPdfExtraction = notification.type === 'pdf_extraction';

    // Choose icon based on type and status
    const getIcon = () => {
        if (isCompleted) {
            return <FiCheckCircle className="text-emerald-500" />;
        } else {
            return <FiAlertTriangle className="text-red-500" />;
        }
    };

    const getTypeIcon = () => {
        if (isPdfExtraction) {
            return <FiFileText className="text-indigo-400" />;
        } else {
            return <FiActivity className="text-purple-400" />;
        }
    };

    // Format timestamp
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return t('notifications.justNow');
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        return date.toLocaleDateString();
    };

    return (
        <div
            className={`group flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer
                ${notification.read
                    ? 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    : 'bg-indigo-50/50 dark:bg-indigo-900/20 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                }`}
            onClick={() => !notification.read && onMarkRead(notification.id)}
        >
            {/* Type Icon */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {getTypeIcon()}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                        {notification.title}
                    </span>
                    {getIcon()}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {notification.message}
                </p>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">
                    {formatTime(notification.timestamp)}
                </span>
            </div>

            {/* Unread indicator */}
            {!notification.read && (
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-2" />
            )}
        </div>
    );
};

// =============================================================================
// Main Dropdown Component
// =============================================================================
const NotificationsDropdown = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, isPolling } = useNotifications();
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on escape
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2.5 rounded-xl transition-all duration-200 border
                    ${isOpen
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700'
                        : 'bg-gray-100/80 dark:bg-dark-card/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-card hover:text-gray-700 dark:hover:text-white border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                    }`}
            >
                <FiBell className="w-5 h-5" />

                {/* Polling Active Indicator - Pulsing Green Dot */}
                {isPolling && unreadCount === 0 && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-gray-900">
                        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75"></span>
                    </span>
                )}

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-dark-deep">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute top-[calc(100%+8px)] right-0 w-80 sm:w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FiBell className="text-indigo-500" />
                            {t('notifications.title')}
                            {unreadCount > 0 && (
                                <span className="text-xs font-normal text-gray-500">
                                    ({unreadCount} {t('notifications.unread')})
                                </span>
                            )}
                        </h3>

                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="p-1.5 text-xs text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    title={t('notifications.markAllRead')}
                                >
                                    <FiCheck className="w-4 h-4" />
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={clearAll}
                                    className="p-1.5 text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    title={t('notifications.clearAll')}
                                >
                                    <FiTrash2 className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <FiX className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 px-4 text-gray-400 dark:text-gray-500">
                                <FiBell className="w-10 h-10 mb-3 opacity-30" />
                                <p className="text-sm font-medium">{t('notifications.empty')}</p>
                                <p className="text-xs text-center mt-1">{t('notifications.emptyDesc')}</p>
                            </div>
                        ) : (
                            <div className="p-2 space-y-1">
                                {notifications.map(notification => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onMarkRead={markAsRead}
                                        t={t}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationsDropdown;
