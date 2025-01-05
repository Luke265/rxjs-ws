import { Observable } from 'rxjs';
import { RXSocket } from '../RXSocket.js';
import { RXSocketEvent } from '../RXSocketEvent.js';
import { RXSocketMessage } from '../RXSocketMessage.js';

export interface RXServerSocketEvent<I = any, O = any>
  extends RXSocketEvent<I, O>,
    Observable<RXSocketMessage<I, O>> {
  readonly remoteSubscribe$: Observable<RXSocketMessage<any>>;
  readonly remoteSubscribers: ReadonlySet<RXSocket>;
  toggleRemoteSub(socket: RXSocket, bool: boolean): void;
}
