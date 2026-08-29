# RF4 Spots

Десктопный клиент и API для точек ловли в Russian Fishing 4: карта водоёма, посты со скриншотами, комментарии, калькуляторы и админка. Клиент и API — версия **3.0.0**.

## Состав

- `server` — Node.js + Express + Prisma + PostgreSQL
- `client` — Electron / браузер (Vite + React)
- `docker-compose.yml` — Postgres + API

Карты — оригинальные схемы с сеткой [Potryasov Game](https://potryasovgame.ru) (`server/assets/maps/*.png`). Координаты `X:Y` калибруются под сетку карты. Справочник видов — снимок таблицы [Potryasov](https://potryasovgame.ru/page119730056.html). Повторно скачать карты: `python server/scripts/download_potryasov_maps.py`.

Клиент: `client/src/features/` (spots, admin, tools, auth, shell), общее — `client/src/shared/`, HTTP — `client/src/api/`. Сервер: тонкие роутеры в `server/src/routes/`, общее — `server/src/lib/`.

## Что в клиенте

- **Споты** — карта, лента, фильтры, избранное, комментарии, жалобы. ПКМ на карте — новый пост; линейка считает дистанцию по клетке водоёма. Игрок правит только свои посты, админ — любые.
- **Статистика** — встроенный [rf4-stat.ru](https://rf4-stat.ru/).
- **Кафе** — встроенный [rf4-cafe.ru](https://rf4-cafe.ru/) для выбранного водоёма.
- **Полезные функции** — сравнение снастей, износ, скорость, заработок (только на этом компьютере, `localStorage`), таблицы гайдов.
- **Админ** (роль admin) — dashboard (посты, онлайн, очередь жалоб), игроки, приглашения, жалобы с историей. С карточки жалобы можно открыть пост на карте.

Установленный клиент раз в 5 минут проверяет обновления (`/updates`). Если сборка скачана, внизу окна — баннер «Перезапустить».

`/health` проверяет PostgreSQL.

## Сервер без Docker (локальный PostgreSQL)

```bash
cd server
copy .env.example .env
# DATABASE_URL=postgresql://USER:PASS@127.0.0.1:5432/rf4spots
# JWT_SECRET — случайная строка ≥ 32 символов
npm install
npx prisma migrate deploy
npx prisma db seed
npm run create-admin -- --nickname Nergal --password "секрет8+"
npm run dev
```

API: http://127.0.0.1:3780

Новая миграция в разработке: `npx prisma migrate dev`.

## Сервер в Docker

В корне репозитория скопируйте `.env.example` в `.env` и задайте `POSTGRES_PASSWORD` и `JWT_SECRET` (не короче 32 символов). Postgres с хоста не публикуется, API слушает только `127.0.0.1:3780`. Если том Postgres уже создавался со старым паролем, в `.env` должен быть тот же пароль — смена переменной сама по себе его не меняет.

```bash
docker compose up --build
docker compose exec api npm run create-admin -- --nickname Nergal --password "секрет8+"
```

Публичный HTTPS (нужен DNS-имя): см. [deploy/README.md](deploy/README.md). Кратко: в `.env` `DOMAIN`, `TRUST_PROXY=1`, `REQUIRE_HTTPS=1`, затем `docker compose --profile https up -d`. Файрвол: `sudo bash deploy/ufw.sh`.

Открытую регистрацию на публичном сервере лучше выключить (`ALLOW_REGISTER=false`) и выдавать приглашения во вкладке «Админ» либо аккаунты: `docker compose exec api npm run create-user -- --nickname NAME --password SECRET`. Использованный код приглашения не возвращается, даже если игрока потом удалили.

После смены `JWT_SECRET` все сессии сбрасываются — нужен повторный вход.

Справочники после деплоя: `docker compose exec api npm run db:seed` (на каждый старт контейнера seed больше не выполняется). Лишние файлы в `uploads`: `docker compose exec api npm run uploads:sweep`.

## Клиент

```bash
cd client
npm install
npm run dev
```

Браузер: http://127.0.0.1:5173  
Окно Electron: `npm run dev:electron`  
Установщик Windows: `npm run pack`  
Для продакшен-сборки задайте публичный HTTPS-адрес (не коммитьте его, если не хотите его в git):

```bash
set VITE_SERVER_URL=https://spots.example.com
npm run pack
```

При первом запуске укажите ник, пароль и адрес сервера. Дальше клиент входит сам.

## Проверки

```bash
cd server && npx tsc --noEmit && npm test
cd client && npx tsc --noEmit && npm test
```
