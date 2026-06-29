# OmniHub KZ 🇰🇿

Единый чат-менеджер для WhatsApp, Instagram и Kaspi.  
CRM воронка, авто-сценарии, аналитика касаний.

## Развёртывание в облаке (бесплатно)

### Шаг 1 — GitHub (бесплатно)
1. Зайдите на https://github.com и зарегистрируйтесь
2. Нажмите **New repository** → назовите `omni-hub`
3. Загрузите все файлы этой папки (кнопка **uploading an existing file**)
4. Нажмите **Commit changes**

### Шаг 2 — Vercel (бесплатно)
1. Зайдите на https://vercel.com и нажмите **Sign up with GitHub**
2. Нажмите **Add New Project** → выберите репозиторий `omni-hub`
3. Vercel сам определит Vite — нажмите **Deploy**
4. Через 30 секунд получите ссылку вида `omni-hub.vercel.app` ✅

## Локальный запуск
```bash
npm install
npm run dev
```
Откроется на http://localhost:5173

## Структура
```
src/
  App.jsx   — весь UI (чаты, шаблоны, аналитика, сценарии, воронка)
  main.jsx  — точка входа React
index.html
vite.config.js
vercel.json — настройка SPA-роутинга
```
