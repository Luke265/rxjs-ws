import { Observable } from 'rxjs';
import { RXMessage } from './RXSocketMessage.js';
import { EventName, RXEvent } from './RXSocketEvent.js';
import { CloseEvent, WebSocket } from 'ws';

export interface SendForResultOptions {
  timeout?: number;
}

export interface RXSocket {
  readonly raw: WebSocket;
  readonly message$: Observable<RXMessage<any>>;
  readonly close$: Observable<CloseEvent>;
  readonly error$: Observable<Error>;
  readonly open$: Observable<any>;
  readonly readyState: number;
  destroy(): Promise<void>;
  close(code?: number, data?: string | Buffer): void;
  event<I, O = any>(name: EventName | RXEvent<I, O>): RXEvent<I, O>;
  sendRaw(data: any): Promise<void>;
  send(event: EventName, data: any): Promise<void>;
  sendForResult<I, O>(
    event: EventName,
    data: any,
    options?: SendForResultOptions
  ): Promise<RXMessage<I, O>>;
}
