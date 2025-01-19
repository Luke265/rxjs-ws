import { Observable, Observer } from 'rxjs';

export abstract class TrackedObservable<T> extends Observable<T> {
  readonly observers: Set<Observer<T>> = new Set();

  constructor() {
    super((s) => {
      this.observers.add(s);
      this.onChange();
      return () => {
        this.observers.delete(s);
        this.onChange();
      };
    });
  }

  next(value: T) {
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

  protected abstract onChange(): void;
}
