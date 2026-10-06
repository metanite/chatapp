# Chat backend

Laravel 13 API backend for the chat application. It uses SQLite for persistence, Sanctum bearer tokens for API authentication, and Laravel Reverb for real-time message delivery.

## Local development

```bash
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
php artisan serve
```

Run Reverb in a second terminal:

```bash
php artisan reverb:start
```

The API is available at `http://localhost:8000/api`, and Reverb listens on `ws://localhost:8080`.

## API

Public endpoints:

- `POST /auth/register` — create a user; returns a bearer token.
- `POST /auth/login` — authenticate a user; returns a bearer token.

Authenticated endpoints require `Authorization: Bearer <token>`:

- `GET /me`
- `POST /auth/logout`
- `GET /users?search=ada` — search users to start a conversation.
- `GET /conversations`
- `POST /conversations` with `{ "title": "Optional title", "user_ids": [2] }`
- `GET /conversations/{conversation}`
- `DELETE /conversations/{conversation}`
- `GET /conversations/{conversation}/messages`
- `POST /conversations/{conversation}/messages` with `{ "body": "Hello" }`

New messages are broadcast as `message.sent` on the private channel `conversations.{conversation_id}`. Conversation creation and deletion are broadcast as `conversation.created` and `conversation.deleted` on each member's private `App.Models.User.{user_id}` channel. The channel authorizer only allows the corresponding user or conversation members to subscribe.

## Verification

```bash
php artisan test
vendor/bin/pint --test
```
