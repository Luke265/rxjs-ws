
Ping/Pong example:
```ts
const client = new RXSocketClient({ url: 'ws://localhost:3000' });
const pingEvent = client.event('ping');
pingEvent.subscribe((response) => pingEvent.send());

const server = new RXSocketServer();
const pingEvent = server.event('ping');
pingEvent.subscribe((response) => {
	console.log('Pong from ', response.socket);
});
setInterval(() => {
	console.log('Ping everyone');
	pingEvent.send();
}, 1000);
```

Send for result example:
```ts
const client = new RXSocketClient({ url: 'ws://localhost:3000' }));
const helloEvent = client.event('hello');
(async () => {
	let result = await helloEvent.sendForResult('Hello!');
	console.log(result.data); // 'Hi!'
	result = await result.replyForResult('How are you?');
	console.log(result.data);
})();

const server = new RXSocketServer();
const helloEvent = server.event('hello');
helloEvent.subscribe(async (message) => {
	console.log(message.data); // 'Hello!'
	let result = await message.replyForResult('Hi!');
	console.log(result.data); // 'How are you?'
	result.reply('I\'m good, thanks.');
});
```

Subscribtion example:
```ts
const client = new RXSocketClient({ url: 'ws://localhost:3000' });
const pingEvent = client.event('ping');
// pingEvent.subscribe();

const server = new RXSocketServer();
const pingEvent = server.event('ping');
setInterval(() => {
	pingEvent.send(); // will not send the event, because there is no subscribers
}, 1000);
```