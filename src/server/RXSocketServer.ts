import { Subject, Observable, merge } from 'rxjs';
import { RXSocket } from '../RXSocket';
import { RXSocketMessage } from '../RXSocketMessage';
import { RXServerSocketEvent } from './RXServerSocketEvent';
import { RXServerSocketClient } from './RXSocketServerClient';
import { RXClientSocketEvent } from '../client/RXClientSocketEvent';
import { IncomingMessage } from 'http';
import WebSocket = require('ws');
import { take } from 'rxjs/operators';
import { EventName } from '../RXSocketEvent';

export class RXSocketServer implements RXSocket {

    readonly message$: Subject<RXSocketMessage<any, any>> = new Subject();
    readonly connection$: Subject<RXSocket> = new Subject();
    readonly sockets: RXServerSocketClient[] = [];
    readonly readyState = WebSocket.OPEN;
    readonly close$: Observable<any> = new Subject();
    readonly open$: Observable<any> = new Subject();
    readonly error$: Observable<any> = new Subject();
    readonly listening$: Observable<any> = new Subject();

    private readonly events: { [name: string]: RXServerSocketEvent<any> } = {};
    private server: WebSocket.Server | null = null;

    constructor(public options: WebSocket.ServerOptions = {}) {
    }

    listen() {
        if (this.server) {
            throw new Error('Already started');
        }
        this.server = new WebSocket.Server(this.options);
        this.server.on('connection', (webSocket, request) => {
            const socket = this.wrapSocket(webSocket, request);
            socket.message$.subscribe((message: RXSocketMessage<any, any>) => {
                const event = this.events[message.event.name];
                if (message.event.name === RXClientSocketEvent.SUBSCRIBTION_EVENT_NAME) {
                    return this.toggleSub(socket, message.data[0], message.data[1]);
                } else if (event) {
                    event.next(message);
                }
                this.message$.next(message);
            });
            socket.close$.subscribe(() => {
                const idx = this.sockets.indexOf(socket);
                if (idx !== -1) {
                    this.sockets.splice(idx, 1);
                }
                for (const p in this.events) {
                    this.toggleSub(socket, p, false);
                }
                for (const p in socket.events) {
                    this.toggleSub(socket, p, false);
                }
            });
            this.sockets.push(socket);
            this.connection$.next(socket);
        });
        this.server.on('listening', () => (this.listening$ as Subject<void>).next());
        this.server.on('close', () => (this.close$ as Subject<void>).next());
        this.server.on('error', (_: WebSocket, error: Error) => (this.error$ as Subject<any>).next(error));
        setInterval(this.sendRaw.bind(this, this.serialize(0, 0)), 50_000);
        return merge(this.listening$, this.close$, this.error$).pipe(take(1)).toPromise();
    }

    close() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }

    event<I = any, O = any>(event: EventName): RXServerSocketEvent<I, O> {
        return this.events[event] || (this.events[event] = new RXServerSocketEvent(this, event));
    }

    protected wrapSocket(socket: WebSocket, request: IncomingMessage) {
        return new RXServerSocketClient(
            socket,
            request
        );
    }

    protected serialize(id: number, event: EventName, data?: any) {
        return JSON.stringify([id, event, data]);
    }

    protected deserialize(data: any) {
        return JSON.parse(data);
    }

    public async send(event: EventName, data?: any) {
        data = this.serialize(0, event, data);
        for (const socket of this.event(event).remoteSubscribers) {
            socket.sendRaw(data);
        }
    }

    public sendForResult<I, O>(event: EventName, data: any, socket?: RXSocket) {
        if (!socket) {
            throw new Error('Destination socket must be specified');
        }
        return socket.sendForResult<I, O>(event, data);
    }

    public async sendRaw(data: any) {
        for (const socket of this.sockets) {
            socket.sendRaw(data);
        }
    }

    private toggleSub(socket: RXServerSocketClient, name: string, subscribing: boolean) {
        socket.event(name).toggleRemoteSub(socket, subscribing);
        this.event(name).toggleRemoteSub(socket, subscribing);
    }

}