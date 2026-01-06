// src/context/NotificationsContext.jsx
/**
 * Global Notifications Context
 * 
 * Provides notification state management for worker process completion alerts.
 * Tracks PDF extraction and analysis task completions.
 * 
 * @module NotificationsContext
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

// =============================================================================
// Constants
// =============================================================================
const POLLING_INTERVAL = 15000; // 15 seconds
const MAX_NOTIFICATIONS = 50; // Maximum notifications to store

// =============================================================================
// Context Definition
// =============================================================================
const NotificationsContext = createContext(null);

/**
 * Hook to access notifications context.
 * @returns {Object} Notifications context value
 */
export const useNotifications = () => {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
};

// =============================================================================
// Provider Component
// =============================================================================
export const NotificationsProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();

    // --- State ---
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isPolling, setIsPolling] = useState(true);

    // Track previous states to detect changes
    const prevDocumentsRef = useRef(new Map()); // docId -> extraction_status
    const prevAnalysesRef = useRef(new Map()); // analysisId -> status

    // ==========================================================================
    // Notification Management
    // ==========================================================================

    /**
     * Add a new notification.
     * @param {Object} notification - Notification object
     * @param {string} notification.type - 'pdf_extraction' | 'analysis'
     * @param {string} notification.status - 'completed' | 'failed'
     * @param {string} notification.title - Notification title
     * @param {string} notification.message - Notification message
     */
    const addNotification = useCallback((notification) => {
        const newNotification = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            read: false,
            ...notification
        };

        setNotifications(prev => {
            const updated = [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS);
            return updated;
        });

        setUnreadCount(prev => prev + 1);
    }, []);

    /**
     * Mark a notification as read.
     * @param {string} notificationId - Notification ID
     */
    const markAsRead = useCallback((notificationId) => {
        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, []);

    /**
     * Mark all notifications as read.
     */
    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    }, []);

    /**
     * Clear all notifications.
     */
    const clearAll = useCallback(() => {
        setNotifications([]);
        setUnreadCount(0);
    }, []);

    // ==========================================================================
    // Polling Logic
    // ==========================================================================

    /**
     * Check for document extraction status changes.
     */
    const checkDocumentUpdates = useCallback(async () => {
        try {
            // Use paginated API format (per_page max is 24 on backend)
            const response = await api.get('/documents', { page: 1, per_page: 24 });
            console.log(response);
            // Backend returns { items: [...], total, page, ... }
            const data = response?.items || [];
            if (!Array.isArray(data)) return;

            const currentDocs = new Map();

            data.forEach(doc => {
                const docId = doc._id;
                const status = doc.extraction_status;
                currentDocs.set(docId, status);

                // Check if this document changed from processing/pending to completed/failed
                const prevStatus = prevDocumentsRef.current.get(docId);

                if (prevStatus && (prevStatus === 'processing' || prevStatus === 'pending')) {
                    if (status === 'completed') {
                        addNotification({
                            type: 'pdf_extraction',
                            status: 'completed',
                            title: 'PDF Processado',
                            message: `"${doc.filename}" foi processado com sucesso.`,
                            documentId: docId,
                            filename: doc.filename
                        });
                    } else if (status === 'failed') {
                        addNotification({
                            type: 'pdf_extraction',
                            status: 'failed',
                            title: 'Falha no Processamento',
                            message: `Erro ao processar "${doc.filename}".`,
                            documentId: docId,
                            filename: doc.filename
                        });
                    }
                }
            });

            prevDocumentsRef.current = currentDocs;
        } catch (err) {
            console.warn('Error checking document updates:', err);
        }
    }, [addNotification]);

    /**
     * Check for analysis status changes.
     */
    const checkAnalysisUpdates = useCallback(async () => {
        try {
            // Fetch recent analyses (processing and recently completed)
            const [processingRes, recentRes] = await Promise.all([
                api.listAnalyses({ status: 'processing', per_page: 20 }),
                api.listAnalyses({ per_page: 30, sort_by: 'updated_at', order: 'desc' })
            ]);

            const processingAnalyses = processingRes?.data || [];
            const recentAnalyses = recentRes?.data || [];

            // Combine and deduplicate
            const allAnalyses = [...processingAnalyses];
            recentAnalyses.forEach(a => {
                if (!allAnalyses.find(x => x._id === a._id)) {
                    allAnalyses.push(a);
                }
            });

            const currentAnalyses = new Map();

            // Analysis type labels
            const typeLabels = {
                'single_image_copy_move': 'Copy-Move',
                'cross_image_copy_move': 'Copy-Move Cross',
                'trufor': 'TruFor',
                'provenance': 'Provenance',
                'screening_tool': 'Screening Tool'
            };

            allAnalyses.forEach(analysis => {
                const analysisId = analysis._id;
                const status = analysis.status;
                currentAnalyses.set(analysisId, status);

                // Check if this analysis changed from processing/pending to completed/failed
                const prevStatus = prevAnalysesRef.current.get(analysisId);

                if (prevStatus && (prevStatus === 'processing' || prevStatus === 'pending')) {
                    const typeName = typeLabels[analysis.analysis_type] || analysis.analysis_type;

                    if (status === 'completed') {
                        addNotification({
                            type: 'analysis',
                            status: 'completed',
                            title: `${typeName} Concluído`,
                            message: `Análise ${typeName} foi concluída com sucesso.`,
                            analysisId: analysisId,
                            analysisType: analysis.analysis_type
                        });
                    } else if (status === 'failed') {
                        addNotification({
                            type: 'analysis',
                            status: 'failed',
                            title: `${typeName} Falhou`,
                            message: `Erro na análise ${typeName}.`,
                            analysisId: analysisId,
                            analysisType: analysis.analysis_type
                        });
                    }
                }
            });

            prevAnalysesRef.current = currentAnalyses;
        } catch (err) {
            console.warn('Error checking analysis updates:', err);
        }
    }, [addNotification]);

    /**
     * Run all checks.
     */
    const checkForUpdates = useCallback(async () => {
        if (!isAuthenticated) return;

        await Promise.all([
            checkDocumentUpdates(),
            checkAnalysisUpdates()
        ]);
    }, [isAuthenticated, checkDocumentUpdates, checkAnalysisUpdates]);

    // ==========================================================================
    // Polling Effect
    // ==========================================================================

    useEffect(() => {
        if (!isAuthenticated || !isPolling) return;

        // Initial check
        checkForUpdates();

        // Set up interval
        const interval = setInterval(checkForUpdates, POLLING_INTERVAL);

        return () => clearInterval(interval);
    }, [isAuthenticated, isPolling, checkForUpdates]);

    // ==========================================================================
    // Context Value
    // ==========================================================================
    const value = {
        notifications,
        unreadCount,
        isPolling,
        setIsPolling,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        checkForUpdates // Manual trigger
    };

    return (
        <NotificationsContext.Provider value={value}>
            {children}
        </NotificationsContext.Provider>
    );
};

export default NotificationsContext;
