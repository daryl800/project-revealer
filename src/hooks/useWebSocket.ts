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
  heartbeatInterval?: number; // ms, e.g. 15000
}

export const useWebSocket = ({
  url,
  onMessage,
  onClose,
  maxReconnectAttempts = 5,
  reconnectInterval = 3000,
  heartbeatInterval = 15000,
}: UseWebSocketProps) => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
  const isConnecting = useRef(false);
  const manualClose = useRef(false);

  const cleanupSocket = () => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
    if (ws.current) {
      ws.current.onclose = null;
      ws.current.onmessage = null;
      ws.current.onerror = null;
      ws.current.onopen = null;
      ws.current.close();
      ws.current = null;
    }
    isConnecting.current = false;
  };

  const startHeartbeat = () => {
    if (heartbeatInterval > 0) {
      heartbeatTimer.current = setInterval(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, heartbeatInterval);
    }
  };

  const connect = useCallback(() => {
    if (isConnecting.current || (ws.current && ws.current.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket connection already in progress, skipping...');
      return;
    }

    cleanupSocket();
    manualClose.current = false;

    try {
      console.log(
        `Attempting to connect to WebSocket: ${url} (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`
      );
      isConnecting.current = true;
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setConnected(true);
        setError(null);
        setReconnectAttempts(0);
        isConnecting.current = false;
        console.log('✅ WebSocket connected successfully');
        startHeartbeat();
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === 'pong') {
            // ignore keepalive replies
            return;
          }
          onMessage(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.current.onclose = (event) => {
        cleanupSocket();
        setConnected(false);
        console.log(
          `🔕 WebSocket connection closed (code: ${event.code}, reason: ${event.reason})`
        );
        onClose?.();

        if (!manualClose.current && reconnectAttempts < maxReconnectAttempts) {
          // Linear backoff
          const backoffDelay = reconnectInterval * (reconnectAttempts + 1);
          console.log(
            `Attempting to reconnect in ${backoffDelay}ms... (${reconnectAttempts + 1}/${maxReconnectAttempts})`
          );

          reconnectTimeout.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }, backoffDelay);
        } else if (!manualClose.current) {
          setError('Max reconnection attempts reached. Please refresh the page.');
          console.error('❌ Max reconnection attempts reached');
        }
      };

      ws.current.onerror = (event) => {
        isConnecting.current = false;
        const errorMsg = `WebSocket connection error (attempts: ${
          reconnectAttempts + 1
        }/${maxReconnectAttempts})`;
        setError(errorMsg);
        console.error('❌ WebSocket error:', {
          url,
          readyState: ws.current?.readyState,
          event,
        });
      };
    } catch (e) {
      isConnecting.current = false;
      setError('Failed to create WebSocket connection');
      console.error('❌ WebSocket creation error:', e);
    }
  }, [url, onMessage, onClose, reconnectAttempts, maxReconnectAttempts, reconnectInterval]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 15000); // every 15s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      manualClose.current = true;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      cleanupSocket();
    };
  }, [url]);

  const disconnect = useCallback(() => {
    manualClose.current = true;
    setReconnectAttempts(maxReconnectAttempts); // block auto-reconnect
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    cleanupSocket();
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
