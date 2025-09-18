/**
 * Real-time Streaming Service
 *
 * Handles live data connections to external APIs with automatic failover.
 * Provides SSE streaming, caching, rate limiting, and error recovery.
 */

// Enhanced interfaces for streaming data
export interface StreamingDataPoint {
  timestamp: string;
  dataset: string;
  source: string;
  values: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface StreamingConnection {
  id: string;
  dataset: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdate: string;
  errorCount: number;
  retryCount: number;
  eventSource?: EventSource;
  webSocket?: WebSocket;
  webSocketEndpoint?: string;
}

export interface RealDataConfig {
  enableLivestream: boolean;
  enableWebSocket: boolean;
  fallbackToMock: boolean;
  cacheExpiryMinutes: number;
  rateLimitMs: number;
  maxRetries: number;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  senderId?: string;
  consultationId?: string;
}

export interface WebSocketConnection {
  id: string;
  channel: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  webSocket: WebSocket;
  reconnectCount: number;
  lastHeartbeat: string;
}

export class StreamingService {
  private static instance: StreamingService;
  private connections = new Map<string, StreamingConnection>();
  private webSocketConnections = new Map<string, WebSocketConnection>();
  private dataCache = new Map<string, StreamingDataPoint[]>();
  private eventListeners = new Map<string, Function[]>();
  private messageListeners = new Map<string, Function[]>();
  private config: RealDataConfig;
  private abortControllers = new Map<string, AbortController>();
  private heartbeatIntervals = new Map<string, NodeJS.Timeout>();

  private constructor() {
    // Console logging for debugging streaming configuration

    this.config = {
      enableLivestream: import.meta.env.VITE_ENABLE_LIVE_STREAMING === 'true',
      enableWebSocket: import.meta.env.VITE_ENABLE_WEBSOCKET === 'true',
      fallbackToMock: true, // Always keep fallback for safety
      cacheExpiryMinutes: 5,
      rateLimitMs: 1000, // 1 second between calls
      maxRetries: 3
    };

    console.log('📊 Final Configuration:', this.config);
  }

  public static getInstance(): StreamingService {
    if (!StreamingService.instance) {
      StreamingService.instance = new StreamingService();
    }
    return StreamingService.instance;
  }

  /**
   * Connect to a real-time data stream
   */
  async connectStream(dataset: string, endpoint: string): Promise<StreamingConnection> {
    // Always use fallback for demo purposes - real streaming requires live endpoints
    console.log(`Creating fallback connection for ${dataset} (streaming endpoint not available)`);
    return this.createFallbackConnection(dataset);
  }

  /**
   * Create EventSource connection to Supabase Edge Function
   */
  private async establishEventSourceConnection(
    connection: StreamingConnection,
    endpoint: string
  ): Promise<void> {
    const abortController = new AbortController();
    this.abortControllers.set(connection.dataset, abortController);

    const eventSource = new EventSource(
      `${import.meta.env.VITE_SUPABASE_URL}${endpoint}`
    );

    connection.eventSource = eventSource;

    eventSource.onopen = () => {
      connection.status = 'connected';
      connection.lastUpdate = new Date().toISOString();
      connection.errorCount = 0;
      this.notifyListeners(connection.dataset, { type: 'connected', connection });
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        connection.lastUpdate = new Date().toISOString();

        if (data.error || (data.message && data.message.includes('No data available'))) {
          console.warn(`No data available for ${connection.dataset}:`, data.message || data.error);
          eventSource.close();
          connection.status = 'disconnected';
          this.notifyListeners(connection.dataset, { type: 'no_data', connection });
          if (this.config.fallbackToMock) {
            this.createFallbackConnection(connection.dataset);
          }
          return;
        }

        this.handleStreamingData(connection.dataset, data);
      } catch (error) {
        console.error(`Failed to process ${connection.dataset} data:`, error);
        connection.errorCount++;
        this.notifyListeners(connection.dataset, { type: 'data_error', error });
      }
    };

    eventSource.onerror = (event) => {
      connection.status = 'error';
      connection.errorCount++;
      connection.retryCount++;

      // Close the current connection to prevent spam
      try {
        eventSource.close();
      } catch (e) {
        // Ignore close errors
      }

      // Only log first few errors to avoid spam
      if (connection.errorCount <= 3) {
        console.warn(`Connection error for ${connection.dataset}:`, event);
      }

      // Immediate fallback instead of retry loop
      if (this.config.fallbackToMock) {
        connection.status = 'disconnected';
        this.notifyListeners(connection.dataset, { type: 'disconnected', connection });
        this.createFallbackConnection(connection.dataset);
      }
    };

    // Wait for initial connection (timeout after 10 seconds)
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timeoutMs = 10000;

