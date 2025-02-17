import { Subject } from 'rxjs';
import { SendForResultOptions } from '../RXSocket.js';
import { TrackedObservable } from '../TrackedObservable.js';
import { RXServerEvent } from './RXServerEvent.js';
import { EventName, SUBSCRIBTION_EVENT_NAME } from '../RXSocketEvent.js';
import { RXServer } from './RXServer.js';
import { RXServerClient } from './RXServerClient.js';
import { RXServerClientMessage } from './RXServerClientMessage.js';

export class RXServerEventImpl<I = any, O = any>
  extends TrackedObservable<RXServerClientMessage<I, O>>
  implements RXServerEvent<I, O>
{
  readonly remoteSubscribe$: Subject<RXServerClientMessage<any>> =
    new Subject();
  readonly remoteSubscribers = new Set<RXServerClient>();

  constructor(
    protected readonly sender: RXServer,
    public readonly name: EventName,
  ) {
    super();
  }

  send(data?: O | undefined): Promise<void> {
    return this.sender.broadcast(this.name, data);
  }

  toggleRemoteSub(socket: RXServerClient, bool: boolean) {
    const message: RXServerClientMessage<any> = {
      id: 0,
      event: socket.event(SUBSCRIBTION_EVENT_NAME),
      socket,
      data: bool,
      send: (data: any) => socket.send(this.name, data),
      sendForResult: (data: any, options?: SendForResultOptions) =>
        socket.sendForResult(data, options),
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
