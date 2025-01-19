import { RXEvent } from '../RXSocketEvent.js';
import { SendForResultOptions } from '../RXSocket.js';
import { RXClientMessage } from './RXClientMessage.js';

export interface RXClientEvent<I = any, O = any>
  extends RXEvent<I, O, RXClientMessage<I, O>> {
  sendForResult<K, V>(
    data?: O,
    options?: SendForResultOptions
  ): Promise<RXClientMessage<K, V>>;
}
