import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext.jsx';
import { getTickets } from '../api/tickets.js';
import { getComments } from '../api/comments.js';

export interface BaseEntity { id: string }
export interface Ticket extends BaseEntity {
  ticket_id?: string;
  subject: string;
  requester_id: string;
  requester_name?: string;
  status: string;
  priority: string;
  assignee_id?: string;
  created_at?: string;
}

export interface Comment extends BaseEntity {
  ticket_id: string;
  author_id: string;
  content: string;
  created_at?: string;
}

type UpdateCallback<T> = (item: T, data: T[], setData: React.Dispatch<React.SetStateAction<T[]>>) => void;

export const useRealtimeData = <T extends BaseEntity>(
  eventName: string,
  initialData: T[] = [],
  updateCallback?: UpdateCallback<T>
) => {
  const [data, setData] = useState<T[]>(initialData);
  const { socket, realtimeData } = useWebSocket() as any;

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (updatedItem: T) => {
      setData(prevData => {
        const existingIndex = prevData.findIndex(item => item.id === updatedItem.id);

        if (existingIndex >= 0) {
          const updated = [...prevData];
          updated[existingIndex] = { ...updated[existingIndex], ...updatedItem } as T;
          return updated;
        } else {
          return [updatedItem, ...prevData];
        }
      });

      if (updateCallback) {
        updateCallback(updatedItem, data, setData);
      }
    };

    socket.on(eventName, handleUpdate);
    return () => {
      socket.off(eventName, handleUpdate);
    };
  }, [socket, eventName, updateCallback]);

  useEffect(() => {
    if (eventName === 'ticket.update' && realtimeData.ticket) {
      Object.values(realtimeData.ticket as Record<string, Ticket>).forEach(ticket => {
        setData(prevData => {
          const existingIndex = prevData.findIndex((item: any) => item.id === ticket.id);
          if (existingIndex >= 0) {
            const updated = [...prevData];
            updated[existingIndex] = { ...(updated[existingIndex] as any), ...ticket };
            return updated;
          } else {
            return [ticket as any as T, ...prevData];
          }
        });
      });
    } else if (eventName === 'comment.update' && realtimeData.comment) {
      Object.values(realtimeData.comment as Record<string, Comment>).forEach(comment => {
        setData(prevData => {
          const existingIndex = prevData.findIndex((item: any) => item.id === comment.id);
          if (existingIndex >= 0) {
            const updated = [...prevData];
            updated[existingIndex] = { ...(updated[existingIndex] as any), ...comment };
            return updated;
          } else {
            return [comment as any as T, ...prevData];
          }
        });
      });
    } else if (eventName === 'user.update' && realtimeData.user) {
      Object.values(realtimeData.user as Record<string, any>).forEach(user => {
        setData(prevData => {
          const existingIndex = prevData.findIndex((item: any) => item.id === user.id);
          if (existingIndex >= 0) {
            const updated = [...prevData];
            updated[existingIndex] = { ...(updated[existingIndex] as any), ...user };
            return updated;
          } else {
            return [user as T, ...prevData];
          }
        });
      });
    }
  }, [realtimeData, eventName]);

  return [data, setData] as const;
};

export const useRealtimeTickets = () => {
  const { realtimeData } = useWebSocket() as any;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data: Ticket[] = await getTickets();
      setTickets(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTickets = useCallback((ticketUpdates: Record<string, Ticket>) => {
    setTickets(prevTickets => {
      const updated = [...prevTickets];
      Object.values(ticketUpdates).forEach(ticketUpdate => {
        const existingIndex = updated.findIndex(t => t.id === ticketUpdate.id);
        if (existingIndex >= 0) {
          updated[existingIndex] = { ...updated[existingIndex], ...ticketUpdate };
        } else {
          updated.unshift(ticketUpdate);
        }
      });
      return updated;
    });
  }, []);

  useEffect(() => {
    if (realtimeData.ticket) {
      updateTickets(realtimeData.ticket as Record<string, Ticket>);
    }
  }, [realtimeData.ticket, updateTickets]);

  return { tickets, loading, error, loadTickets, setTickets } as const;
};

export const useRealtimeComments = (ticketId: string | null = null) => {
  const { realtimeData } = useWebSocket() as any;
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = async (id: string) => {
    try {
      setLoading(true);
      const allComments: Comment[] = await getComments();
      const ticketComments = allComments.filter(c => c.ticket_id === id);
      setComments(ticketComments);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateComments = useCallback((commentUpdates: Record<string, Comment>) => {
    setComments(prevComments => {
      const updated = [...prevComments];
      Object.values(commentUpdates).forEach(commentUpdate => {
        if (!ticketId || commentUpdate.ticket_id === ticketId) {
          const existingIndex = updated.findIndex(c => c.id === commentUpdate.id);
          if (existingIndex >= 0) {
            updated[existingIndex] = { ...updated[existingIndex], ...commentUpdate };
          } else {
            updated.push(commentUpdate);
          }
        }
      });
      return updated;
    });
  }, [ticketId]);

  useEffect(() => {
    if (realtimeData.comment) {
      updateComments(realtimeData.comment as Record<string, Comment>);
    }
  }, [realtimeData.comment, updateComments]);

  return { comments, loading, error, loadComments, setComments } as const;
};
