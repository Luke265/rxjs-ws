import { RXSocketEventBase } from '../RXSocketEventBase';
import { RXSocketClient } from './RXSocketClient';
import { RXSocketMessage } from '../RXSocketMessage';
import { Observer, Subscriber, Subscription } from 'rxjs';
import { ReadyState } from '../ReadyState';

export class RXClientSocketEvent<I = any, O = any> extends RXSocketEventBase<I, O> {

    static SUBSCRIBTION_EVENT_NAME = '__sub';

    private lastState = false;

    constructor(
        private sender: RXSocketClient,
        name: string
    ) {
        super(sender, name);
        // TODO: unsub somewhere?
        this.sender.open$.subscribe(this.checkSub.bind(this, true));
    }

    _subscribe(subscriber: Subscriber<RXSocketMessage<I, O>>): Subscription {
        const result = super._subscribe(subscriber);
        this.checkSub();
        return result;
    }

    _removeObserver(subscriber: Observer<RXSocketMessage<I, O>>) {
        super._removeObserver(subscriber);
        this.checkSub();
    }

    private checkSub(force?: boolean) {
        const bool = this.observers.size > 0;
        if (this.sender.readyState === ReadyState.OPEN && (this.lastState !== bool || force)) {
            this.sender.send(RXClientSocketEvent.SUBSCRIBTION_EVENT_NAME, [this.name, bool]);
            this.lastState = bool;
        }
    }

}