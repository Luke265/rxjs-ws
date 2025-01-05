import { RXSocket } from './RXSocket.js';
import { RXSocketEvent } from './RXSocketEvent.js';

export interface RXSocketMessage<I, O = unknown> {
  readonly id: number;
  readonly event: RXSocketEvent<I, O>;
  readonly socket: RXSocket;
  readonly data: I;
  send(data: O): Promise<void>;
  sendForResult<I2 = I, O2 = O>(data: O2): Promise<RXSocketMessage<I2, O2>>;
}
