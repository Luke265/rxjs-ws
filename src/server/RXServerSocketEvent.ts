import { Subject } from "rxjs";
import { RXSocket } from "../RXSocket";
import { RXSocketEventBase } from '../RXSocketEventBase';

export class RXServerSocketEvent<I = any, O = any> extends RXSocketEventBase<I, O> {

    readonly remoteSubscribe$: Subject<RXSocket> = new Subject();
    readonly remoteSubscribers: Set<RXSocket> = new Set();

    toggleRemoteSub(socket: RXSocket, bool: boolean) {
        if (bool) {
            this.remoteSubscribe$.next(socket);
            this.remoteSubscribers.add(socket);
        } else {
            this.remoteSubscribers.delete(socket);
        }
    }

}