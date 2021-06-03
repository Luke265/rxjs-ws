import WebSocketType = require('ws');

export interface RXSocketClientOptions {
    socket?: WebSocketType;
    url?: string;
    reconnect?: number;
    responseTimeout?: number;
    queueTimeout?: number;
    queueLength?: number;
}
