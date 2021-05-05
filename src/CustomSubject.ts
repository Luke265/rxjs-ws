import { Observer, Subscriber, Subscription, Observable } from 'rxjs';
import { CustomSubscription } from './CustomSubscription';

export class CustomSubject<T> extends Observable<T> {

    readonly observers: Set<Observer<T>> = new Set();

    next(value: T) {
        for (const o of this.observers.values()) {
            o.next(value);
        }
    }

    _subscribe(subscriber: Subscriber<T>): Subscription {
        this.observers.add(subscriber);
        return new CustomSubscription(this, subscriber);
    }

    _removeObserver(subscriber: Observer<T>) {
        this.observers.delete(subscriber);
    }

}