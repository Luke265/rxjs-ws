import { take, firstValueFrom, lastValueFrom, tap } from 'rxjs';
import { RXClient } from '../src/client/RXClient';
import { RXServer } from '../src/server/RXServer';
import { WebSocket } from 'ws';

let server: RXServer;
let client: RXClient;

jest.setTimeout(5000);

beforeEach(async () => {
  server = new RXServer({
    port: 9999,
    host: 'localhost',
  });
  await server.listen();
});

it('Must have send and sendForResult', () => {
  client = new RXClient({
    url: 'ws://localhost:9999',
  });
  expect(server.event('sample')).toHaveProperty('send');
  expect(server.event('sample')).not.toHaveProperty('sendForResult');
  server.event('sample').subscribe((evt) => {
    expect(evt).toHaveProperty('send');
    expect(evt).toHaveProperty('sendForResult');
    evt.send;
    evt.sendForResult;
  });

  client.event('sample').send;
  client.event('sample').sendForResult;
  client.event('sample').subscribe((evt) => {
    expect(evt).toHaveProperty('send');
    expect(evt).toHaveProperty('sendForResult');
    evt.send;
    evt.sendForResult;
  });
});

describe('messaging', () => {
  beforeEach(async () => {
    client = new RXClient({
      url: 'ws://localhost:9999',
      queueLength: 100,
      reconnectDelay: 0,
    });
    await client.open();
  });

  afterEach(async () => {
    await client.close();
  });

  it('should subscribe', async () => {
    server
      .event('test0')
      .remoteSubscribe$.pipe(take(1))
      .subscribe((socket) => socket.send('ok'));
    expect(client.readyState).toBe(WebSocket.OPEN);
    await expect(firstValueFrom(client.event('test0'))).resolves.toHaveProperty(
      'data',
      'ok',
    );
  });

  it('should handle queue', async () => {
    const serverEvent = server.event('test2');
    const clientEvent = lastValueFrom(
      client.event('test2').pipe(
        tap((e) => e.send('ok2')),
        take(100),
      ),
    );
    const serverSocket = await firstValueFrom(serverEvent.remoteSubscribe$);
    const responses: Promise<any>[] = [];
    for (let i = 0; i < 100; i++) {
      responses.push(
        serverSocket.socket
          .event<string>('test2')
          .sendForResult('val2', { timeout: 100 })
          .then((r) => r.data),
      );
    }
    const re = await Promise.all(responses);
    const [ce] = await Promise.all([clientEvent]);
    expect(re.every((r) => r === 'ok2')).toBeTruthy();
    expect(ce).toHaveProperty('data', 'val2');
  });

  it('Response timeout', async () => {
    const serverEvent = server.event('test3');
    const serverSocketPromise = firstValueFrom(serverEvent.remoteSubscribe$);
    client.event('test3').subscribe(() => {
      // event received but not going to send response
    });
    const serverSocket = await serverSocketPromise;
    await expect(
      serverSocket.socket
        .event<string>('test3')
        .sendForResult('val2', { timeout: 100 }),
    ).rejects.toThrow('Response timeout');
  });

  it('Server closed', async () => {
    const serverEvent = server.event('test3');
    const serverSocketPromise = firstValueFrom(serverEvent.remoteSubscribe$);
    client.event('test3').subscribe(async () => {
      // event received but server closed
      await server.close();
    });
    const serverSocket = await serverSocketPromise;
    await expect(
      serverSocket.socket
        .event<string>('test3')
        .sendForResult('val2', { timeout: 1000 }),
    ).rejects.toThrow('closed');
  });

  it('Send for result without sub', async () => {
    server.event('test4').subscribe((msg) => {
      msg.send('my response');
    });
    await expect(
      client.sendForResult('test4', {}, { timeout: 1000 }),
    ).resolves.toHaveProperty('data', 'my response');
  });

  it('should', async () => {
    const socket = server.sockets[0];
    const promise = firstValueFrom(socket.close$);
    await client.close();
    await expect(promise).resolves.toBeTruthy();
    expect(server.sockets).toHaveLength(0);
  });
});

afterEach(async () => {
  await server?.close();
});
