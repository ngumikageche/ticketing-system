import { useEffect, useState } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { getToken } from '../api/auth.js';
import { getTickets } from '../api/tickets.js';
import { getComments } from '../api/comments.js';

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
 * Hook for managing tickets with real-time updates
 * @returns {Object} Tickets management functions and state
 */
export const useRealtimeTickets = () => {
  const { realtimeData } = useWebSocket();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial tickets
  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await getTickets();
      setTickets(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update tickets with real-time data
  useEffect(() => {
    if (realtimeData.ticket) {
      setTickets(prevTickets => {
        const updated = [...prevTickets];
        Object.values(realtimeData.ticket).forEach(ticketUpdate => {
          const existingIndex = updated.findIndex(t => t.id === ticketUpdate.id);
          if (existingIndex >= 0) {
            // Update existing ticket
            updated[existingIndex] = { ...updated[existingIndex], ...ticketUpdate };
          } else {
            // Add new ticket
            updated.unshift(ticketUpdate);
          }
        });
        return updated;
      });
    }
  }, [realtimeData.ticket]);

  return {
    tickets,
    loading,
    error,
    loadTickets,
    setTickets
  };
};

/**
 * Hook for managing comments with real-time updates
 * @param {string} ticketId - Optional ticket ID to filter comments
 * @returns {Object} Comments management functions and state
 */
export const useRealtimeComments = (ticketId = null) => {
  const { realtimeData } = useWebSocket();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load comments for a ticket
  const loadComments = async (id) => {
    try {
      setLoading(true);
      const allComments = await getComments();
      const ticketComments = allComments.filter(c => c.ticket_id === id);
      setComments(ticketComments);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update comments with real-time data
  useEffect(() => {
    if (realtimeData.comment) {
      setComments(prevComments => {
        const updated = [...prevComments];
        Object.values(realtimeData.comment).forEach(commentUpdate => {
          // Only update if this comment belongs to our ticket (if ticketId is specified)
          if (!ticketId || commentUpdate.ticket_id === ticketId) {
            const existingIndex = updated.findIndex(c => c.id === commentUpdate.id);
            if (existingIndex >= 0) {
              // Update existing comment
              updated[existingIndex] = { ...updated[existingIndex], ...commentUpdate };
            } else {
              // Add new comment
              updated.push(commentUpdate);
            }
          }
        });
        return updated;
      });
    }
  }, [realtimeData.comment, ticketId]);

  return {
    comments,
    loading,
    error,
    loadComments,
    setComments
  };
};