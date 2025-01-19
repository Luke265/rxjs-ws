import { RXSocket } from './RXSocket.js';
import { RXEvent } from './RXSocketEvent.js';

export interface RXMessage<I, O = unknown> {
  readonly id: number;
  readonly event: RXEvent<I, O>;
  readonly socket: RXSocket;
  readonly data: I;
  send(data: O): Promise<void>;
  sendForResult<I2 = I, O2 = O>(
    data: O2,
    options?: any
  ): Promise<RXMessage<I2, O2>>;
}
