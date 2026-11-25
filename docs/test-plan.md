# Plan de pruebas — LibroYa

## Automatizadas (backend `node:test`)

La suite usa modelos, Mongoose, PayPal y sockets simulados. No conecta a MongoDB Atlas ni usa credenciales PayPal reales.

| ID | Área | Escenarios | Resultado esperado | Archivo |
|----|------|-----------|--------------------|---------|
| A01 | Checkout idempotente | Misma clave/hash; hash distinto; pedido nuevo; carrera `E11000` con resultado igual/distinto | `200` sin reservar de nuevo; `409` en conflicto; `201` al crear; relectura atómica | `checkout-cancellation.test.js` |
| A02 | Cancelación | Dueño; no dueño; estado no pendiente; pago capturado; ID inválido | Restaura todos los ítems y cancela orden/pago en una transacción; rechaza `403`/`409`/`400` | `checkout-cancellation.test.js` |
| A03 | Validación | ObjectId, cantidad, dirección, carrier y tracking code | Rechaza IDs inválidos, cantidad > 100, dirección vacía/> 500 y textos demasiado largos; recorta la dirección | `checkout-validation.test.js` |
| A04 | Expiración | Corte de 30 minutos; fallo aislado; temporizador | Usa la cancelación compartida, continúa el lote y reporta fallos; intervalo con `unref()` | `expire-orders.test.js` |
| A05 | Header idempotente | UUID y claves de 8/128 caracteres; faltante, corta, larga o insegura | Acepta solo caracteres seguros y exige 8-128 caracteres | `idempotency-header.test.js` |
| A06 | Restricciones de modelo | Estado `CANCELLED`, campos de checkout e índices | Índice único sparse usuario+clave; pago único por orden y provider order | `model-constraints.test.js` |
| A07 | Ciclo de envío | `PREPARING`, `SHIPPED`, `DELIVERED`, transición inválida y fallo de escritura | Orden y shipment cambian en la misma transacción; rollback y cierre de sesión | `order-shipment-lifecycle.test.js` |
| A08 | Esquemas de envío | Datos requeridos y recortados | `SHIPPED` exige carrier/tracking; se recortan espacios | `shipment-schemas.test.js` |
| A09 | Creación PayPal | Reuso, creación, carrera única, reintento fallido y captura concurrente | Un solo pago; no reemplaza el provider order; no devuelve estado obsoleto | `payment-hardening.test.js` |
| A10 | Verificación de captura | Captura válida; ID superior/capture/custom ID; estado; importe finito/exacto; moneda | Solo una captura completa y coincuente pasa a `PAID`; los demás casos quedan sin pagar | `payment-hardening.test.js` |
| A11 | Reintento PayPal | Respuesta no-2xx conciliada; conciliación inválida; repetición; estado avanzado; propietario; carreras | `GET order details` recupera capturas perdidas; no hay doble cargo ni regresión de estado | `payment-hardening.test.js` |
| A12 | Utilidades PayPal | Request IDs, `GET order details`, error no-2xx | IDs deterministas y distintos de ≤ 38 caracteres; bearer auth; status/code preservados | `paypal-utils.test.js` |
| A13 | Entrega digital | Dueño pagado en cuatro estados; no pago; cancelado; otro usuario; ObjectId inválido; nombre seguro | `200` con adjunto demo; `403` sin entitlement; `400` inválido; `401` sin JWT; slug sin rutas ni inyección | `book-download.test.js` |

**Cobertura actual:** 78 pruebas, 78 aprobadas, 0 falladas. Las 17 pruebas de envíos previas se mantienen.

Las descargas automatizadas usan ediciones de demostración generadas porque no se suministraron archivos comerciales de los libros.

## Comandos de verificación

```bash
cd server
npm test
find src tests -name '*.js' -print0 | xargs -0 -n1 node --check

cd ../web
npx tsc --noEmit
npm run lint
npm run build
```

Resultados de la última ejecución local:

| Comando | Resultado |
|---------|-----------|
| `server: npm test` | PASS — 78/78 |
| `server: node --check` de `src` y `tests` | PASS |
| `web: npx tsc --noEmit` | PASS |
| `web: npm run lint` | PASS |
| `web: npm run build` | PASS — Next.js 16.4.6 |

## Funcionales (manual / TestSprite)

| ID | Área | Caso | Prioridad |
|----|------|------|-----------|
| F01 | Entrada pública | Abrir menú sin sesión | Alta |
| F02 | Acceso | Login válido/inválido y límite de intentos | Alta |
| F03 | Roles | Cliente intenta panel operador | Alta |
| F04 | Catálogo | Filtrar por categoría | Media |
| F05 | Carrito | Agregar/quitar/cambiar cantidades | Alta |
| F06 | Stock | Comprar más que stock | Alta |
| F07 | Pedido | Enviar precio alterado | Alta |
| F08 | Checkout | Reintentar o recargar con el mismo carrito/dirección; debe recuperar el mismo pedido | Alta |
| F09 | Checkout | Cambiar carrito, dirección o usuario; debe generar una clave nueva | Alta |
| F10 | Pago | Completar PayPal Sandbox | Alta |
| F11 | Pago | Cancelar PayPal; verificar `CANCELLED`, stock liberado y nuevo pedido en el siguiente intento | Alta |
| F12 | Pago | Simular respuesta perdida/`ORDER_ALREADY_CAPTURED`; conciliar sin doble cargo | Alta |
| F13 | Expiración | Dejar un pedido pendiente > 30 minutos y esperar el job | Alta |
| F14 | Historial | Consultar pedido ajeno | Alta |
| F15 | Tiempo real | Operador cambia estado o se cancela un pedido | Alta |
| F16 | Validación | Cantidad > 100, ObjectId inválido o dirección vacía/larga | Media |
| F17 | Despliegue | Recargar y navegar rutas internas | Media |
| F18 | Envíos | Cargar carrier/tracking y ver detalle | Alta |
| F19 | Entrega digital | Descargar cada e-book de un pedido pagado; verificar carga, error y ausencia de botón sin entitlement | Alta |

## Evidencia desplegada

- Smoke test contra MongoDB Atlas: PASS (idempotencia, rollback, cancelación y stock).
- PayPal Sandbox: PASS (captura verificada e idempotente).
- CORS desplegado: PASS (preflight 204 con origen exacto).
- WSS desplegado: PASS (evento de estado recibido).
- Descarga digital desplegada: PASS (200 con entitlement / 403 sin entitlement).

## TestSprite ejecutado

- 20 casos creados y ejecutados.
- 12 PASSED, 0 FAILED, 8 BLOCKED.
- Evidencia: `docs/testsprite-evidence/`.
- Los bloqueados se cubrieron con pruebas manuales/API documentadas en `docs/informe-resultados.md`.
