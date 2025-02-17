import { TrackedObservable } from '../TrackedObservable.js';
import { EventName } from '../RXSocketEvent.js';
import { RXServerClientEvent } from './RXServerClientEvent.js';
import { RXServerClientMessage } from './RXServerClientMessage.js';
import { RXServerClient } from './RXServerClient.js';

export class RXServerClientEventImpl<I = any, O = any>
  extends TrackedObservable<RXServerClientMessage<I, O>>
  implements RXServerClientEvent<I, O>
{
  constructor(
    protected readonly sender: RXServerClient,
    public readonly name: EventName,
  ) {
    super();
  }

  send(data?: O) {
    return this.sender.send(this.name, data);
  }

  sendForResult<I2 = I, O2 = O>(
    data: O2,
    options?: any,
  ): Promise<RXServerClientMessage<I2, O2>> {
    return this.sender.sendForResult(this.name, data, options);
  }

  protected override onChange(): void {}
}
