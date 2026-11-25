# Informe de resultados — LibroYa

## 1. Entorno de prueba

- Fecha: 25 de noviembre de 2026.
- Frontend: https://frontend-production-c1fae6c3.up.railway.app
- Backend: https://libroya-lab5-production.up.railway.app
- Base de datos: MongoDB Atlas (replica set).
- Pagos: PayPal Sandbox.
- Repositorio: https://github.com/MalvarezU/libroya-lab5 (público).
- Commit evaluado: `e16356d`.

## 2. Pruebas automatizadas

Comando: `cd server && npm test`.

- Total: **78**.
- Aprobadas: **78**.
- Fallidas: **0**.
- Cobertura funcional: autenticación/autorización, validación, idempotencia de checkout, reserva/liberación de stock, expiración de pedidos, pagos PayPal (create/capture/reconciliación), envíos y esquemas.

Verificaciones adicionales:

- `node --check` en backend: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS (Next.js 16.4.6).
- `git diff --check`: PASS.

### 2.1 Suite TestSprite

- Proyecto: LibroYa Lab 5 (`d182ce8e-b90b-4605-b2ec-7098f1b3788d`).
- URL: https://frontend-production-c1fae6c3.up.railway.app
- Total de casos: **20**.
- Aprobados: **12**.
- Fallidos: **0**.
- Bloqueados: **8**.
- Evidencia: `docs/testsprite-evidence/`.

Los 8 bloqueados no son defectos funcionales: el runner Free no permite editar `localStorage`, no ofrece un entorno seguro para credenciales de PayPal Sandbox y limita la cuenta de aplicación a un rol por ejecución. Esos flujos se verificaron manualmente y por API (sección 4).

## 3. Pruebas manuales ejecutadas

| ID | Prueba | Resultado |
|----|--------|-----------|
| M01 | Registro/login cliente y operador | PASS |
| M02 | Catálogo público y seed de 12 libros | PASS |
| M03 | Pedido con precio manipulado (`price: 999`) | PASS: backend ignoró el precio y cobró el precio de DB |
| M04 | Stock insuficiente y rollback transaccional | PASS: sin descuento parcial |
| M05 | Líneas duplicadas del mismo libro | PASS: cantidades agregadas |
| M06 | Checkout con mismo `Idempotency-Key` | PASS: mismo pedido, stock descontado una vez |
| M07 | Mismo key con body distinto | PASS: HTTP 409 |
| M08 | Cancelar pedido pendiente | PASS: stock restaurado |
| M09 | Pago PayPal Sandbox aprobado | PASS: pago `CAPTURED`, pedido `PAID` |
| M10 | Captura de pedido ajeno | PASS: HTTP 403 |
| M11 | Captura repetida en `PAID` y `PREPARING` | PASS: no regresó el estado |
| M12 | Avance `PAID → PREPARING → SHIPPED` | PASS |
| M13 | Shipment con carrier/tracking | PASS |
| M14 | WebSocket de operador recibe cambio de estado | PASS |
| M15 | Build de producción | PASS |
| M16 | Descarga de e-book pagado / rechazo a otro usuario | PASS: 200 con demo edition / 403 |
| M17 | Railway backend `/health` y catálogo | PASS: HTTP 200, 12 libros |
| M18 | Railway frontend y rutas internas | PASS: `/`, `/login`, `/cart`, `/kitchen`, `/orders` responden 200 |
| M19 | CORS desplegado | PASS: preflight 204 con origen exacto del frontend |
| M20 | Descarga desplegada | PASS: HTTP 200 con `Content-Disposition` |
| M21 | WebSocket seguro (WSS) | PASS: conexión y evento `order:status_changed` recibidos |

Evidencia de pago (identificadores opacos, sin credenciales):

- Pedido: `6b06629242e64c10ee6fdb3b`.
- Pago: `CAPTURED`.
- Capture ID: `7EG04992JC225620A`.
- Importe verificado: `10.50 USD`.

## 4. Defectos encontrados y corregidos

| # | Defecto | Corrección |
|---|---------|------------|
| D01 | Socket reutilizado con token de otro usuario | Reconexión por identidad y disconnect en logout/login |
| D02 | Pedidos duplicados al reintentar PayPal | `Idempotency-Key` API + persistencia de checkout |
| D03 | Stock sin transacción | Reserva atómica con transacción Mongoose |
| D04 | Stock sin liberación | Cancelación y expiración de pedidos pendientes |
| D05 | Captura repetida regresaba estados | Reintento terminal sin modificar `order.status` |
| D06 | Pagos permitidos a operador no dueño | Autorización estricta por propiedad |
| D07 | PayPal sin reconciliación de respuesta perdida | Request ID + order details + verificación de identificadores |
| D08 | Gestión de envíos ausente | Shipment sincronizado + carrier/tracking obligatorio |
| D09 | Error de `params` fuera de Suspense | Acceso dentro de boundary async |

## 5. Pendientes de entrega

- [x] Ejecutar TestSprite contra la URL pública.
- [x] Registrar capturas/logs y tasa de éxito de TestSprite.
- [ ] Personalizar la reflexión individual.

## 6. Decisión de liberación

**Listo para entrega una vez personalizada la reflexión individual.** Las URLs públicas, HTTPS, CORS, WSS, pagos, envíos, descarga, pruebas automatizadas y evidencia TestSprite están completos. No se detectaron defectos funcionales en los casos ejecutables.
