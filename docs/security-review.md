# Revisión de seguridad — LibroYa

## Alcance
Revisión estática y pruebas locales del flujo de autenticación, pedidos, pagos, WebSockets y secretos. No es una auditoría de penetración.

## Hallazgos y estado

| Severidad | Hallazgo | Estado | Evidencia / acción |
|-----------|----------|--------|--------------------|
| Alta | Socket reutilizado con token de otro usuario | **Corregido** | `web/src/lib/socket.ts` compara `boundToken`; logout/login reconectan |
| Alta | Captura repetida podía regresar el estado del pedido | **Corregido** | `paymentController.js` ya no modifica `order.status` en reintento |
| Alta | Precio del navegador podía influir en el total | **Mitigado** | El backend recalcula desde MongoDB; probado con `price: 999` |
| Alta | Stock sin actualización atómica | **Corregido** | Reserva con transacción y `$gte`; probado rollback |
| Media | Pedidos duplicados al reintentar checkout | **Corregido** | `Idempotency-Key` API + checkout persistente |
| Media | Stock reservado sin liberación | **Corregido** | Cancelación y expiración de pedidos pendientes |
| Media | PayPal sin recuperación de respuesta perdida | **Corregido** | Request ID + reconciliación por order details |
| Media | Errores backend/frontend con envelopes distintos | **Corregido** | Parser frontend acepta `{error}` y `{message}` |
| Media | Descarga digital sin control de entitlement | **Corregido** | Endpoint solo para pedidos pagados del dueño; probado 200/403 |
| Baja | JWT almacenado en localStorage | **Aceptado para el lab** | Riesgo XSS; mitigar con CSP/sanitización y expiración corta |
| Baja | Atlas `0.0.0.0/0` en el lab | **Aceptado temporalmente** | Restringir IP en producción |
| Informativa | Credenciales Sandbox compartidas durante desarrollo | **Requiere rotación** | Rotar si fueron expuestas fuera del entorno local |

## Controles presentes
- bcrypt para contraseñas.
- JWT con rol y middleware de autorización.
- Helmet, CORS restringido y rate limiting.
- Validación zod y manejo centralizado de errores.
- Secretos solo en backend y `.env` gitignored.
- WebSocket handshake autenticado; salas asignadas por servidor.
- Pagos solo del dueño; estado `PAID` solo tras captura verificada.

## Pruebas realizadas
- Suite automatizada: **78/78 PASS**.
- Precio manipulado: total ignorado y recalculado.
- Stock insuficiente: rechazo sin descuento.
- Captura de pedido ajeno: `403`.
- Captura repetida: un solo pago (requiere revalidar no regresión tras el fix).
- WebSocket de operador: evento de estado recibido.
- WSS desplegado en Railway: PASS.
- CORS desplegado: PASS con origen exacto del frontend.
- Build, TypeScript y lint: PASS.

## Pendiente
- Ejecutar suite completa tras el endurecimiento de checkout/PayPal.
- Validar CORS/WSS y secretos en Railway.
- Ejecutar TestSprite y registrar evidencia.
