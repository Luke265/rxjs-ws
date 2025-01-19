import { ReadyState } from '../ReadyState.js';
import { SendForResultOptions } from '../RXSocket.js';
import { EventName, SUBSCRIBTION_EVENT_NAME } from '../RXSocketEvent.js';
import { TrackedObservable } from '../TrackedObservable.js';
import { RXClient } from './RXClient.js';
import { RXClientEvent } from './RXClientEvent.js';
import { RXClientMessage } from './RXClientMessage.js';

export class RXClientEventImpl<I = any, O = any>
  extends TrackedObservable<RXClientMessage<I, O>>
  implements RXClientEvent<I, O>
{
  private lastState = false;

  constructor(
    protected readonly sender: RXClient,
    public readonly name: EventName
  ) {
    super();
    // TODO: unsub somewhere?
    this.sender.open$.subscribe(this.onChange.bind(this, true));
  }

  protected override onChange(force?: boolean): void {
    const bool = this.observers.size > 0;
    if (
      this.sender.readyState !== ReadyState.OPEN ||
      (this.lastState === bool && (!force || !bool))
    ) {
      return;
    }
    this.sender.send(SUBSCRIBTION_EVENT_NAME, [this.name, bool]);
    this.lastState = bool;
  }

  send(data?: O) {
    return this.sender.send(this.name, data);
  }

  sendForResult<K, V>(
    data?: O,
    options?: SendForResultOptions
  ): Promise<RXClientMessage<K, V>> {
    return this.sender.sendForResult(this.name, data, options);
  }
}
