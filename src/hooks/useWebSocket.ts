import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  sentence_id: number;
  type: string;
  payload: any;
}

interface UseWebSocketProps {
  url: string;
  onMessage: (data: WebSocketMessage) => void;
  onClose?: () => void;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

export const useWebSocket = ({ 
  url, 
  onMessage, 
  onClose,
  maxReconnectAttempts = 5,
  reconnectInterval = 3000
}: UseWebSocketProps) => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const isConnecting = useRef(false);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting.current || (ws.current && ws.current.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket connection already in progress, skipping...');
      return;
    }

    // Close existing connection if any
    if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
      ws.current.close();
    }

    try {
      console.log(`Attempting to connect to WebSocket: ${url} (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
      isConnecting.current = true;
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setConnected(true);
        setError(null);
        setReconnectAttempts(0);
        isConnecting.current = false;
        console.log('✅ WebSocket connected successfully');
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.current.onclose = (event) => {
        setConnected(false);
        isConnecting.current = false;
        console.log(`🔕 WebSocket connection closed (code: ${event.code}, reason: ${event.reason})`);
        onClose?.();
        
        // Only attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttempts < maxReconnectAttempts) {
          const backoffDelay = Math.min(reconnectInterval * Math.pow(2, reconnectAttempts), 30000);
          console.log(`Attempting to reconnect in ${backoffDelay}ms... (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeout.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, backoffDelay);
        } else {
          setError('Max reconnection attempts reached. Please refresh the page.');
          console.error('❌ Max reconnection attempts reached');
        }
      };

      ws.current.onerror = (event) => {
        isConnecting.current = false;
        const errorMsg = `WebSocket connection error (attempts: ${reconnectAttempts + 1}/${maxReconnectAttempts})`;
        setError(errorMsg);
        console.error('❌ WebSocket error:', {
          url,
          readyState: ws.current?.readyState,
          event
        });
      };
    } catch (e) {
      isConnecting.current = false;
      setError('Failed to create WebSocket connection');
      console.error('❌ WebSocket creation error:', e);
    }
  }, [url, onMessage, onClose, reconnectAttempts, maxReconnectAttempts, reconnectInterval]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        isConnecting.current = false;
        ws.current.close();
      }
    };
  }, [url]); // Only reconnect when URL changes

  const disconnect = useCallback(() => {
    setReconnectAttempts(maxReconnectAttempts); // Prevent further reconnection
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (ws.current) {
      ws.current.close();
    }
  }, [maxReconnectAttempts]);

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
    disconnect,
    error,
    reconnectAttempts,
    isConnecting: isConnecting.current,
  };
};