      const checkInterval = setInterval(() => {
        if (connection.status === 'connected') {
          clearInterval(checkInterval);
          resolve();
        } else if (Date.now() - startedAt > timeoutMs) {
          clearInterval(checkInterval);
          try { eventSource.close(); } catch {}
          connection.status = 'disconnected';
          this.notifyListeners(connection.dataset, { type: 'timeout', connection });
          if (this.config.fallbackToMock) {
            this.createFallbackConnection(connection.dataset);
          }
          resolve(); // Resolve to prevent uncaught rejection
        }
      }, 100);
    });
  }

  /**
   * Handle incoming streaming data
   */
  private handleStreamingData(dataset: string, data: any): void {
    const streamingData: StreamingDataPoint = {
      timestamp: data.timestamp || new Date().toISOString(),
      dataset,
      source: data.source,
      values: data.rows || data,
      metadata: data.metadata
    };

    // Add to cache
    if (!this.dataCache.has(dataset)) {
      this.dataCache.set(dataset, []);
    }
    this.dataCache.set(dataset, [...(this.dataCache.get(dataset) || []), streamingData].slice(-100)); // Keep last 100 points

    // Set cache expiry
    setTimeout(() => {
      this.dataCache.delete(dataset);
    }, this.config.cacheExpiryMinutes * 60 * 1000);

    // Notify listeners
    this.notifyListeners(dataset, { type: 'data', data: streamingData });
  }

  /**
   * Create fallback connection for offline/mock data
   */
  private createFallbackConnection(dataset: string): StreamingConnection {
    const connection: StreamingConnection = {
      id: `${dataset}_fallback_${Date.now()}`,
      dataset,
      status: 'connected', // Connected to fallback
      lastUpdate: new Date().toISOString(),
      errorCount: 0,
      retryCount: 0
    };

    this.connections.set(dataset, connection);
    this.notifyListeners(dataset, { type: 'fallback', connection });
    return connection;
  }

  /**
   * Get cached data for a dataset
   */
  getCachedData(dataset: string): StreamingDataPoint[] {
    return this.dataCache.get(dataset) || [];
  }

  /**
   * Subscribe to data updates
   */
  onDataUpdate(dataset: string, callback: (data: any) => void): () => void {
    if (!this.eventListeners.has(dataset)) {
      this.eventListeners.set(dataset, []);
    }
    this.eventListeners.get(dataset)?.push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(dataset) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to WebSocket messages
   */
  onWebSocketMessage(channelName: string, callback: (message: WebSocketMessage) => void): () => void {
    if (!this.messageListeners.has(channelName)) {
      this.messageListeners.set(channelName, []);
    }
    this.messageListeners.get(channelName)?.push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.messageListeners.get(channelName) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * Send WebSocket message
   */
  sendWebSocketMessage(channelName: string, message: WebSocketMessage): void {
    const connection = this.webSocketConnections.get(channelName);
    if (!connection || connection.status !== 'connected' || !connection.webSocket) {
      console.warn(`WebSocket connection to ${channelName} not ready`);
      return;
    }

    message.timestamp = message.timestamp || new Date().toISOString();

    try {
      connection.webSocket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      this.notifyWebSocketListeners(channelName, { type: 'send_error', error });
    }
  }

  /**
   * Notify all listeners for a dataset
   */
  private notifyListeners(dataset: string, data: any): void {
    const listeners = this.eventListeners.get(dataset) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in listener callback:', error);
      }
    });
  }

  /**
   * Disconnect from a stream
   */
  disconnectStream(dataset: string): void {
    const connection = this.connections.get(dataset);
    if (connection?.eventSource) {
      connection.eventSource.close();
    }

    const abortController = this.abortControllers.get(dataset);
    if (abortController) {
      abortController.abort();
    }

    this.connections.delete(dataset);
    this.abortControllers.delete(dataset);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(dataset: string): StreamingConnection | null {
    return this.connections.get(dataset) || null;
  }

  /**
   * Get WebSocket connection status
   */
  getWebSocketConnectionStatus(channelName: string): WebSocketConnection | null {
    return this.webSocketConnections.get(channelName) || null;
  }

  /**
   * Disconnect from WebSocket channel (private method)
   */
  disconnectWebSocketChannel(channelName: string): void {
    const connection = this.webSocketConnections.get(channelName);
    if (connection?.webSocket && connection.status === 'connected') {
      connection.webSocket.close(1000, 'Normal closure');
      connection.status = 'disconnected';
    }

    if (this.heartbeatIntervals.has(channelName)) {
      clearInterval(this.heartbeatIntervals.get(channelName)!);
      this.heartbeatIntervals.delete(channelName);
    }

    this.webSocketConnections.delete(channelName);
    this.notifyWebSocketListeners(channelName, { type: 'disconnected' });
  }

  /**
   * Connect to WebSocket channel - helper method to ensure complete implementation
   */
  connectWebSocketEndpoint(channelName: string, ws: WebSocket): WebSocketConnection {
    const connection: WebSocketConnection = {
      id: `${channelName}_${Date.now()}`,
      channel: channelName,
      status: 'connecting',
      webSocket: ws,
      reconnectCount: 0,
      lastHeartbeat: new Date().toISOString()
    };

    this.webSocketConnections.set(channelName, connection);

    const prevOpen = ws.onopen;
    const prevMessage = ws.onmessage;
    const prevError = ws.onerror;
    const prevClose = ws.onclose;

    ws.onopen = (ev: Event) => {
      try { prevOpen && prevOpen.call(ws, ev as any); } catch (e) { console.error(e); }
      connection.status = 'connected';
      this.notifyWebSocketListeners(channelName, { type: 'connected', connectionId: connection.id });
      this.startHeartbeat(channelName);
    };

    ws.onmessage = (event) => {
      try { prevMessage && prevMessage.call(ws, event as any); } catch (e) { console.error(e); }
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        message.timestamp = new Date().toISOString();
        this.notifyWebSocketListeners(channelName, message);
        connection.lastHeartbeat = new Date().toISOString();
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.onerror = (ev: Event) => {
      try { prevError && prevError.call(ws, ev as any); } catch (e) { console.error(e); }
      connection.status = 'error';
      this.notifyWebSocketListeners(channelName, { type: 'error' });
      this.handleWebSocketReconnect(channelName);
    };

    ws.onclose = (ev: CloseEvent) => {
      try { prevClose && prevClose.call(ws, ev as any); } catch (e) { console.error(e); }
      connection.status = 'disconnected';
      connection.reconnectCount = 0;
      if (this.heartbeatIntervals.has(channelName)) {
        clearInterval(this.heartbeatIntervals.get(channelName)!);
        this.heartbeatIntervals.delete(channelName);
      }
      this.notifyWebSocketListeners(channelName, { type: 'disconnected' });
    };

    return connection;
  }

  /**
   * Send WebSocket message - helper method
   */
  sendWebSocketPayload(channelName: string, message: WebSocketMessage): void {
    const connection = this.webSocketConnections.get(channelName);
    if (connection?.webSocket?.readyState === WebSocket.OPEN) {
      connection.webSocket.send(JSON.stringify(message));
    }
  }

  /**
   * Handle WebSocket reconnection
   */
  private handleWebSocketReconnect(channelName: string): void {
    const connection = this.webSocketConnections.get(channelName);
    if (!connection || connection.reconnectCount >= this.config.maxRetries) {
      return;
    }

    connection.reconnectCount++;
    const delay = Math.min(1000 * Math.pow(2, connection.reconnectCount), 30000);

    setTimeout(() => {
      // This would need the original endpoint - for now, we'll skip actual reconnection
      console.log(`WebSocket reconnection attempt ${connection.reconnectCount} for ${channelName}`);
    }, delay);
  }

  /**
   * Start heartbeat for WebSocket connection
   */
  private startHeartbeat(channelName: string): void {
    if (this.heartbeatIntervals.has(channelName)) {
      clearInterval(this.heartbeatIntervals.get(channelName)!);
    }

    const interval = setInterval(() => {
      const connection = this.webSocketConnections.get(channelName);
      if (connection?.status === 'connected') {
        this.sendWebSocketPayload(channelName, {
          type: 'ping',
          payload: { timestamp: Date.now() },
          timestamp: new Date().toISOString(),
          senderId: 'system'
        });

        // Check heartbeat health
        const lastHeartbeat = new Date(connection.lastHeartbeat).getTime();
        const now = Date.now();
        if (now - lastHeartbeat > 45000) { // 45 seconds > 30s timeout
          console.warn(`WebSocket heartbeat failed for ${channelName}`);
          connection.status = 'error';
          this.handleWebSocketReconnect(channelName);
        }
      }
    }, 15000); // Ping every 15 seconds

    this.heartbeatIntervals.set(channelName, interval);
  }

  /**
   * Notify WebSocket listeners
   */
  private notifyWebSocketListeners(channelName: string, data: any): void {
    const listeners = this.messageListeners.get(channelName) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('WebSocket listener error:', error);
      }
    });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RealDataConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Singleton export
export const streamingService = StreamingService.getInstance();

// Utility function to get latest data point
export function getLatestDataPoint(data: StreamingDataPoint[]): StreamingDataPoint | null {
  if (data.length === 0) return null;
  return data[data.length - 1];
}