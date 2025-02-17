import { Subject, merge, firstValueFrom } from 'rxjs';
import { RXServerEvent } from './RXServerEvent.js';
import { RXServerClient } from './RXServerClient.js';
import WebSocket from 'ws';
import {
  EventName,
  RXEvent,
  SUBSCRIBTION_EVENT_NAME,
} from '../RXSocketEvent.js';
import { RXServerEventImpl } from './RXServerEventImpl.js';
import { RXServerClientMessage } from './RXServerClientMessage.js';

export class RXServer {
  readonly message$: Subject<RXServerClientMessage<any, any>> = new Subject();
  readonly connection$: Subject<RXServerClient> = new Subject();
  readonly sockets: RXServerClient[] = [];
  readonly readyState = WebSocket.OPEN;
  private readonly _close$ = new Subject<void>();
  private readonly _open$ = new Subject<void>();
  private readonly _error$ = new Subject<Error>();
  private readonly _listening$ = new Subject<void>();

  readonly close$ = this._close$.asObservable();
  readonly open$ = this._open$.asObservable();
  readonly error$ = this._error$.asObservable();
  readonly listening$ = this._listening$.asObservable();

  private readonly events: { [name: string]: RXServerEventImpl<any> } = {};
  private server?: WebSocket.Server | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(private readonly options: WebSocket.ServerOptions = {}) {}

  listen() {
    if (this.server) {
      throw new Error('Already started');
    }
    this.server = new WebSocket.Server(this.options);
    this.server.on('connection', (webSocket, request) => {
      const socket = new RXServerClient(webSocket, request);
      socket
        .event<[string, boolean]>(SUBSCRIBTION_EVENT_NAME)
        .subscribe((message) =>
          this.toggleSub(socket, message.data[0], message.data[1])
        );
      socket.message$.subscribe((message) => {
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
      this.broadcastRaw.bind(this, this.serialize(0, 0)),
      50_000
    );
    return firstValueFrom(merge(this.listening$, this.close$, this.error$));
  }

  close(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      clearInterval(this.heartbeatTimer ?? undefined);
      for (const s of this.sockets) {
        try {
          s.close();
        } catch (e) {
          /** ignore */
        }
      }
      this.server.close((e) => (e ? reject(e) : resolve()));
      this.server = undefined;
    });
  }

  event<I = any, O = any>(name: EventName | RXEvent): RXServerEvent<I, O> {
    if (typeof name === 'object' && 'name' in name) {
      name = name.name;
    }
    return (this.events[name] ??= new RXServerEventImpl(this, name));
  }

  protected serialize(id: number, event: EventName, data?: any) {
    return JSON.stringify([id, event, data]);
  }

  public async broadcast(event: EventName, data?: any) {
    const subs = this.event(event).remoteSubscribers;
    if (subs.size === 0) {
      return;
    }
    data = this.serialize(0, event, data);
    for (const socket of subs) {
      socket.sendRaw(data);
    }
  }

  public async broadcastRaw(data: any) {
    return Promise.allSettled(this.sockets.map((s) => s.sendRaw(data)));
  }

  private toggleSub(
    socket: RXServerClient,
    name: string,
    subscribing: boolean
  ) {
    (this.event(name) as RXServerEventImpl).toggleRemoteSub(
      socket,
      subscribing
    );
  }
}
