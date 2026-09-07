# RF4 Spots

Десктопный клиент и API для точек ловли в Russian Fishing 4: карта водоёма, посты со скриншотами, комментарии, калькуляторы и админка. Версии — в `client/package.json` и `server/package.json`.

## Состав

- `server` — Node.js + Express + Prisma + PostgreSQL
- `client` — Electron / браузер (Vite + React)
- `docker-compose.yml` — Postgres + API

Карты — оригинальные схемы с сеткой [Potryasov Game](https://potryasovgame.ru) (`server/assets/maps/*.png`). Координаты `X:Y` калибруются под сетку карты. Справочник видов — снимок таблицы [Potryasov](https://potryasovgame.ru/page119730056.html). Обновление карт и сидов — в разделе ниже.

Клиент: `client/src/features/` (spots, admin, tools, auth, shell), общее — `client/src/shared/`, HTTP — `client/src/api/`. Сервер: тонкие роутеры в `server/src/routes/`, общее — `server/src/lib/`.

## Что в клиенте

- **Споты** — карта, лента, фильтры, избранное, комментарии, жалобы. ПКМ на карте — новый пост; линейка считает дистанцию по клетке водоёма. Игрок правит только свои посты, админ — любые.
- **Статистика** — встроенный [rf4-stat.ru](https://rf4-stat.ru/).
- **Кафе** — встроенный [rf4-cafe.ru](https://rf4-cafe.ru/) для выбранного водоёма.
- **Полезные функции** — сравнение снастей, износ, скорость, заработок (только на этом компьютере, `localStorage`), таблицы гайдов.
- **Админ** (роль admin) — dashboard (посты, онлайн, очередь жалоб), игроки, приглашения, жалобы с историей. С карточки жалобы можно открыть пост на карте.

Установленный клиент раз в 5 минут проверяет обновления (`/updates`). В Windows сборка скачивается сама, и внизу окна появляется баннер «Перезапустить». В Android-клиенте автообновления нет: если на сервере лежит APK новее установленного, сверху появляется баннер со ссылкой на скачивание.

Открытый адрес сервера в браузере показывает страницу скачивания. Windows-установщик: `/updates/installer`. Android APK: `/updates/apk`.

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

Забытый пароль меняется из командной строки: `docker compose exec api npm run set-password -- --nickname NAME`. Пароль спросят с клавиатуры без эха, поэтому он не попадёт ни в историю оболочки, ни в список процессов; в скриптах можно передать его сразу (`--password SECRET`) или через stdin (`printf '%s' SECRET | docker compose exec -T api npm run set-password -- --nickname NAME`). Прежние сессии этого игрока сбрасываются. Без Docker — то же самое в каталоге `server`.

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
APK для Android: `npm run pack:apk` (нужны JDK 17–24 и Android SDK 34+, обычно из Android Studio). Если в PATH Java 25+, скрипт сам возьмёт JDK 17–24 из `Program Files\Java`.  
Для продакшен-сборки задайте публичный HTTPS-адрес (не коммитьте его, если не хотите его в git):

```bash
set VITE_SERVER_URL=https://spots.example.com
npm run pack
npm run pack:apk
```

Оба файла копируются в `server/updates` и отдаются с API. Ссылки на скачивание показывает страница сервера, открытая в браузере.

При первом запуске укажите ник, пароль и адрес сервера. Дальше клиент входит сам.

## Обновление карт и справочников

Скрипты в `server/scripts/` пишут в `server/assets/maps` и `server/prisma/seeds`. Нужен Python 3:

```bash
pip install -r server/scripts/requirements.txt
```

- `download_potryasov_maps.py` — карты с сеткой Potryasov Game и калибровка `waterbodies.json`
- `fetch_rf4map_bounds.py` — границы локаций RF4MAP → `prisma/seeds/rf4map_bounds.json`
- `apply_rf4map_bounds.py` — накладывает эти границы на `waterbodies.json` (водоёмы с `manualCalibration` не трогает)
- `apply_rf4_map_site.py` — карты и калибровка с [rf4-map.ru](https://rf4-map.ru/map/)
- `fetch_potryasov_guides.py` — таблицы гайдов → `prisma/seeds/guides/`

После правок сидов: `cd server && npm run db:seed`.

## Проверки

```bash
cd server && npx prisma validate && npx tsc --noEmit && npm test && npm run build
cd client && npx tsc --noEmit && npm test && npm run build
```
