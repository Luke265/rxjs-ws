import { RXSocketSender, SendForResultOptions } from './RXSocket.js';
import { RXSocketMessage } from './RXSocketMessage.js';
import { EventName, RXSocketEvent } from './RXSocketEvent.js';
import { Observable, Observer } from 'rxjs';

export abstract class RXSocketEventBase<I = any, O = any>
  extends Observable<RXSocketMessage<I, O>>
  implements RXSocketEvent<I, O>
{
  readonly observers: Set<Observer<RXSocketMessage<I, O>>> = new Set();

  constructor(
    protected readonly sender: RXSocketSender,
    public readonly name: EventName
  ) {
    super((s) => {
      this.observers.add(s);
      this.onChange();
      return () => {
        this.observers.delete(s);
        this.onChange();
      };
    });
  }

  next(value: RXSocketMessage<I, O>) {
    for (const o of this.observers) {
      o.next(value);
    }
  }

  error(value: unknown) {
    for (const o of this.observers) {
      o.error(value);
    }
  }

  complete() {
    for (const o of this.observers) {
      o.complete();
    }
  }

  send(data?: O) {
    return this.sender.send(this.name, data);
  }

  sendForResult<K, V>(
    data?: O,
    options?: SendForResultOptions
  ): Promise<RXSocketMessage<K, V>> {
    return this.sender.sendForResult(this.name, data, options);
  }

  protected abstract onChange(): void;
}
