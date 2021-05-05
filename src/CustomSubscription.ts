import { Subscription, Observer } from "rxjs";
import { CustomSubject } from "./CustomSubject";

export class CustomSubscription<T> extends Subscription {
    
    closed = false;

    constructor(private subject: CustomSubject<T>, public subscriber: Observer<T>) {
        super();
    }

    unsubscribe() {
        if (this.closed) {
            return;
        }
        this.closed = true;

        const subject = this.subject;
        subject._removeObserver(this.subscriber);
    }
    
}