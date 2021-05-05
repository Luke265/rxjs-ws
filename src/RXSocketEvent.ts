import { Observable } from "rxjs";
import { RXSocket } from "./RXSocket";
import { RXSocketMessage } from "./RXSocketMessage";

export type EventName = string | number;

export interface RXSocketEvent<I = any, O = any> extends Observable<RXSocketMessage<I, O>> {

    readonly name: EventName;

    next(message: RXSocketMessage<I, O>): void;
    send(data?: O, socket?: RXSocket | Iterable<RXSocket>): Promise<void>;
    sendForResult<K = I, V = O>(data?: O, socket?: RXSocket): Promise<RXSocketMessage<K, V>>;

}