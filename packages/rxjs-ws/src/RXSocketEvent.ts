import { Observable } from 'rxjs';
import { RXMessage } from './RXSocketMessage.js';
export const SUBSCRIBTION_EVENT_NAME = '__sub';
export type EventName = string | number;

export interface RXEvent<
  I = any,
  O = any,
  M extends RXMessage<I, O> = RXMessage<I, O>,
> extends Observable<M> {
  readonly name: EventName;

  send(data?: O): Promise<void>;
}
