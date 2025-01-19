import { ClientOptions } from 'ws';
import { SocketTransportOptions } from '../SocketTransport.js';

export interface RXClientOptions extends SocketTransportOptions, ClientOptions {
  url?: string;
  reconnectDelay?: number;
}
