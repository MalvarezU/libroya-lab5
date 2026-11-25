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
| Media | Pedidos duplicados al reintentar checkout | **En corrección** | Idempotencia API + `Idempotency-Key` |
| Media | Stock reservado sin liberación | **En corrección** | Cancelación/expiración de pedidos pendientes |
| Media | PayPal sin recuperación de respuesta perdida | **En corrección** | Request ID + reconciliación por order details |
| Media | Errores backend/frontend con envelopes distintos | **En corrección** | Parser frontend debe aceptar `{error}` y `{message}` |
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
- Precio manipulado: total ignorado y recalculado.
- Stock insuficiente: rechazo sin descuento.
- Captura de pedido ajeno: `403`.
- Captura repetida: un solo pago (requiere revalidar no regresión tras el fix).
- WebSocket de operador: evento de estado recibido.
- Build, TypeScript y lint: PASS.

## Pendiente
- Ejecutar suite completa tras el endurecimiento de checkout/PayPal.
- Validar CORS/WSS y secretos en Railway.
- Ejecutar TestSprite y registrar evidencia.
