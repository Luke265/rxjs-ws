import { Observable } from "rxjs";
import { RXSocketMessage } from "./RXSocketMessage";
import { EventName, RXSocketEvent } from './RXSocketEvent';

export interface RXSocket {

    readonly options: { [key: string]: any };
    readonly message$: Observable<RXSocketMessage<any>>;
    readonly close$: Observable<any>;
    readonly open$: Observable<any>;
    readonly readyState: number;

    event<I, O = any>(name: EventName): RXSocketEvent<I, O>;
    sendRaw(data: any): Promise<void>;
    send(event: EventName, data: any): Promise<void>;
    sendForResult<I, O>(event: EventName, data: any): Promise<RXSocketMessage<I, O>>;
    
}