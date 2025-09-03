import { useState, useEffect, useCallback } from 'react';
import {
  streamingService,
  WebSocketConnection,
  WebSocketMessage
} from '../lib/data/streamingService';

/**
 * React Hook for WebSocket connections
 *
 * Provides easy access to WebSocket channels with built-in connection management
 */
export function useWebSocketConsultation(consultationId: string) {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<WebSocketConnection['status']>('disconnected');
  const [connection, setConnection] = useState<WebSocketConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);

  const channelName = `consultation-${consultationId}`;

  useEffect(() => {
    let isMounted = true;
    setError(null);

    // Feature flag check
    const wsEnabled = import.meta.env.VITE_ENABLE_WEBSOCKET === 'true';
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:5173';
    if (!wsEnabled) {
      console.log('🧪 WebSocket disabled by flag VITE_ENABLE_WEBSOCKET=false, skipping connect for', channelName);
      setConnectionStatus('disconnected');
      setIsConnected(false);
      setConnection(null);
      return () => { isMounted = false; };
    }

    // Add diagnostic logging for WebSocket connection
    console.log(`🔌 Attempting WebSocket connection to: ${wsUrl}`);
    console.log(`📡 Channel: ${channelName}`);

    // Connect to WebSocket channel
    const ws = new WebSocket(wsUrl);

    // Set up event handlers
    ws.onopen = () => {
      if (isMounted) {
        setConnectionStatus('connected');
        setIsConnected(true);
        setError(null);
        console.log(`Connected to consultation ${consultationId}`);

        // Join consultation
        const joinMessage: WebSocketMessage = {
          type: 'join_consultation',
          payload: { consultationId },
          timestamp: new Date().toISOString(),
          senderId: 'system', // Will be replaced with actual user
          consultationId
        };
        ws.send(JSON.stringify(joinMessage));
      }
    };

    ws.onmessage = (event) => {
      if (!isMounted) return;

      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        // Handle different message types
        switch (message.type) {
          case 'consultation_message':
          case 'consultation_update':
            setMessages(prev => [...prev, message].slice(-100)); // Keep last 100 messages
            break;
          case 'participant_joined':
            setParticipants(prev => {
              if (!prev.includes(message.senderId || '')) {
                return [...prev, message.senderId || ''];
              }
              return prev;
            });
            break;
          case 'participant_left':
            setParticipants(prev =>
              prev.filter(id => id !== message.senderId)
            );
            break;
          case 'participants_list':
            setParticipants(message.payload.participants || []);
            break;
          case 'consultation_status':
            // Handle consultation status updates
            break;
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
        setError('Failed to parse message');
      }
    };

    ws.onclose = (event) => {
      if (isMounted) {
        setConnectionStatus('disconnected');
        setIsConnected(false);
        if (event.code !== 1000) { // Normal closure
          setError('Connection lost');
        }
      }
    };

    ws.onerror = () => {
      if (isMounted) {
        setConnectionStatus('error');
        setIsConnected(false);
        setError('Connection failed');
      }
    };

    // Store WebSocket instance
    streamingService.connectWebSocketEndpoint(channelName, ws);
    setConnection({
      id: `ws_${consultationId}_${Date.now()}`,
      channel: channelName,
      status: 'connecting',
      webSocket: ws,
      reconnectCount: 0,
      lastHeartbeat: new Date().toISOString()
    });

    // Cleanup
    return () => {
      isMounted = false;
      if (ws.readyState === WebSocket.OPEN) {
        // Leave consultation before closing
        const leaveMessage: WebSocketMessage = {
          type: 'leave_consultation',
          payload: { consultationId },
          timestamp: new Date().toISOString(),
          senderId: 'system',
          consultationId
        };
        ws.send(JSON.stringify(leaveMessage));

        setTimeout(() => ws.close(), 100); // Give time to send leave message
      }
    };
  }, [consultationId]);

  /**
   * Send message to consultation
   */
  const sendMessage = useCallback((content: string, messageType: string = 'message') => {
    if (!isConnected) {
      console.warn('WebSocket not connected');
      return;
    }

    const message: WebSocketMessage = {
      type: 'consultation_message',
      payload: {
        content,
        messageType,
        consultationId
      },
      timestamp: new Date().toISOString(),
      senderId: 'user', // Replace with actual user ID
      consultationId
    };

    streamingService.sendWebSocketMessage(channelName, message);
  }, [isConnected, consultationId, channelName]);

  /**
   * Send typing indicator
   */
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!isConnected) return;

    const message: WebSocketMessage = {
      type: 'typing_indicator',
      payload: {
        isTyping,
        consultationId
      },
      timestamp: new Date().toISOString(),
      senderId: 'user',
      consultationId
    };

    streamingService.sendWebSocketMessage(channelName, message);
  }, [isConnected, consultationId, channelName]);

  /**
   * Update consultation status
   */
  const updateConsultationStatus = useCallback((status: string) => {
    if (!isConnected) return;

    const message: WebSocketMessage = {
      type: 'consultation_status_update',
      payload: {
        status,
        consultationId
      },
      timestamp: new Date().toISOString(),
      senderId: 'user',
      consultationId
    };

    streamingService.sendWebSocketMessage(channelName, message);
  }, [isConnected, consultationId, channelName]);

  return {
    messages,
    connectionStatus,
    isConnected,
    error,
    participants,
    sendMessage,
    sendTypingIndicator,
    updateConsultationStatus,
    connection
  };
}

