import { RXSocketClient } from '../client/RXSocketClient.js';
import { RXServerSocketEvent } from './RXServerSocketEvent.js';
import { IncomingMessage } from 'http';
import WebSocket from 'ws';
import { EventName } from '../RXSocketEvent.js';

export class RXServerSocketClient extends RXSocketClient {
  override readonly events: { [name: string]: RXServerSocketEvent<unknown> } =
    {};

  constructor(socket: WebSocket, public readonly request: IncomingMessage) {
    super({ socket });
  }

  override event<I, O = unknown>(name: EventName): RXServerSocketEvent<I, O> {
    // we cannot be sure if output or input shape is valid
    return (this.events[name] ??= new RXServerSocketEvent(
      this,
      name
    )) as RXServerSocketEvent<I, O>;
  }
}
