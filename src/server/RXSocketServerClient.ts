import { RXSocketClient } from '../client/RXSocketClient';
import { RXServerSocketEvent } from './RXServerSocketEvent';
import { IncomingMessage } from 'http';
import WebSocket = require('ws');
import { EventName } from '../RXSocketEvent';

export class RXServerSocketClient extends RXSocketClient {

    readonly events: { [name: string]: RXServerSocketEvent<any> } = {};

    constructor(socket: WebSocket, public request: IncomingMessage) {
        super({ socket });
    }

    event<I, O = any>(name: EventName): RXServerSocketEvent<I, O> {
        return this.events[name] = this.events[name] || new RXServerSocketEvent(this, name);
    }

}