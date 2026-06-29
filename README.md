# ⚡ OmniHub KZ — Полная документация

WhatsApp · Instagram · Kaspi + Bitrix24 в одном месте.  
Работает 24/7, устанавливается как приложение (PWA).

---

## Порядок запуска (шаг за шагом)

### 1. Supabase — база данных (бесплатно)

1. Зайди на **supabase.com** → Create new project
2. Назови `omni-hub`, выбери регион ближайший (Frankfurt)
3. Settings → API → скопируй:
   - `Project URL` → это `SUPABASE_URL` и `VITE_SUPABASE_URL`
   - `anon/public` key → это `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → это `SUPABASE_SERVICE_KEY`
4. SQL Editor → вставь содержимое файла `supabase/schema.sql` → Run

### 2. GitHub — загрузи код

1. github.com → New repository → `omni-hub`
2. Загрузи все файлы из этой папки → Commit changes

### 3. Vercel — деплой (бесплатно)

1. vercel.com → Sign up with GitHub → Add New Project → `omni-hub`
2. **НЕ нажимай Deploy сразу** → сначала добавь переменные:
3. Settings → Environment Variables → добавь все из таблицы ниже
4. Deployments → Redeploy

### 4. Environment Variables в Vercel

| Key | Value |
|-----|-------|
| `BITRIX24_WEBHOOK_URL` | `https://tootmx.bitrix24.kz/rest/98/nh06zqmcwxx3ylyn/` |
| `BITRIX24_DOMAIN` | `tootmx.bitrix24.kz` |
| `ADMIN_1_ID` | `1` |
| `ADMIN_2_ID` | `42` |
| `ADMIN_3_ID` | `98` |
| `SUPABASE_URL` | из Supabase Settings → API |
| `SUPABASE_SERVICE_KEY` | service_role key |
| `VITE_SUPABASE_URL` | тот же URL |
| `VITE_SUPABASE_ANON_KEY` | anon key |
| `KASPI_API_KEY` | из кабинета Kaspi продавца |
| `KASPI_MERCHANT_ID` | ID магазина Kaspi |

### 5. Настройка автообновления Kaspi (каждые 5 минут)

**Бесплатно через cron-job.org:**
1. Зайди на **cron-job.org** → Sign up → Create cronjob
2. URL: `https://твой-домен.vercel.app/api/cron/kaspi`
3. Schedule: Every 5 minutes
4. Save → Enable

**Авто-синхронизация B24 сотрудников** уже настроена в vercel.json (каждый день в 9:00).  
При найме нового сотрудника — вручную открой:  
`https://твой-домен.vercel.app/api/cron/sync-users`

### 6. Проверка подключений

После деплоя открой в браузере:
- `/api/b24/test` — список всех пользователей B24
- `/api/cron/sync-users` — синхронизировать сотрудников прямо сейчас
- `/api/cron/kaspi` — проверить подключение Kaspi

### 7. Установка как приложение (PWA)

**На компьютере (Chrome):**  
Адресная строка → иконка установки → Установить OmniHub

**На телефоне (iOS Safari):**  
Поделиться → На экран «Домой»

**На телефоне (Android Chrome):**  
Меню → Добавить на главный экран

---

## Архитектура

```
Vercel (24/7)
├── / → OmniHub веб-приложение (React + PWA)
├── /api/b24/users        → список сотрудников (Supabase → B24)
├── /api/b24/task-chain   → создать цепочку задач + файлы в B24 Диск
├── /api/b24/deal         → закрыть сделку в CRM
├── /api/b24/return       → зафиксировать возврат
├── /api/cron/sync-users  → авто-синхронизация сотрудников (daily)
├── /api/cron/kaspi       → синхронизация заказов Kaspi (каждые 5 мин)
├── /api/conversations    → диалоги из Supabase
└── /api/b24/test         → проверка подключений

Supabase (база данных)
├── b24_users      → все сотрудники B24 (авто-обновляется)
├── conversations  → все диалоги WA/IG/Kaspi
├── messages       → все сообщения (история навсегда)
├── kaspi_orders   → все заказы Kaspi
└── task_chains    → цепочки задач B24
```

## Что происходит автоматически

| Событие | Что происходит |
|---------|----------------|
| Новый заказ Kaspi | Создаётся диалог в OmniHub + уведомление всем 3 в B24 |
| Новый сотрудник в B24 | Появляется в списке исполнителей через 24ч (или сразу через `/api/cron/sync-users`) |
| Запрос возврата Kaspi | Уведомление Бийболатов + Сулейманов + Пименов в B24 мессенджере |
| Задача создана с файлами | Файлы загружаются в B24 Диск → папка OmniHub → прикрепляются к задаче |
| Сделка закрыта | Deal создаётся в B24 CRM, лид конвертируется |

