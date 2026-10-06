# Chat application

A simple real-time chat application with a Laravel 13 backend and a Next.js frontend. The backend exposes REST endpoints, stores data in SQLite, and broadcasts new messages through Laravel Reverb. The frontend uses Sanctum bearer tokens, Laravel Echo, and Reverb.

## Requirements

- PHP 8.3+
- Composer
- Node.js and npm

## Setup

### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Adjust `.env.local` if the backend or Reverb server uses different hosts or ports.

## Run the application

From the project root:

```bash
./run.sh
```

This starts the backend with `php artisan dev` and the frontend with `npm run dev`. The application is available at [http://localhost:3000](http://localhost:3000). Laravel’s API runs on port `8000`, and Reverb listens on port `8080`.

To run the processes separately:

```bash
cd backend && php artisan dev
cd frontend && npm run dev
```

## Verify the project

```bash
cd backend && php artisan test && vendor/bin/pint --test
cd frontend && npm run lint && npm run build
```

See [backend/README.md](/var/www/html/chatapp/backend/README.md) and [frontend/README.md](/var/www/html/chatapp/frontend/README.md) for API and frontend details.
