import { RXSocketServer } from "../../../src/server/RXSocketServer";

const port = 3000;
const server = new RXSocketServer({ port });
server.listen();
console.log(`Listening on port ${port}`)
server.event<string, string>('test').subscribe((event) => {
    console.log('Test event received', event.data);
    event.send('Message received, thank you!');
});