import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  payload: any;
}

interface UseWebSocketProps {
  url: string;
  onMessage: (data: WebSocketMessage) => void;
  onClose?: () => void;
}

export const useWebSocket = ({ url, onMessage, onClose }: UseWebSocketProps) => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setConnected(true);
        setError(null);
        console.log('WebSocket connected');
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.current.onclose = () => {
        setConnected(false);
        onClose?.();
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };

      ws.current.onerror = (error) => {
        setError('WebSocket connection failed');
        console.error('WebSocket error:', error);
      };
    } catch (e) {
      setError('Failed to create WebSocket connection');
      console.error('WebSocket creation error:', e);
    }
  }, [url, onMessage, onClose]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  return {
    connected,
    sendMessage,
    error,
  };
};