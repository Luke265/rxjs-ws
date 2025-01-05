import { Observable } from 'rxjs';
import { RXSocketMessage } from './RXSocketMessage.js';
import { EventName, RXSocketEvent } from './RXSocketEvent.js';
import { CloseEvent } from 'ws';

export interface SendForResultOptions {
  timeout?: number;
}

export interface RXSocketSender {
  readonly open$: Observable<any>;
  readonly readyState: number;
  event<I, O = any>(name: EventName): RXSocketEvent<I, O>;
  sendRaw(data: any): Promise<void>;
  send(event: EventName, data: any): Promise<void>;
  sendForResult<I, O>(
    event: EventName,
    data: any,
    options?: SendForResultOptions
  ): Promise<RXSocketMessage<I, O>>;
}

export interface RXSocket extends RXSocketSender {
  readonly options: { [key: string]: any };
  readonly message$: Observable<RXSocketMessage<any>>;
  readonly close$: Observable<CloseEvent>;
  readonly error$: Observable<Error>;
}
