# PRD — LibroYa (Tienda de libros electrónicos)

## 1. Visión
Permitir la venta de libros electrónicos con gestión de catálogo, stock y envíos,
mediante una aplicación web full-stack generada con asistencia de IA.

## 2. Actores y roles
- **Cliente**: navega catálogo, arma carrito, paga con PayPal Sandbox, consulta historial y recibe actualizaciones en tiempo real.
- **Operador**: administra pedidos y envíos en tablero Kanban, avanza estados válidos.

## 3. Alcance funcional (MVP)
1. Registro e inicio de sesión con roles cliente/operador.
2. Catálogo de libros (título, autor, ISBN, categoría, precio, stock, portada, disponible) con filtro por categoría.
3. Carrito y dirección de envío; resumen y creación de pedido.
4. Pago PayPal Sandbox; el pedido queda pagado solo tras confirmación del backend.
5. Historial de pedidos del cliente.
6. Panel del operador con columnas: Pendiente → En preparación → Enviado → Entregado.
7. Actualización en tiempo real del estado vía WebSockets.
8. API protegida, validación de datos, manejo centralizado de errores.

## 4. Reglas de negocio / restricciones
- El total se recalcula SIEMPRE en el backend con precios de la DB; nunca se confía en el precio del cliente.
- El stock se valida y descuenta en el servidor; no se vende más que el stock disponible.
- El pedido pasa a pagado únicamente tras captura verificada de PayPal (estado, importe, moneda, id de orden).
- Las capturas son idempotentes: repetir no genera cobros/pedidos duplicados.
- Un usuario solo consulta sus propios pedidos; un cliente no accede al panel del operador ni al CRUD de libros.
- El handshake de Socket.IO se autentica con JWT; las salas se asignan por identidad verificada, no por nombre enviado por el navegador.
- Secretos (Mongo URI, JWT, PayPal Secret) solo en backend; nunca en variables `NEXT_PUBLIC_*`.

## 5. Máquina de estados
- Pedido: `PENDING_PAYMENT → PAID → PREPARING → SHIPPED → DELIVERED`
- Pago: `CREATED → APPROVED → CAPTURED` / `FAILED` / `CANCELLED`
- Solo el operador ejecuta transiciones de pedido; no se permiten saltos.

## 6. Endpoints (resumen)
Ver README / código. Grupos: `/api/auth`, `/api/books`, `/api/orders`, `/api/payments/paypal`, `GET /health`.

## 7. Criterios de aceptación clave
- Cambiar el total desde DevTools no cambia el importe capturado.
- Un usuario no puede capturar/consultar el pago de un pedido ajeno.
- Las solicitudes repetidas no producen cobros ni pedidos duplicados.
- El menú público carga sin sesión y no expone funciones privadas.
- Cliente que intenta abrir el panel del operador recibe denegación en UI y servidor.
- Enviar cantidad negativa o dirección vacía se rechaza con mensaje claro.

## 8. Entorno
- Desarrollo: frontend `http://localhost:3000`, backend `http://localhost:4000`.
- Producción: ambos servicios en Railway; WebSockets por WSS.