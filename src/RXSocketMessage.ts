import { RXSocket } from "./RXSocket";
import { RXSocketEvent } from "./RXSocketEvent";

export interface RXSocketMessage<I, O = any> {
    
    readonly id: number;
    readonly event: RXSocketEvent<I, O>;
    readonly socket: RXSocket;
    readonly data: I;
    send(data: O): Promise<void>;
    sendForResult<I2 = I, O2 = O>(data: O): Promise<RXSocketMessage<I2, O2>>;

}