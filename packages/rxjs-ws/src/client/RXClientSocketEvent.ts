import { RXSocketEventBase } from '../RXSocketEventBase.js';
import { RXSocketClient } from './RXSocketClient.js';
import { RXSocketMessage } from '../RXSocketMessage.js';
import { Observer, Subscriber, Subscription } from 'rxjs';
import { ReadyState } from '../ReadyState.js';
import { SUBSCRIBTION_EVENT_NAME } from '../RXSocketEvent.js';

export class RXClientSocketEvent<I = any, O = any> extends RXSocketEventBase<
  I,
  O
> {
  private lastState = false;

  constructor(private sender: RXSocketClient, name: string) {
    super(sender, name);
    // TODO: unsub somewhere?
    this.sender.open$.subscribe(this.checkSub.bind(this, true));
  }

  override _subscribe(
    subscriber: Subscriber<RXSocketMessage<I, O>>
  ): Subscription {
    const result = super._subscribe(subscriber);
    this.checkSub();
    return result;
  }

  override _removeObserver(subscriber: Observer<RXSocketMessage<I, O>>) {
    super._removeObserver(subscriber);
    this.checkSub();
  }

  private checkSub(force?: boolean) {
    const bool = this.observers.size > 0;
    if (
      this.sender.readyState === ReadyState.OPEN &&
      (this.lastState !== bool || force)
    ) {
      this.sender.send(SUBSCRIBTION_EVENT_NAME, [this.name, bool]);
      this.lastState = bool;
    }
  }
}
