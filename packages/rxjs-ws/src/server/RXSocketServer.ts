import { Subject, merge, firstValueFrom } from 'rxjs';
import { RXSocket, RXSocketSender } from '../RXSocket.js';
import { RXSocketMessage } from '../RXSocketMessage.js';
import { RXServerSocketEvent } from './RXServerSocketEvent.js';
import { RXServerSocketClient } from './RXSocketServerClient.js';
import { IncomingMessage } from 'http';
import WebSocket from 'ws';
import { EventName, SUBSCRIBTION_EVENT_NAME } from '../RXSocketEvent.js';
import { RXServerSocketEventImpl } from './RXServerSocketEventImpl.js';

export class RXSocketServer implements RXSocketSender {
  readonly message$: Subject<RXSocketMessage<any, any>> = new Subject();
  readonly connection$: Subject<RXSocket> = new Subject();
  readonly sockets: RXServerSocketClient[] = [];
  readonly readyState = WebSocket.OPEN;
  private readonly _close$ = new Subject<void>();
  private readonly _open$ = new Subject<void>();
  private readonly _error$ = new Subject<Error>();
  private readonly _listening$ = new Subject<void>();

  readonly close$ = this._close$.asObservable();
  readonly open$ = this._open$.asObservable();
  readonly error$ = this._error$.asObservable();
  readonly listening$ = this._listening$.asObservable();

  private readonly events: { [name: string]: RXServerSocketEventImpl<any> } =
    {};
  private server?: WebSocket.Server | null = null;
  private heartbeatTimer: NodeJS.Timer | null = null;

  constructor(public options: WebSocket.ServerOptions = {}) {}

  listen() {
    if (this.server) {
      throw new Error('Already started');
    }
    this.server = new WebSocket.Server(this.options);
    this.server.on('connection', (webSocket, request) => {
      const socket = this.wrapSocket(webSocket, request);
      socket
        .event<[string, boolean]>(SUBSCRIBTION_EVENT_NAME)
        .subscribe((message) => {
          this.toggleSub(socket, message.data[0], message.data[1]);
        });
      socket.message$.subscribe((message: RXSocketMessage<any, any>) => {
        const event = this.events[message.event.name];
        if (event) {
          event.next(message);
        }
        this.message$.next(message);
      });
      socket.close$.subscribe(async () => {
        const idx = this.sockets.indexOf(socket);
        if (idx !== -1) {
          this.sockets.splice(idx, 1);
        }
        for (const p in this.events) {
          this.toggleSub(socket, p, false);
        }
        await socket.destroy();
      });
      this.sockets.push(socket);
      this.connection$.next(socket);
    });
    this.server.on('listening', () => this._listening$.next());
    this.server.on('close', () => this._close$.next());
    this.server.on('error', (error: Error) => this._error$.next(error));
    this.heartbeatTimer = setInterval(
      this.sendRaw.bind(this, this.serialize(0, 0)),
      50_000
    );
    return firstValueFrom(merge(this.listening$, this.close$, this.error$));
  }

  close() {
    if (!this.server) {
      return;
    }
    clearInterval(this.heartbeatTimer ?? undefined);
    this.server.close();
    this.server = undefined;
  }

  event<I = any, O = any>(event: EventName): RXServerSocketEvent<I, O> {
    return (this.events[event] ??= new RXServerSocketEventImpl(this, event));
  }

  protected wrapSocket(socket: WebSocket, request: IncomingMessage) {
    return new RXServerSocketClient(socket, request);
  }

  protected serialize(id: number, event: EventName, data?: any) {
    return JSON.stringify([id, event, data]);
  }

  protected deserialize(data: any) {
    return JSON.parse(data);
  }

  public async send(event: EventName, data?: any) {
    const subs = this.event(event).remoteSubscribers;
    if (subs.size === 0) {
      return;
      return;
    }
    data = this.serialize(0, event, data);
    for (const socket of subs) {
      socket.sendRaw(data);
    }
  }

  public sendForResult<I, O>(
    event: EventName,
    data: any
  ): Promise<RXSocketMessage<I, O>> {
    throw new Error('Cannot send for result');
  }

  public async sendRaw(data: any) {
    for (const socket of this.sockets) {
      socket.sendRaw(data);
    }
  }

  private toggleSub(
    socket: RXServerSocketClient,
    name: string,
    subscribing: boolean
  ) {
    socket.event(name).toggleRemoteSub(socket, subscribing);
    this.event(name).toggleRemoteSub(socket, subscribing);
  }
}
