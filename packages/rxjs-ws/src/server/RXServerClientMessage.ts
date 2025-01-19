import { RXMessage } from '../RXSocketMessage.js';
import { RXServerClient } from './RXServerClient.js';
import { RXServerClientEvent } from './RXServerClientEvent.js';

export interface RXServerClientMessage<I, O = unknown> extends RXMessage<I, O> {
  readonly event: RXServerClientEvent<I, O>;
  readonly socket: RXServerClient;
  sendForResult<I2 = I, O2 = O>(
    data: O2,
    options?: any
  ): Promise<RXServerClientMessage<I2, O2>>;
}
