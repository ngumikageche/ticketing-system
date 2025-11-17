import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { getToken } from '../api/auth.js';
import { processWebhookPayload, getNotifications, markNotificationAsRead as markNotificationAsReadAPI } from '../api/notifications.js';
import { getCurrentUser } from '../api/users.js';

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
  const [currentUser, setCurrentUser] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  // Polling fallback function
  const pollNotifications = async () => {
    try {
      const data = await getNotifications();
      // Filter to ensure only current user's notifications (API should do this, but double-check)
      const filteredData = currentUser 
        ? data.filter(n => n.user_id === currentUser.id)
        : data;
      setNotifications(filteredData);
      console.log('Polled notifications for user:', currentUser?.email, filteredData.length, 'notifications');
    } catch (error) {
      console.error('Failed to poll notifications:', error);
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Load initial notifications and current user
    const loadInitialData = async () => {
      try {
        const [notificationsData, userData] = await Promise.all([
          getNotifications(),
          getCurrentUser()
        ]);
        setCurrentUser(userData);
        // Filter notifications to ensure they belong to current user
        const filteredNotifications = notificationsData.filter(n => n.user_id === userData.id);
        setNotifications(filteredNotifications);
        console.log('Loaded initial notifications for user:', userData.email, filteredNotifications.map(n => ({ id: n.id, message: n.message.substring(0, 50) })));
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };

    loadInitialData();

    // Try to connect to WebSocket server
    const newSocket = io('http://localhost:5000', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 5000, // 5 second timeout
      reconnection: true,
      reconnectionAttempts: 3
    });

    let connectionTimeout;

    // Connection events
    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
      
      // Clear polling when WebSocket connects
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }

      // Join relevant rooms for targeted updates
      newSocket.emit('join', { room: 'tickets' });
      newSocket.emit('join', { room: 'comments' });
      newSocket.emit('join', { room: 'users' });
      newSocket.emit('join', { room: 'kb' });
      newSocket.emit('join', { room: 'attachments' });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server, falling back to polling');
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
        if (currentUser && processed.notification.user_id === currentUser.id) {
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
          console.log('Ignoring notification for different user:', processed.notification.user_id, 'current user:', currentUser?.id);
        }
      } catch (error) {
        console.error('Failed to process webhook payload:', error);
      }
    });

    // Entity-specific update events
    newSocket.on('ticket.updated', (payload) => {
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

    newSocket.on('comment.created', (payload) => {
      const { data } = payload;
      console.log('Comment created:', data);
      setRealtimeData(prev => ({
        ...prev,
        comment: {
          ...prev.comment,
          [data.id]: data
        }
      }));
    });

    newSocket.on('comment.updated', (payload) => {
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

    newSocket.on('user.updated', (payload) => {
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

    newSocket.on('notification.read', (data) => {
      console.log('Notification marked as read:', data.id);
      markNotificationAsRead(data.id);
    });

    setSocket(newSocket);

    return () => {
      clearTimeout(connectionTimeout);
      newSocket.close();
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  // Initial polling setup (in case WebSocket never connects)
  useEffect(() => {
    const token = getToken();
    if (token && !isConnected && !pollingInterval) {
      console.log('Setting up initial polling fallback');
      const interval = setInterval(pollNotifications, 30000);
      setPollingInterval(interval);
      
      return () => clearInterval(interval);
    }
  }, [isConnected, pollingInterval]);

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
    currentUser,
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