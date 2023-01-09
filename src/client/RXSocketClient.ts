import { RXSocket } from "../RXSocket";
import { firstValueFrom, Subject } from "rxjs";
import { RXSocketMessage } from "../RXSocketMessage";
import { EventName, RXSocketEvent } from "../RXSocketEvent";
import { RXClientSocketEvent } from "./RXClientSocketEvent";
import { timeout } from "rxjs/operators";
import { ReadyState } from "../ReadyState";
import WebSocketType = require("ws");
import { RXSocketClientOptions } from "./RXSocketClientOptions";

declare const window: any;
declare type ResponseHandler = [
    number,
    (message: RXSocketMessage<any, any>) => void,
    (message: RXSocketMessage<any, any>) => void
];
const enc = new TextEncoder();
const dec = new TextDecoder();

export class RXSocketClient implements RXSocket {
    static EVENT_RESPONSE = -1;

    readonly message$: Subject<RXSocketMessage<any>> = new Subject();
    readonly close$: Subject<any> = new Subject();
    readonly error$: Subject<any> = new Subject();
    readonly open$: Subject<any> = new Subject();
    readonly events: { [name: string]: RXSocketEvent<any> } = {};

    private messageId: number = 1;
    private response: { [id: number]: ResponseHandler | undefined } = {};
    private socket!: WebSocketType;
    private queueLength = 100;
    private reconnect = 0;
    private queueTimeout = 0;
    private responseTimeout = 0;
    private url: string | undefined;
    private reconnectTimer: NodeJS.Timeout | null = null;

    public get raw() {
        if (!this.socket) {
            throw new Error("Socket is not open");
        }
        return this.socket!!;
    }
    public options: { [key: string]: any } = {};
    private cleanupTimer?: number;

    get readyState() {
        if (this.socket) {
            return this.socket.readyState;
        }
        return 0;
    }

    constructor(options: RXSocketClientOptions) {
        if (options.socket) {
            this.socket = options.socket;
            this.bind();
        }
        this.url = options.url;
        this.reconnect = options.reconnect || 5_000;
        this.responseTimeout = options.responseTimeout || 10_000;
        this.queueTimeout = options.queueTimeout || this.responseTimeout;
        this.queueLength = options.queueLength || this.queueLength;
        this.setupCleanup();
    }

    send(event: EventName, data: any) {
        return this.sendRaw(this.serialize(0, event, data));
    }

    async sendRaw(data: any) {
        if (this.readyState !== ReadyState.OPEN) {
            if (this.queueTimeout > 0) {
                await firstValueFrom(this.open$.pipe(timeout(this.queueTimeout)));
                if ((this.readyState as ReadyState) === ReadyState.OPEN) {
                    this.sendRaw(data);
                    return;
                }
            }
            throw new Error("Socket closed");
        }
        this.socket.send(data);
    }

    sendForResult<I, O>(event: EventName, data: any, id = this.messageId++) {
        if (id === this.queueLength) {
            id = this.messageId = 0;
        }
        if (this.response[id]) {
            throw new Error("Queue full");
        }
        return new Promise<RXSocketMessage<I, O>>((resolve, reject) => {
            this.response[id] = [Date.now(), resolve, reject];
            this.sendRaw(this.serialize(id, event, data));
        });
    }

    event<I = any, O = any>(name: string): RXSocketEvent<I, O> {
        if (this.events[name]) {
            return this.events[name]!;
        }
        return (this.events[name] = new RXClientSocketEvent(this, name));
    }

    protected serialize(id: number, event: EventName, data: any): string | ArrayBuffer {
        if (data instanceof ArrayBuffer) {
            const encoded = enc.encode(event as string);
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

    protected deserialize(data: any) {
        return JSON.parse(data);
    }

    open() {
        if (this.url) {
            if (typeof window !== "undefined" && (window as any).WebSocket) {
                this.socket = new window.WebSocket(this.url);
            } else {
                const WebSocket = require("ws");
                this.socket = new WebSocket(this.url);
            }
        }
        this.bind();
        return firstValueFrom(this.open$.pipe(timeout(this.queueTimeout)));
    }

    private setupCleanup() {
        clearInterval(this.cleanupTimer!!);
        this.cleanupTimer = Number(
            setInterval(() => {
                const now = Date.now();
                for (const id in this.response) {
                    const handler = this.response[id];
                    if (handler && now - handler[0] >= this.queueTimeout) {
                        this.response[id] = undefined;
                    }
                }
            }, 1000)
        );
    }

    private bind() {
        this.socket.onopen = (event) => {
            this.setupCleanup();
            this.open$.next(event);
        };
        this.socket.onerror = (event) => {
            this.rejectAll(event);
            this.error$.next(event);
        };
        this.socket.onclose = (event) => {
            clearInterval(this.cleanupTimer!!);
            this.close$.next(event);
            this.rejectAll("closed");
            if (event.code !== 1000 && this.reconnect) {
                this.doReconnect();
            } else if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
            }
        };
        this.socket.onmessage = (socketEvent) => {
            if (socketEvent.data instanceof ArrayBuffer) {
                const dataView = new DataView(socketEvent.data);
                const id = dataView.getUint32(0);
                const len = dataView.getUint8(4);
                const eventName = dec.decode(dataView.buffer.slice(5, len));
                const event = this.event(eventName);
                const message: RXSocketMessage<any> = {
                    id,
                    event,
                    socket: this,
                    data: socketEvent.data,
                    send: (_) => Promise.resolve(),
                    sendForResult: (_) => {
                        throw new Error("Not supported");
                    },
                };
                this.message$.next(message);
                return;
            }
            const [id, eventName, data] = this.deserialize(socketEvent.data);
            const event = this.event(eventName);
            const message: RXSocketMessage<any> = {
                id,
                event,
                socket: this,
                data,
                send: (data: any) => this.sendRaw(this.serialize(id, RXSocketClient.EVENT_RESPONSE, data)),
                sendForResult: (data: any) => this.sendForResult(RXSocketClient.EVENT_RESPONSE, data, id),
            };
            if (event.name === RXSocketClient.EVENT_RESPONSE) {
                const callback = this.response[id];
                if (callback) {
                    callback[1](message);
                    this.response[id] = undefined;
                }
            } else {
                event.next(message);
                this.message$.next(message);
            }
        };
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
            this.reconnect
        );
    }

    private rejectAll(error: any) {
        for (const callbacks of Object.values(this.response)) {
            if (callbacks) {
                callbacks[1](error);
            }
        }
        this.response = {};
    }
}
