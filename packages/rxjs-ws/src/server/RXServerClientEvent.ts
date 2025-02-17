import { EventName, RXEvent } from '../RXSocketEvent.js';
import { RXServerClientMessage } from './RXServerClientMessage.js';

export interface RXServerClientEvent<I = any, O = any>
  extends RXEvent<I, O, RXServerClientMessage<I, O>> {
  readonly name: EventName;

  send(data?: O): Promise<void>;
  sendForResult<I2 = I, O2 = O>(
    data: O2,
    options?: any,
  ): Promise<RXServerClientMessage<I2, O2>>;
}
