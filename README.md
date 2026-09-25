# Bridacero ERP

ERP portátil (PWA) para gestión de inventario, compras y pedidos — Bridacero del Centro S.A. de C.V.

Proyecto de Residencia Profesional · Ingeniería en Tecnologías de la Información y Comunicaciones.

## Stack

- **Backend**: Node.js, Express, Prisma, PostgreSQL
- **Frontend**: React (Vite), Tailwind CSS, PWA (`vite-plugin-pwa`)

## Estructura

```
backend/    API REST (auth, inventario, compras, pedidos)
frontend/   PWA (React + Tailwind)
```

## Desarrollo local

### Backend

```bash
cd backend
npm install
cp .env.example .env   # ajustar DATABASE_URL
npx prisma migrate dev
node prisma/seed.js
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Cuenta de demostración: `admin@bridacero.com` / `admin123`
