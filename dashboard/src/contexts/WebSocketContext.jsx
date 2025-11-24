import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { processWebhookPayload, getNotifications, markNotificationAsRead as markNotificationAsReadAPI } from '../api/notifications.js';
import { useAuth } from './AuthContext.jsx';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [realtimeData, setRealtimeData] = useState({});
  const { currentUser: authUser, loading: authLoading } = useAuth();
  const [pollingInterval, setPollingInterval] = useState(null);

  // Polling fallback function - use currentUser from state
  const pollNotifications = useCallback(async () => {
    try {
      if (!authUser) return; // Don't poll if no authenticated user
      const data = await getNotifications();
      // Filter to ensure only current user's notifications (API should do this, but double-check)
      const filteredData = authUser
        ? data.filter(n => n.user_id === authUser.id)
        : data;
      setNotifications(filteredData);
      console.log('Polled notifications for user:', authUser?.email || 'undefined', filteredData.length, 'notifications');
    } catch (error) {
      console.error('Failed to poll notifications:', error);
    }
  }, [authUser]);

  useEffect(() => {
    let newSocket = null;
    let connectionTimeout = null;
    // Load initial notifications and current user
    const loadInitialData = async () => {
      try {
        // If no authenticated user yet, skip loading
        if (!authUser) return;
        const notificationsData = await getNotifications();
        // Filter notifications to ensure they belong to current user
        const filteredNotifications = notificationsData.filter(n => n.user_id === authUser.id);
        setNotifications(filteredNotifications);
        console.log('Loaded initial notifications for user:', authUser.email, filteredNotifications.map(n => ({ id: n.id, message: n.message.substring(0, 50) })));
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };

    // Load data and then attempt WebSocket connection if we have a logged-in user
  (async () => {
      // Only load and connect if the authenticated user is available
      if (!authUser || authLoading) return;
      await loadInitialData();

    // Try to connect to WebSocket server (skip in production if not configured)
    const isProduction = import.meta.env.PROD;
    const wsUrl = import.meta.env.VITE_WS_BASE || 'http://localhost:5000';
    
    // In production, skip WebSocket and use polling only
    if (isProduction && wsUrl.includes('sapi.nextek.co.ke')) {
      console.log('[WEBSOCKET] Production environment detected, using polling only');
      setIsConnected(false);
      if (!pollingInterval) {
        const interval = setInterval(pollNotifications, 30000);
        setPollingInterval(interval);
      }
      return;
    }

  newSocket = io(wsUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      timeout: 5000, // 5 second timeout
      reconnection: true,
      reconnectionAttempts: 3
    });

  // connectionTimeout will be set below

    // Connection events
    newSocket.on('connect', () => {
      console.log('[WEBSOCKET] Connected to WebSocket server');
      setIsConnected(true);
      
      // Clear polling when WebSocket connects
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }

      // Join relevant rooms for targeted updates
      console.log('[WEBSOCKET] Joining rooms: tickets, comments, users, kb, attachments, messages');
      newSocket.emit('join', { room: 'tickets' });
      newSocket.emit('join', { room: 'comments' });
      newSocket.emit('join', { room: 'users' });
      newSocket.emit('join', { room: 'kb' });
      newSocket.emit('join', { room: 'attachments' });
      newSocket.emit('join', { room: 'messages' });
    });

    newSocket.on('disconnect', () => {
      console.log('[WEBSOCKET] Disconnected from WebSocket server, falling back to polling');
      setIsConnected(false);
      
      // Start polling as fallback
      if (!pollingInterval) {
        const interval = setInterval(pollNotifications, 30000); // Poll every 30 seconds
        setPollingInterval(interval);
      }
    });

    // Connection timeout - fallback to polling
  connectionTimeout = setTimeout(() => {
      if (!isConnected) {
        console.log('WebSocket connection timeout, using polling fallback');
        setIsConnected(false);
        if (!pollingInterval) {
          const interval = setInterval(pollNotifications, 30000);
          setPollingInterval(interval);
        }
      }
    }, 5000);

    // Handle webhook notifications with enhanced payload
    newSocket.on('notification', (payload) => {
      try {
        const processed = processWebhookPayload(payload);
        
        // Only add notifications that belong to the current user
        if (authUser && processed.notification.user_id === authUser.id) {
          console.log('Received webhook notification for current user:', {
            id: processed.notification.id,
            message: processed.notification.message,
            related_type: processed.notification.related_type
          });

          // Add to notifications list
          setNotifications(prev => [processed.notification, ...prev]);

          // Store entity data for real-time updates
          if (processed.data && processed.notification.related_type) {
            setRealtimeData(prev => ({
              ...prev,
              [processed.notification.related_type]: {
                ...prev[processed.notification.related_type],
                [processed.data.id]: processed.data
              }
            }));
          }

          // Show browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification(processed.notification.message);
          }
        } else {
          console.log('Ignoring notification for different user:', processed.notification.user_id, 'current user:', authUser?.id);
        }
      } catch (error) {
        console.error('Failed to process webhook payload:', error);
      }
    });

    // Entity-specific update events
    newSocket.on('ticket.update', (payload) => {
      const { data } = payload;
      console.log('Ticket updated:', data);
      setRealtimeData(prev => ({
        ...prev,
        ticket: {
          ...prev.ticket,
          [data.id]: data
        }
      }));
    });

    newSocket.on('comment.update', (payload) => {
      const { data } = payload;
      console.log('Comment updated:', data);
      setRealtimeData(prev => ({
        ...prev,
        comment: {
          ...prev.comment,
          [data.id]: data
        }
      }));
    });

    // Listen for user updates (backend emits 'user.update')
    newSocket.on('user.update', (payload) => {
      const { data } = payload;
      console.log('User updated:', data);
      setRealtimeData(prev => ({
        ...prev,
        user: {
          ...prev.user,
          [data.id]: data
        }
      }));
    });

    newSocket.on('kb.article.created', (payload) => {
      const { data } = payload;
      console.log('KB article created:', data);
      setRealtimeData(prev => ({
        ...prev,
        kb: {
          ...prev.kb,
          [data.id]: data
        }
      }));
    });

    newSocket.on('attachment.added', (payload) => {
      const { data } = payload;
      console.log('Attachment added:', data);
      setRealtimeData(prev => ({
        ...prev,
        attachment: {
          ...prev.attachment,
          [data.id]: data
        }
      }));
    });

    // Message events: backend emits 'message.update' for created/updated messages
    newSocket.on('message.update', (payload) => {
      console.log('[WEBSOCKET] Received message.update event:', payload);
      const { data } = payload;
      console.log('Message updated/created:', data);
      setRealtimeData(prev => ({
        ...prev,
        message: {
          ...prev.message,
          [data.id]: data
        }
      }));

      // Simple debug toast using the Notification API so you can verify
      // messages arrive in other browsers without needing a refresh.
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const preview = (data.content || '').slice(0, 120);
          new Notification('New message', { body: preview });
        } else if (typeof Notification !== 'undefined' && Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              const preview = (data.content || '').slice(0, 120);
              new Notification('New message', { body: preview });
            }
          });
        }
      } catch (err) {
        console.warn('Browser notifications not available:', err);
      }
    });

    newSocket.on('conversation.update', (payload) => {
      const { data } = payload;
      console.log('Conversation updated:', data);
      setRealtimeData(prev => ({
        ...prev,
        conversation: {
          ...prev.conversation,
          [data.id]: data
        }
      }));
    });

    newSocket.on('notification.read', (data) => {
      console.log('Notification marked as read:', data.id);
      markNotificationAsRead(data.id);
    });

    setSocket(newSocket);
    // Close the IIFE and return cleanup
    })();

    return () => {
      if (connectionTimeout) clearTimeout(connectionTimeout);
      if (newSocket) newSocket.close();
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [authUser, authLoading, pollNotifications]);

  // Initial polling setup (in case WebSocket never connects)
  useEffect(() => {
    if (authUser && !isConnected && !pollingInterval) {
      console.log('Setting up initial polling fallback');
      const interval = setInterval(pollNotifications, 30000);
      setPollingInterval(interval);
      
      return () => clearInterval(interval);
    }
  }, [isConnected, pollingInterval, authUser]);

  const clearNotifications = () => {
    setNotifications([]);
  };

  const markNotificationAsRead = async (id) => {
    try {
      await markNotificationAsReadAPI(id);
      // Update local state only after successful API call
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, is_read: true } 
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getRealtimeData = (type, id) => {
    return realtimeData[type]?.[id];
  };

  const value = {
    socket,
    isConnected,
    notifications,
    realtimeData,
    currentUser: authUser,
    clearNotifications,
    markNotificationAsRead,
    getRealtimeData
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};