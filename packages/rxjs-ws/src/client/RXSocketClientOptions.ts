import type WebSocketType from 'ws';

export interface RXSocketClientOptions {
  socket?: WebSocketType;
  url?: string;
  reconnectDelay?: number;
  responseTimeout?: number;
  queueTimeout?: number;
  queueLength?: number;
}
