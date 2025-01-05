import { firstValueFrom, lastValueFrom, take, tap } from 'rxjs';
import { RXSocketClient } from '../src/client/RXSocketClient';
import { RXSocketServer } from '../src/server/RXSocketServer';
import { WebSocket } from 'ws';

let server: RXSocketServer;
let client: RXSocketClient;
beforeAll(async () => {
  server = new RXSocketServer({
    port: 9999,
    host: 'localhost',
  });
  await server.listen();
});
afterAll(() => {
  server?.close();
});

it('nothing', async () => {
  client = new RXSocketClient({
    url: 'ws://localhost:9999',
  });
  await client.open();
  await client.close();
  expect(client.readyState).toBe(WebSocket.CLOSED);
});

describe('messaging', () => {
  beforeEach(async () => {
    client = new RXSocketClient({
      url: 'ws://localhost:9999',
      reconnectDelay: 0,
    });
    await client.open();
  });

  afterEach(async () => {
    await client.close();
  });

  it('should', async () => {
    server
      .event('test2')
      .remoteSubscribe$.pipe(take(1))
      .subscribe((socket) => socket.send('ok'));
    expect(client.readyState).toBe(WebSocket.OPEN);
    await expect(firstValueFrom(client.event('test2'))).resolves.toHaveProperty(
      'data',
      'ok'
    );
  });

  it('should b', async () => {
    const serverEvent = server.event('test2');
    const clientEvent = lastValueFrom(
      client.event('test2').pipe(
        tap((e) => e.send('ok2')),
        take(1)
      )
    );
    const serverSocket = await firstValueFrom(serverEvent.remoteSubscribe$);
    const responses: Promise<any>[] = [];
    for (let i = 0; i < 1; i++) {
      responses.push(
        serverSocket.socket
          .event<string>('test2')
          .sendForResult('val2', { timeout: 100 })
          .then((r) => r.data)
      );
    }
    const re = await Promise.all(responses);
    const [ce] = await Promise.all([clientEvent]);
    expect(re.every((r) => r === 'ok2')).toBeTruthy();
    expect(ce).toHaveProperty('data', 'val2');
  });
});
