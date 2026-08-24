# RF4 Spots

Десктопный клиент и сервер для точек ловли в Russian Fishing 4: карта водоёма, посты со скриншотами, комментарии, роли админ / игрок.

## Состав

- `server` — Node.js + Express + Prisma + PostgreSQL
- `client` — Electron / браузер (Vite + React)
- `docker-compose.yml` — Postgres + API

Карты — оригинальные схемы с сеткой [Potryasov Game](https://potryasovgame.ru) (`server/assets/maps/*.png`). Координаты `X:Y` калибруются под сетку карты. Справочник видов — снимок таблицы [Potryasov](https://potryasovgame.ru/page119730056.html). Повторно скачать карты: `python server/scripts/download_potryasov_maps.py`.

## Сервер без Docker (локальный PostgreSQL)

```bash
cd server
copy .env.example .env
# DATABASE_URL=postgresql://USER:PASS@127.0.0.1:5432/rf4spots
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run create-admin -- --nickname Nergal --password "секрет"
npm run dev
```

API: http://localhost:3780

## Сервер в Docker

```bash
docker compose up --build
docker compose exec api npm run create-admin -- --nickname Nergal --password "секрет"
```

## Клиент

```bash
cd client
npm install
npm run dev
```

Браузер: http://127.0.0.1:5173  
Окно Electron: `npm run dev:electron`  
Установщик Windows: `npm run pack`

При первом запуске укажите ник, пароль и адрес сервера. Дальше клиент входит сам.

Игрок создаёт посты и правит только свои. Админ правит любые. ПКМ на карте — новый пост, линейка считает дистанцию в метрах по размеру клетки водоёма.
