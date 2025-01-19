import { RXMessage } from '../RXSocketMessage.js';
import { RXClientEvent } from './RXClientEvent.js';

export interface RXClientMessage<I, O = unknown> extends RXMessage<I, O> {
  readonly event: RXClientEvent<I, O>;
  sendForResult<I2 = I, O2 = O>(data: O2): Promise<RXClientMessage<I2, O2>>;
}
