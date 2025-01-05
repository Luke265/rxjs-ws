import { Subscription, Observer } from 'rxjs';
import { CustomSubject } from './CustomSubject.js';

export class CustomSubscription<T> extends Subscription {
  override closed = false;

  constructor(
    private subject: CustomSubject<T>,
    public subscriber: Observer<T>
  ) {
    super();
  }

  override unsubscribe() {
    if (this.closed) {
      return;
    }
    this.closed = true;

    const subject = this.subject;
    subject._removeObserver(this.subscriber);
  }
}
