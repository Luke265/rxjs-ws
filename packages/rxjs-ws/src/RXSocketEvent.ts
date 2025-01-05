import { Observable } from 'rxjs';
import { RXSocket, SendForResultOptions } from './RXSocket.js';
import { RXSocketMessage } from './RXSocketMessage.js';
export const SUBSCRIBTION_EVENT_NAME = '__sub';
export type EventName = string | number;

export interface RXSocketEvent<I = any, O = any>
  extends Observable<RXSocketMessage<I, O>> {
  readonly name: EventName;

  send(data?: O, socket?: RXSocket | Iterable<RXSocket>): Promise<void>;
  sendForResult<K = I, V = O>(
    data?: O,
    options?: SendForResultOptions
  ): Promise<RXSocketMessage<K, V>>;
}
