import { RXSocket, SendForResultOptions } from './RXSocket.js';
import { firstValueFrom, Subject } from 'rxjs';
import { RXMessage } from './RXSocketMessage.js';
import { EventName, RXEvent } from './RXSocketEvent.js';
import { timeout } from 'rxjs/operators';
import { ReadyState } from './ReadyState.js';
import { CloseEvent } from 'ws';
import { TrackedObservable } from './TrackedObservable.js';

declare type ResponseHandler = [
  date: number,
  timeout: number,
  resolve: (
    value: RXMessage<any, any> | PromiseLike<RXMessage<any, any>>
  ) => void,
  reject: (reason: unknown) => void
];
const enc = new TextEncoder();
const dec = new TextDecoder();

export interface SocketTransportOptions {
  responseTimeout?: number;
  queueTimeout?: number;
  queueLength?: number;
}

export class SocketTransport<
  E extends TrackedObservable<M> & RXEvent<any, any>,
  M extends RXMessage<any, any>
> {
  static EVENT_RESPONSE = -1;

  readonly message$: Subject<M> = new Subject();
  readonly close$: Subject<CloseEvent> = new Subject();
  readonly error$: Subject<any> = new Subject();
  readonly open$: Subject<any> = new Subject();
  readonly events: { [name: EventName]: E } = {};

  // 0 - is global broadcast id, so we start from 1
  private messageId: number = 1;
  private readonly response = new Map<number, ResponseHandler | undefined>();
  private queueLength = 100;
  private queueTimeout = 0;
  private responseTimeout = 0;

  public options: { [key: string]: any } = {};
  private cleanupTimer: number | null = null;

  constructor(
    private readonly socket: RXSocket,
    options?: SocketTransportOptions
  ) {
    this.responseTimeout = options?.responseTimeout ?? 10_000;
    this.queueTimeout = options?.queueTimeout ?? this.responseTimeout;
    this.queueLength = options?.queueLength ?? this.queueLength;
  }

  send(event: EventName, data: any) {
    return this.sendRaw(this.serialize(0, event, data));
  }

  async sendRaw(data: any) {
    if (this.socket.readyState !== ReadyState.OPEN) {
      if (this.queueTimeout > 0) {
        await firstValueFrom(this.open$.pipe(timeout(this.queueTimeout)));
        if ((this.socket.readyState as ReadyState) === ReadyState.OPEN) {
          this.sendRaw(data);
          return;
        }
      }
      throw new Error('Socket closed');
    }
    this.socket.raw.send(data);
  }

  sendForResult<I, O>(
    event: EventName,
    data: I,
    options?: SendForResultOptions,
    id = this.messageId++
  ): Promise<any> {
    return new Promise<RXMessage<O, unknown>>((resolve, reject) => {
      if (this.response.has(id)) {
        throw new Error('Callback already set');
      }
      if (this.response.size > this.queueLength) {
        throw new Error('Full queue');
      }
      this.response.set(id, [
        Date.now(),
        options?.timeout ?? this.responseTimeout,
        resolve,
        reject,
      ]);
      this.sendRaw(this.serialize(id, event, data));
      this.setupCleanup();
    });
  }

  serialize(id: number, event: EventName, data: any): string | ArrayBuffer {
    if (data instanceof ArrayBuffer) {
      const encoded = enc.encode(event as string);
      if (encoded.length > 255) {
        throw new Error('Message too long');
      }
      const buf = new Uint8Array(data.byteLength + encoded.length + 4);
      let offset = 0;
      buf[offset++] = id;
      buf[offset++] = id << 8;
      buf[offset++] = id << 16;
      buf[offset++] = id << 32;
      buf[offset++] = encoded.length;
      buf.set(encoded, offset++);
      buf.set(new Uint8Array(data as ArrayBuffer), encoded.length + offset);
      return buf;
    }
    return JSON.stringify([id, event, data]);
  }

  deserialize(data: any): [number, string, unknown] {
    return JSON.parse(data);
  }

  async destroy() {
    clearInterval(this.cleanupTimer ?? undefined);
    this.cleanupTimer = null;
    this.rejectAll('closed');
    for (const name in this.events) {
      this.events[name].complete();
    }
    this.open$.complete();
    this.close$.complete();
    this.error$.complete();
    this.message$.complete();
  }

  private setupCleanup() {
    if (this.cleanupTimer) {
      return;
    }
    clearInterval(this.cleanupTimer!!);
    this.cleanupTimer = Number(
      setInterval(() => {
        const now = Date.now();
        for (const [id, handler] of this.response) {
          if (handler && now - handler[0] >= handler[1]) {
            handler[3](new Error('Response timeout'));
            this.response.delete(id);
          }
        }
      }, 1000)
    );
  }

  bind() {
    this.socket.raw.onopen = (event) => {
      this.open$.next(event);
    };
    this.socket.raw.onerror = (event) => {
      this.rejectAll(event);
      this.error$.next(event);
    };
    this.socket.raw.onclose = (event) => {
      this.rejectAll(new Error('closed'));
      this.close$.next(event);
      clearInterval(this.cleanupTimer ?? undefined);
      this.cleanupTimer = null;
    };
    this.socket.raw.onmessage = (socketEvent) => {
      if (socketEvent.data instanceof ArrayBuffer) {
        const dataView = new DataView(socketEvent.data);
        const id = dataView.getUint32(0);
        const len = dataView.getUint8(4);
        const eventName = dec.decode(dataView.buffer.slice(5, len));
        const event = this.events[eventName];
        const message = {
          id,
          event,
          socket: this.socket,
          data: socketEvent.data,
          send: () => Promise.resolve(),
          sendForResult: () => {
            throw new Error('Not supported');
          },
        } as unknown as M;
        this.message$.next(message);
        return;
      }
      const [id, eventName, data] = this.deserialize(socketEvent.data);
      const event = this.events[eventName];
      if (!event) {
        return;
      }
      let sent = false;
      const message = {
        id,
        event,
        socket: this.socket,
        data,
        send: (data: any) => {
          if (sent) {
            throw new Error('Already sent');
          }
          sent = true;
          return this.sendRaw(
            this.serialize(id, SocketTransport.EVENT_RESPONSE, data)
          );
        },
        sendForResult: (data: any, options?: SendForResultOptions) => {
          if (sent) {
            throw new Error('Already sent');
          }
          sent = true;
          return this.sendForResult(
            SocketTransport.EVENT_RESPONSE,
            data,
            options,
            id
          );
        },
      } as unknown as M;
      if (event.name === SocketTransport.EVENT_RESPONSE) {
        const callback = this.response.get(id);
        if (callback) {
          this.response.delete(id);
          callback[2](message);
        }
      } else {
        event.next(message);
        this.message$.next(message);
      }
    };
  }

  private rejectAll(error: any) {
    for (const [_, callbacks] of this.response) {
      if (callbacks) {
        callbacks[3](error);
      }
    }
    this.response.clear();
  }
}