/**
 * Hook for stakeholder collaboration
 */
export function useStakeholderCollaboration(stakeholderId: string) {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [activeChannels, setActiveChannels] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelName = `stakeholder-${stakeholderId}`;

  useEffect(() => {
    let isMounted = true;
    setError(null);

    const initializeCollaboration = async () => {
      try {
        const wsEnabled = import.meta.env.VITE_ENABLE_WEBSOCKET === 'true';
        if (!wsEnabled) {
          console.log('🧪 WebSocket disabled, skipping collaboration connection');
          setIsConnected(false);
          return;
        }
        // List available collaboration channels
        const response = await fetch('/api/stakeholder/collaboration-channels');
        const channels = await response.json();
        setActiveChannels(channels.map((c: any) => c.name));

        // Connect to main stakeholder channel
        const ws = new WebSocket(import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:5173');

        ws.onopen = () => {
          if (isMounted) {
            setIsConnected(true);
            setError(null);
          }
        };

        ws.onmessage = (event) => {
          if (isMounted) {
            try {
              const message: WebSocketMessage = JSON.parse(event.data);
              setMessages(prev => [...prev, message].slice(-100));
            } catch (err) {
              console.error('Collaboration message parse error:', err);
            }
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            setIsConnected(false);
            setError('Connection lost');
          }
        };

        ws.onerror = () => {
          if (isMounted) {
            setIsConnected(false);
            setError('Connection failed');
          }
        };

        streamingService.connectWebSocketEndpoint(channelName, ws);

      } catch (err) {
        console.error('Failed to initialize collaboration:', err);
        setError('Failed to initialize collaboration');
      }
    };

    initializeCollaboration();

    return () => {
      isMounted = false;
    };
  }, [stakeholderId]);

  const sendCollaborationMessage = (channel: string, content: string, type: string = 'message') => {
    const message: WebSocketMessage = {
      type: 'collaboration_message',
      payload: {
        channel,
        content,
        messageType: type
      },
      timestamp: new Date().toISOString(),
      senderId: stakeholderId,
      consultationId: channel
    };

    streamingService.sendWebSocketMessage(channelName, message);
  };

  return {
    messages,
    activeChannels,
    isConnected,
    error,
    sendCollaborationMessage
  };
}

/**
 * Hook for real-time data sharing in consultations
 */
export function useSharedData(channelName: string) {
  const [sharedData, setSharedData] = useState<Record<string, any>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [subscribers, setSubscribers] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    const wsEnabled = import.meta.env.VITE_ENABLE_WEBSOCKET === 'true';
    if (!wsEnabled) {
      console.log('🧪 WebSocket disabled, skipping shared data connection');
      setIsConnected(false);
      return () => { isMounted = false; };
    }

    const ws = new WebSocket(import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:5173');

    ws.onopen = () => {
      if (isMounted) {
        setIsConnected(true);
        // Join shared data channel
        ws.send(JSON.stringify({
          type: 'join_shared_data',
          payload: { channelName },
          timestamp: new Date().toISOString()
        }));
      }
    };

    ws.onmessage = (event) => {
      if (isMounted) {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          switch (message.type) {
            case 'shared_data_update':
              setSharedData(message.payload.data);
              break;
            case 'shared_data_subscribers':
              setSubscribers(message.payload.subscribers || []);
              break;
          }
        } catch (err) {
          console.error('Shared data message parse error:', err);
        }
      }
    };

    ws.onclose = () => {
      if (isMounted) {
        setIsConnected(false);
      }
    };

    streamingService.connectWebSocketEndpoint(channelName, ws);

    return () => {
      isMounted = false;
      ws.close();
    };
  }, [channelName]);

  const updateSharedData = (data: Record<string, any>) => {
    const message: WebSocketMessage = {
      type: 'update_shared_data',
      payload: {
        channelName,
        data,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      senderId: 'user'
    };

    streamingService.sendWebSocketMessage(channelName, message);
    setSharedData(prev => ({ ...prev, ...data }));
  };

  return {
    sharedData,
    subscribers,
    isConnected,
    updateSharedData
  };
}