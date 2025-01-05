import { Subject } from 'rxjs';
import { RXSocket, SendForResultOptions } from '../RXSocket.js';
import { RXSocketEventBase } from '../RXSocketEventBase.js';
import { RXServerSocketEvent } from './RXServerSocketEvent.js';
import { RXSocketMessage } from '../RXSocketMessage.js';

export class RXServerSocketEventImpl<I = any, O = any>
  extends RXSocketEventBase<I, O>
  implements RXServerSocketEvent<I, O>
{
  readonly remoteSubscribe$: Subject<RXSocketMessage<any>> = new Subject();
  readonly remoteSubscribers = new Set<RXSocket>();

  toggleRemoteSub(socket: RXSocket, bool: boolean) {
    const message: RXSocketMessage<any> = {
      id: 0,
      event: this,
      socket,
      data: bool,
      send: (data: any) => this.send(data),
      sendForResult: (data: any, options?: SendForResultOptions) =>
        this.sendForResult(data, options),
    };
    if (bool) {
      this.remoteSubscribers.add(socket);
      this.remoteSubscribe$.next(message);
    } else {
      this.remoteSubscribers.delete(socket);
    }
  }

  protected override onChange(): void {}
}
