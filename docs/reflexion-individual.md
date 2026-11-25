# Reflexión individual — LibroYa

> Borrador para personalizar antes de entregar. Reemplazar las secciones por la experiencia y decisiones reales del estudiante.

## 1. Qué generó la IA
- Estructura inicial del monorepo (`web/` y `server/`).
- Modelos, endpoints, middleware de autenticación/autorización y validación.
- Frontend Next.js: catálogo, carrito, checkout PayPal, historial y tablero Kanban.
- Integración de Socket.IO y flujo de captura PayPal.
- Documentación técnica, diagrama de arquitectura y primeras pruebas automatizadas.

## 2. Qué verifiqué
- Revisé que el total se recalculara en el backend y que el precio enviado por el navegador se ignorara.
- Comprobé en MongoDB que el stock disminuyera y que el pago quedara `CAPTURED`.
- Ejecuté un pago real en PayPal Sandbox y verifiqué que el pedido pasara a `PAID`.
- Probé WebSockets con sesiones de cliente y operador.
- Revisé CORS, manejo de secretos, roles, transiciones de estado y errores.
- Detecté y corregí problemas de identidad del socket, pedidos duplicados, reservas de stock y capturas repetidas.

## 3. Qué decisiones se tomaron manualmente
- Adaptar el ejemplo PlatoYa al entregable real de venta de libros electrónicos.
- Mantener frontend y backend separados para que pagos y WebSockets vivan en el backend.
- Definir una máquina de estados estricta y evitar que el operador marque `PAID` sin captura.
- Exigir transportista y código de seguimiento antes de marcar un pedido como enviado.
- Priorizar idempotencia, liberación de stock y recuperación de pagos ante fallos de red.

## 4. Lecciones aprendidas
- La IA acelera la construcción, pero no reemplaza la revisión de arquitectura y seguridad.
- Un `200` del backend no basta: hay que verificar el estado persistido y la actualización en tiempo real.
- Los flujos de pago deben diseñarse para reintentos, timeouts y solicitudes duplicadas.
- Las pruebas automatizadas y la evidencia de ejecución son parte del producto, no un paso opcional.
- La documentación debe describir lo que el sistema realmente hace, no lo que se pretende que haga.
