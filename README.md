# mediasoup-demo-simple

Minimal simple demo app for mediasoup `v3`.

## Feat

- use only 1 worker, 1 router = 1 room
- VP8 only
- send/recv multiple tracks

## Setup client

```sh
cd client

npm i
npm start
```

Open `http://localhost:1234` on browser.

## Setup server

```sh
cd server

npm i
npm start
```

Run websocket server on `http:localhost:2345`.
Also media server runs on `http:localhost:{3000-4000}`.
