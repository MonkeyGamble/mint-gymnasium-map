# MINT Gymnasium Map

Интерактивная карта гимназий Nordrhein-Westfalen и Rheinland-Pfalz на Google Maps.

## Возможности

- 100 гимназий NRW из рейтинга MINT на schulen.de; Gesamtschulen исключены.
- 21 гимназия Rheinland-Pfalz из официального списка сети MINT-EC.
- Переключение федеральной земли, поиск и фильтр по городу.
- Подсветка маркера при наведении или выборе школы в списке.
- Карточки со ссылками на официальные сайты гимназий.

Для NRW номера обозначают позиции в исходном рейтинге. Для Rheinland-Pfalz номера используются только для обозначения школ на карте и не являются рейтингом.

## Запуск

Проект использует обычные HTML, CSS и JavaScript, сборка и установка зависимостей не нужны.

1. Скопируйте `dist/maps-config.example.js` в `dist/maps-config.js`.
2. В новом файле задайте `googleMapsApiKey` — ключ Google Maps JavaScript API. Файл исключён из Git.
3. Запустите локальный HTTP-сервер из корня репозитория:

```sh
python -m http.server 8000 --directory dist
```

4. Откройте http://localhost:8000/.

Открытие HTML напрямую через `file://` не подходит: приложение загружает JSON через fetch.

Ключ из `maps-config.js` подключается автоматически при каждом открытии. Если файл не настроен, интерфейс предлагает ввести ключ и запоминает его в текущем браузере.

## Размещение

Разместите содержимое `dist/` на статическом хостинге. Файл `maps-config.js` нужно добавить в окружение размещения отдельно; он не хранится в публичном репозитории.

В Google Cloud включите Maps JavaScript API и настройте допустимые HTTP referrers для домена размещения. Браузерный ключ доступен посетителям работающего сайта, поэтому ограничивайте его доменами и используемым API.

Исходная работающая версия: https://nrw-mint-gymnasien.fatuglyaces.chatgpt.site

## Данные и источники

Снимок данных: сентябрь 2026 года.

- `dist/schools.json` — 100 гимназий NRW.
- `dist/rp-schools.json` — 21 гимназия Rheinland-Pfalz.
- NRW: https://schulen.de/toplisten/beste-oeffentliche-schulen-nordrhein-westfalen-min/
- MINT-EC: https://netzwerkkarte.mint-ec.de/

Рейтинг NRW отражает предложения школ по MINT. Членство в сети MINT-EC и позиция в рейтинге schulen.de — разные показатели.
