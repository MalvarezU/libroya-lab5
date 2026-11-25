# LibroYa — Tienda de libros electrónicos (Lab 5)

Aplicación full-stack de comercio electrónico para venta de libros electrónicos,
generada con asistencia de IA (Cursor), como laboratorio de "Fundamentos en
S.I. — UDEA 2026".

## Actores

- **Cliente**: navega el catálogo, arma carrito, paga con PayPal Sandbox, consulta historial y recibe actualizaciones de su pedido en tiempo real.
- **Operador**: administra pedidos y envíos en tablero Kanban, avanza estados válidos.

## Arquitectura

```
Navegador ──HTTPS──> Next.js (frontend, Railway)
Navegador ──REST+WSS──> Node.js/Express + Socket.IO (backend, Railway)
                              ├── Mongoose ──> MongoDB Atlas
                              └── HTTPS ──> PayPal Sandbox
```

El navegador nunca decide precios, pagos ni estados: el backend recalcula el total
con precios de la DB, verifica PayPal y autoriza cada transición por rol.

## Estructura

```
libreria-ia/
├── web/        # Next.js (frontend)
├── server/     # Node.js/Express + Socket.IO (backend)
├── docs/       # Diagramas, PRD, informe, evidencia TestSprite
├── README.md
├── .env.example
└── .gitignore
```

## Variables de entorno

Copiar `.env.example` a `server/.env` y completar. Variables del frontend van en
`web/.env.local` (solo URLs públicas, jamás secretos).

## Ejecución local

```bash
# Backend
cd server
npm install
npm run dev        # http://localhost:4000

# Frontend (otra terminal)
cd web
npm install
npm run dev        # http://localhost:3000
```

## Despliegue (Railway)

- Frontend: https://<pendiente>.up.railway.app
- Backend: https://<pendiente>.up.railway.app
- Health check backend: `GET /health`

## Entregables

Ver `docs/PRD.md`, `docs/informe-resultados.md` y `docs/reflexion-individual.md`.
