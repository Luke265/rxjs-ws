import { RXSocket, SendForResultOptions } from '../RXSocket.js';
import { firstValueFrom, Observable, Subject, timeout } from 'rxjs';
import { EventName, RXEvent } from '../RXSocketEvent.js';
import { RXClientEvent } from './RXClientEvent.js';
import { RXClientEventImpl } from './RXClientEventImpl.js';
import { ReadyState } from '../ReadyState.js';
import type WebSocketType from 'ws';
import { RXClientOptions } from './RXClientOptions.js';
import { CloseEvent } from 'ws';
import { SocketTransport } from '../SocketTransport.js';
import { RXClientMessage } from './RXClientMessage.js';

declare namespace globalThis {
  const WebSocket: { new (url: string): WebSocketType } | undefined;
}

export class RXClient implements RXSocket {
  readonly message$: Subject<RXClientMessage<any>>;
  readonly close$: Observable<CloseEvent>;
  readonly error$: Subject<any>;
  readonly open$: Subject<any>;

  private socket!: WebSocketType;
  private reconnect = false;
  private reconnectDelay = 0;
  private url: string | undefined;
  private reconnectTimer: NodeJS.Timeout | null = null;

  public get raw() {
    if (!this.socket) {
      throw new Error('Socket is not open');
    }
    return this.socket!!;
  }
  public options: { [key: string]: any } = {};

  get readyState() {
    if (this.socket) {
      return this.socket.readyState;
    }
    return 0;
  }

  private readonly transport: SocketTransport<
    RXClientEventImpl,
    RXClientMessage<any, any>
  >;

  constructor(options: RXClientOptions) {
    this.transport = new SocketTransport(this, options);
    this.url = options.url;
    this.reconnectDelay = options.reconnectDelay ?? 5_000;
    this.reconnect = this.reconnectDelay > 0;
    this.close$ = this.transport.close$;
    this.open$ = this.transport.open$;
    this.message$ = this.transport.message$;
    this.error$ = this.transport.error$;
    this.transport.close$.subscribe((event) => {
      if (event.code !== 1000 && this.reconnect) {
        this.doReconnect();
      } else if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
    });
    // allocate immediately, used only internally
    this.event(SocketTransport.EVENT_RESPONSE);
  }

  send(event: EventName, data: any) {
    return this.transport.sendRaw(this.transport.serialize(0, event, data));
  }

  async sendRaw(data: any) {
    return this.transport.sendRaw(data);
  }

  sendForResult<I, O>(
    event: EventName,
    data: I,
    options?: SendForResultOptions
  ): Promise<RXClientMessage<O, unknown>> {
    return this.transport.sendForResult(event, data, options);
  }

  event<I = any, O = any>(name: EventName | RXEvent): RXClientEvent<I, O> {
    if (typeof name === 'object' && 'name' in name) {
      name = name.name;
    }
    return (this.transport.events[name] ??= new RXClientEventImpl(this, name));
  }

  async open() {
    if (this.url) {
      if ('window' in globalThis && globalThis['WebSocket']) {
        this.socket = new globalThis['WebSocket'](this.url);
      } else {
        const { WebSocket } = await import('ws');
        this.socket = new WebSocket(this.url, this.options);
      }
    }
    this.transport.bind();
    return firstValueFrom(this.open$.pipe(timeout(5000)));
  }

  close(code = 1000, data?: string | Buffer) {
    if (!this.socket || this.readyState === ReadyState.CLOSED) {
      return;
    }
    this.reconnect = false;
    const p = firstValueFrom(this.close$);
    this.socket?.close(code, data);
    return p;
  }

  async destroy() {
    await this.close();
    await this.transport.destroy();
  }

  private doReconnect() {
    const cb = () => {};
    this.socket.onerror = cb;
    this.socket.onclose = cb;
    this.socket.onmessage = cb;
    this.socket.onopen = cb;
    this.reconnectTimer = setTimeout(
      () =>
        this.open().catch(() => {
          /** ignore */
        }),
      this.reconnectDelay
    );
  }
}
