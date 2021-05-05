import { RXSocketClient } from "../../../src/client/RXSocketClient";

(async () => {
    const client = new RXSocketClient({
        url: 'ws://localhost:3000'
    });
    await client.open();
    const event = client.event<string, string>('test');
    const result = await event.sendForResult('Hello!');
    console.log(result.data);
})().catch(console.error.bind(console))