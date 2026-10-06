# Chat frontend

Next.js App Router frontend for the Laravel chat backend. It stores the Sanctum bearer token in browser local storage, uses REST endpoints under `/api`, and subscribes to private Laravel Reverb channels with Laravel Echo.

## Local development

Start the backend and Reverb first:

```bash
cd ../backend
php artisan serve
php artisan reverb:start
```

Then run the frontend:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Environment values live in `.env.local`; use `.env.local.example` as the template if you need to recreate it.

## Included flow

- Register and sign in through Laravel Sanctum.
- Search users and start conversations.
- Load conversation history from the Laravel API.
- Send messages through the Laravel API.
- Delete conversations from the conversation header.
- Receive `message.sent` events over private Reverb channels.

```bash
npm run lint
npm run build
```
