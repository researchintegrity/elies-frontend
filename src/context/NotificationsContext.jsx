// src/context/NotificationsContext.jsx
/**
 * Global Notifications Context
 * 
 * Provides real-time notification management using a hybrid approach:
 * 1. Server-Sent Events (SSE) for instant updates (if supported by backend configuration)
 * 2. Polling as a robust fallback to ensure notifications are delivered even if SSE fails
 *    or is blocked by proxies/firewalls.
 * 
 * Connects to /jobs/stream and polls /jobs/stats or /jobs.
 * 
 * @module NotificationsContext
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from './AuthContext';
import { showToast } from '../utils/alert';

// =============================================================================
// Constants
// =============================================================================
const MAX_NOTIFICATIONS = 50;
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const POLL_INTERVAL = 3000;
const STORAGE_KEY = 'elis_notifications';

// Job type labels for notifications (used by SSE and Polling)
const JOB_TYPE_LABELS = {
    'image_extraction': 'Extração de PDF',
    'image_upload': 'Upload de Imagem',
    'panel_extraction': 'Extração de Painel',
    'copy_move_single': 'Copy-Move',
    'copy_move_cross': 'Copy-Move Cross',
    'trufor': 'TruFor',
    'provenance': 'Proveniência',
    'watermark_removal': 'Remoção de Marca D\'água'
};

// =============================================================================
// LocalStorage Helpers (simple & safe)
// =============================================================================

/** Load notifications from localStorage */
const loadFromStorage = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

/** Save notifications to localStorage */
const saveToStorage = (notifications) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {
        // Ignore storage errors (quota exceeded, etc.)
    }
};

