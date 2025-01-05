import { RXSocketEventBase } from '../RXSocketEventBase.js';
import { RXSocketClient } from './RXSocketClient.js';
import { ReadyState } from '../ReadyState.js';
import { EventName, SUBSCRIBTION_EVENT_NAME } from '../RXSocketEvent.js';

export class RXClientSocketEvent<I = any, O = any> extends RXSocketEventBase<
  I,
  O
> {
  private lastState = false;

  constructor(sender: RXSocketClient, name: EventName) {
    super(sender, name);
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
}
