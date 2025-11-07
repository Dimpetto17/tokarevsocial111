Tokarev-social
==============

Проект готов к деплою. Структура:
- public/   (фронтенд — статические файлы)
- server.js (Node.js/Express backend)
- data/     (json-файлы для хранения)
- uploads/  (создаётся при запуске, хранит загруженные файлы)

Локально:
1. Установи зависимости:
   npm install
2. Запусти:
   npm start
3. Открой http://localhost:3000 (frontend в public/ будет доступен)

Рекомендация для бесплатного хостинга:
- Frontend: подключи репозиторий к Vercel и задеплой (укажи корень проекта — папку public)
- Backend: задеплой server.js на Render.com (Web Service) или любой другой бесплатный Node-host.
  В Render укажи команду запуска: `npm start`. Render хранит файлы и отдаёт /uploads статически.

Важно:
- Для работы аватарок и файлов сервер должен быть доступен. В script.js указан API_URL по умолчанию http://localhost:3000.
  На Vercel фронтенд укажи window.API_URL через переменные окружения или заменой в script.js на адрес сервера Render.