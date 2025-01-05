import { CustomSubject } from './CustomSubject.js';
import { RXSocket } from './RXSocket.js';
import { RXSocketMessage } from './RXSocketMessage.js';
import { EventName, RXSocketEvent } from './RXSocketEvent.js';

export abstract class RXSocketEventBase<I = any, O = any>
  extends CustomSubject<RXSocketMessage<I, O>>
  implements RXSocketEvent<I, O>
{
  constructor(sender: RXSocket, public readonly name: EventName) {
    super();
    this.send = sender.send.bind(sender, name);
    this.sendForResult = sender.sendForResult.bind(sender, name) as any;
  }

  send: (data?: O, socket?: RXSocket | Iterable<RXSocket>) => Promise<void>;
  sendForResult<K, V>(_?: O, __?: RXSocket): Promise<RXSocketMessage<K, V>> {
    return Promise.resolve() as any;
  }
}
