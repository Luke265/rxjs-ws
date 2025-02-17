import { IncomingMessage } from 'http';
import WebSocket from 'ws';
import { EventName, RXEvent } from '../RXSocketEvent.js';
import { RXSocket, SendForResultOptions } from '../RXSocket.js';
import { Observable } from 'rxjs';
import { RXServerClientEventImpl } from './RXServerClientEventImpl.js';
import { SocketTransport } from '../SocketTransport.js';
import { RXServerClientEvent } from './RXServerClientEvent.js';
import { RXServerClientMessage } from './RXServerClientMessage.js';

export class RXServerClient implements RXSocket {
  private readonly transport: SocketTransport<
    RXServerClientEventImpl,
    RXServerClientMessage<any, any>
  >;
  public readonly open$: Observable<any>;
  public readonly close$: Observable<any>;
  public readonly message$: Observable<RXServerClientMessage<any, any>>;
  public readonly error$: Observable<any>;

  constructor(
    public readonly raw: WebSocket,
    public readonly request: IncomingMessage,
  ) {
    this.transport = new SocketTransport<
      RXServerClientEventImpl,
      RXServerClientMessage<any, any>
    >(this);
    this.close$ = this.transport.close$;
    this.open$ = this.transport.open$;
    this.message$ = this.transport.message$;
    this.error$ = this.transport.error$;
    this.open$ = this.transport.open$;
    // allocate immediately, used only internally
    this.event(SocketTransport.EVENT_RESPONSE);
    this.transport.bind();
  }

  get readyState() {
    return this.raw.readyState;
  }

  sendRaw(data: any): Promise<void> {
    return this.transport.sendRaw(data);
  }

  send(event: EventName, data: any): Promise<void> {
    return this.transport.send(event, data);
  }

  sendForResult<I, O>(
    event: EventName,
    data: any,
    options?: SendForResultOptions,
  ): Promise<RXServerClientMessage<I, O>> {
    return this.transport.sendForResult(event, data, options) as any;
  }

  event<I, O = unknown>(name: EventName | RXEvent): RXServerClientEvent<I, O> {
    if (typeof name === 'object' && 'name' in name) {
      name = name.name;
    }
    // we cannot be sure if output or input shape is valid
    return (this.transport.events[name] ??= new RXServerClientEventImpl(
      this,
      name,
    ));
  }

  async destroy() {
    await this.transport.destroy();
  }

  close(code?: number, data?: string | Buffer) {
    this.raw.close(code, data);
  }
}
