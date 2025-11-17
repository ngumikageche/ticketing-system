import { useEffect, useState } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { getToken } from '../api/auth.js';

/**
 * Custom hook for real-time data updates via WebSocket
 * @param {string} eventName - The WebSocket event name to listen for
 * @param {Array} initialData - Initial data array
 * @param {Function} updateCallback - Optional callback for custom update logic
 * @returns {Array} [data, setData] - Current data and setter function
 */
export const useRealtimeData = (eventName, initialData = [], updateCallback) => {
  const [data, setData] = useState(initialData);
  const { socket, realtimeData } = useWebSocket();

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (updatedItem) => {
      console.log(`Received ${eventName}:`, updatedItem);

      setData(prevData => {
        const existingIndex = prevData.findIndex(item => item.id === updatedItem.id);

        if (existingIndex >= 0) {
          // Update existing item
          const updated = [...prevData];
          updated[existingIndex] = { ...updated[existingIndex], ...updatedItem };
          return updated;
        } else {
          // Add new item
          return [updatedItem, ...prevData];
        }
      });

      // Call custom callback if provided
      if (updateCallback) {
        updateCallback(updatedItem, data, setData);
      }
    };

    socket.on(eventName, handleUpdate);

    return () => {
      socket.off(eventName, handleUpdate);
    };
  }, [socket, eventName, updateCallback]);

  // Also check for updates in realtimeData
  useEffect(() => {
    if (eventName === 'ticket.update' && realtimeData.ticket) {
      Object.values(realtimeData.ticket).forEach(ticket => {
        setData(prevData => {
          const existingIndex = prevData.findIndex(item => item.id === ticket.id);
          if (existingIndex >= 0) {
            const updated = [...prevData];
            updated[existingIndex] = { ...updated[existingIndex], ...ticket };
            return updated;
          } else {
            return [ticket, ...prevData];
          }
        });
      });
    } else if (eventName === 'comment.update' && realtimeData.comment) {
      Object.values(realtimeData.comment).forEach(comment => {
        setData(prevData => {
          const existingIndex = prevData.findIndex(item => item.id === comment.id);
          if (existingIndex >= 0) {
            const updated = [...prevData];
            updated[existingIndex] = { ...updated[existingIndex], ...comment };
            return updated;
          } else {
            return [comment, ...prevData];
          }
        });
      });
    } else if (eventName === 'user.update' && realtimeData.user) {
      Object.values(realtimeData.user).forEach(user => {
        setData(prevData => {
          const existingIndex = prevData.findIndex(item => item.id === user.id);
          if (existingIndex >= 0) {
            const updated = [...prevData];
            updated[existingIndex] = { ...updated[existingIndex], ...user };
            return updated;
          } else {
            return [user, ...prevData];
          }
        });
      });
    }
  }, [realtimeData, eventName]);

  return [data, setData];
};

/**
 * Hook for managing notifications with real-time updates
 * @returns {Object} Notification management functions and state
 */
export const useRealtimeNotifications = () => {
  const { notifications, markNotificationAsRead } = useWebSocket();

  const markAsRead = async (id) => {
    const token = getToken();
    console.log('Marking notification as read:', id, 'with token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    
    if (!token) {
      console.error('No token found for marking notification as read');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Update the notification state to mark it as read
        markNotificationAsRead(id);
        console.log('Marked notification as read:', id);
      } else {
        const errorText = await response.text();
        console.error('Failed to mark notification as read:', response.status, response.statusText, errorText);
        // Don't update UI if API call failed
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  return {
    notifications,
    markAsRead
  };
};