/** Clear notifications from localStorage */
const clearStorage = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Ignore
    }
};

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

    // -------------------------------------------------------------------------
    // State - Load from localStorage on init (only once)
    // -------------------------------------------------------------------------
    const [notifications, setNotifications] = useState(() => {
        const stored = loadFromStorage();
        return stored;
    });
    const [unreadCount, setUnreadCount] = useState(() => {
        const stored = loadFromStorage();
        return stored.filter(n => !n.read).length;
    });
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const [isPolling, setIsPolling] = useState(false); // Track if polling is active

    // Refs for SSE management
    const eventSourceRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const reconnectTimeoutRef = useRef(null);

    // Refs for Polling management
    const pollIntervalRef = useRef(null);
    const knownJobStatuses = useRef({}); // Map of job_id -> status

    // Event listeners - used for cross-component communication
    const listenersRef = useRef(new Set());

    // Track previous auth state to detect logout
    const wasAuthenticated = useRef(isAuthenticated);

    // -------------------------------------------------------------------------
    // Persist to localStorage when notifications change
    // -------------------------------------------------------------------------
    useEffect(() => {
        saveToStorage(notifications);
    }, [notifications]);

    // -------------------------------------------------------------------------
    // Clear storage on logout (only on actual logout, not initial load)
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (wasAuthenticated.current && !isAuthenticated) {
            // User actually logged out
            clearStorage();
            setNotifications([]);
            setUnreadCount(0);
            knownJobStatuses.current = {};
        }
        wasAuthenticated.current = isAuthenticated;
    }, [isAuthenticated]);

    // ==========================================================================
    // Event Listener System (for Analysis Dashboard updates)
    // ==========================================================================

    /**
     * Subscribe to job events.
     * @param {Function} callback - Called with (eventType, data) when job events occur
     * @returns {Function} Unsubscribe function
     */
    const subscribeToEvents = useCallback((callback) => {
        listenersRef.current.add(callback);
        return () => listenersRef.current.delete(callback);
    }, []);

    /**
     * Notify all listeners of an event
     */
    const notifyListeners = useCallback((eventType, data) => {
        listenersRef.current.forEach(callback => {
            try {
                callback(eventType, data);
            } catch (err) {
                console.error('Error in event listener:', err);
            }
        });
    }, []);

    // ==========================================================================
    // Notification Management
    // ==========================================================================

    /**
     * Add a new notification.
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
     * Only decrements unreadCount if notification was actually unread.
     */
    const markAsRead = useCallback((notificationId) => {
        setNotifications(prev => {
            const notification = prev.find(n => n.id === notificationId);
            // Only decrement if it was unread
            if (notification && !notification.read) {
                setUnreadCount(count => Math.max(0, count - 1));
            }
            return prev.map(n => n.id === notificationId ? { ...n, read: true } : n);
        });
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
    // Polling System (Fallback)
    // ==========================================================================

    const handleJobUpdate = useCallback((job) => {
        const jobTypeName = JOB_TYPE_LABELS[job.job_type] || job.job_type || 'Job';
        const data = {
            job_id: job.job_id,
            job_type: job.job_type,
            status: job.status,
            title: job.title,
            error: job.error ? job.error[0] : null
        };

        if (job.status === 'completed') {
            addNotification({
                type: job.job_type,
                status: 'completed',
                title: `${jobTypeName} Concluído`,
                message: job.title || `${jobTypeName} foi concluído com sucesso.`,
                jobId: job.job_id
            });
            showToast(job.title || `${jobTypeName} Concluído`, 'success');
            notifyListeners('job_completed', data);
        } else if (job.status === 'failed') {
            addNotification({
                type: job.job_type,
                status: 'failed',
                title: `${jobTypeName} Falhou`,
                message: data.error || `Erro ao processar ${jobTypeName}.`,
                jobId: job.job_id
            });
            showToast(data.error || `${jobTypeName} Falhou`, 'error');
            notifyListeners('job_failed', data);
        } else {
            notifyListeners('job_progress', data);
        }
    }, [addNotification, notifyListeners]);

    const pollJobs = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            // Fetch recent jobs to check status
            const response = await fetch(`${API_BASE_URL}/jobs?per_page=20&page=1`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) return;

            const data = await response.json();
            const jobs = data.items || [];

            jobs.forEach(job => {
                const prevStatus = knownJobStatuses.current[job.job_id];
                const currentStatus = job.status;

                // If we haven't seen this job before, just track it (don't notify)
                // Notifications are persisted in localStorage, so we don't need
                // to "recover" completions on page load
                if (!prevStatus) {
                    knownJobStatuses.current[job.job_id] = currentStatus;
                    return;
                }

                // If status changed
                if (prevStatus !== currentStatus) {
                    knownJobStatuses.current[job.job_id] = currentStatus;

                    // Only notify on final states or significant progress
                    if (currentStatus === 'completed' || currentStatus === 'failed') {
                        handleJobUpdate(job);
                    }
                }
            });

        } catch (error) {
            console.error('Polling error:', error);
        }
    }, [isAuthenticated, handleJobUpdate]);

    // ==========================================================================
    // SSE Connection Management
    // ==========================================================================

    /**
     * Handle incoming SSE message
     */
    const handleMessage = useCallback((event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.job_id) {
                knownJobStatuses.current[data.job_id] = data.status;
            }

            const jobTypeName = JOB_TYPE_LABELS[data.job_type] || data.job_type || 'Job';

            // Handle different event types
            switch (data.event) {
                case 'job_started':
                    // Optionally show a "started" notification
                    break;

                case 'job_progress':
                    // Could update a progress indicator if needed
                    notifyListeners('job_progress', data);
                    break;

                case 'job_completed':
                    addNotification({
                        type: data.job_type,
                        status: 'completed',
                        title: `${jobTypeName} Concluído`,
                        message: data.title || `${jobTypeName} foi concluído com sucesso.`,
                        jobId: data.job_id
                    });
                    showToast(data.title || `${jobTypeName} Concluído`, 'success');
                    notifyListeners('job_completed', data);
                    break;

                case 'job_failed':
                    addNotification({
                        type: data.job_type,
                        status: 'failed',
                        title: `${jobTypeName} Falhou`,
                        message: data.error || `Erro ao processar ${jobTypeName}.`,
                        jobId: data.job_id
                    });
                    showToast(data.error || `${jobTypeName} Falhou`, 'error');
                    notifyListeners('job_failed', data);
                    break;

                default:
                    console.log('Unknown SSE event:', data.event);
            }
        } catch (err) {
            console.error('Error parsing SSE message:', err);
        }
    }, [addNotification, notifyListeners]);

    /**
     * Connect to SSE stream
     */
    const connect = useCallback(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('No auth token, cannot connect to SSE');
            return;
        }

        // Close existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        // Clear any pending reconnect
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        // Create SSE connection using fetch with headers (EventSource doesn't support headers)
        // We'll use a custom implementation with fetch and ReadableStream
        const controller = new AbortController();

        fetch(`${API_BASE_URL}/jobs/stream`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache'
            },
            signal: controller.signal
        }).then(response => {
            if (!response.ok) {
                throw new Error(`SSE connection failed: ${response.status}`);
            }

            setIsConnected(true);
            setConnectionError(null);
            reconnectAttempts.current = 0;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            const processStream = async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();

                        if (done) {
                            console.log('SSE stream closed');
                            setIsConnected(false);
                            scheduleReconnect();
                            break;
                        }

                        buffer += decoder.decode(value, { stream: true });

                        // Process complete messages
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ''; // Keep incomplete line in buffer

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6);
                                if (data.trim()) {
                                    handleMessage({ data });
                                }
                            }
                            // Ignore keepalive comments (lines starting with ':')
                        }
                    }
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.error('SSE stream error:', err);
                        setIsConnected(false);
                        scheduleReconnect();
                    }
                }
            };

            processStream();

            // Store controller for cleanup
            eventSourceRef.current = { close: () => controller.abort() };

        }).catch(err => {
            if (err.name !== 'AbortError') {
                console.error('SSE connection error:', err);
                setConnectionError(err.message);
                setIsConnected(false);
                scheduleReconnect();
            }
        });

    }, [handleMessage]);

    /**
     * Schedule a reconnection attempt
     */
    const scheduleReconnect = useCallback(() => {
        if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
            console.warn('Max SSE reconnect attempts reached');
            setConnectionError('Unable to connect to notifications server');
            return;
        }

        reconnectAttempts.current++;
        const delay = RECONNECT_DELAY * reconnectAttempts.current;

        console.log(`Scheduling SSE reconnect in ${delay}ms (attempt ${reconnectAttempts.current})`);

        reconnectTimeoutRef.current = setTimeout(() => {
            if (localStorage.getItem('authToken')) {
                connect();
            }
        }, delay);
    }, [connect]);

    /**
     * Disconnect from SSE stream
     */
    const disconnect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        setIsConnected(false);
        reconnectAttempts.current = 0;
    }, []);

    // ==========================================================================
    // Effects
    // ==========================================================================

    // Connect/disconnect based on auth state
    useEffect(() => {
        if (isAuthenticated) {
            // Start SSE
            connect();

            // Start Polling
            setIsPolling(true);
            pollJobs(); // Initial poll
            pollIntervalRef.current = setInterval(pollJobs, POLL_INTERVAL);
        } else {
            disconnect();
            setIsPolling(false);
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        }

        return () => {
            disconnect();
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [isAuthenticated, connect, disconnect, pollJobs]);

    // ==========================================================================
    // Context Value
    // ==========================================================================
    const value = {
        // Notifications
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,

        // Connection state
        isConnected,
        isPolling,
        connectionError,
        reconnect: connect,

        // Event subscription (for Analysis Dashboard real-time updates)
        subscribeToEvents
    };

    return (
        <NotificationsContext.Provider value={value}>
            {children}
        </NotificationsContext.Provider>
    );
};

export default NotificationsContext;
