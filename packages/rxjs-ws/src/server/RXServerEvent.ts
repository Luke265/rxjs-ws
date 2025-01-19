import { Observable } from 'rxjs';
import { EventName, RXEvent } from '../RXSocketEvent.js';
import { RXServerClient } from './RXServerClient.js';
import { RXServerClientMessage } from './RXServerClientMessage.js';

export interface RXServerEvent<I = any, O = any>
  extends RXEvent<I, O, RXServerClientMessage<I, O>> {
  readonly name: EventName;
  readonly remoteSubscribe$: Observable<RXServerClientMessage<any>>;
  readonly remoteSubscribers: ReadonlySet<RXServerClient>;

  send(data?: O): Promise<void>;
}
