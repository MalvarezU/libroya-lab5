# PRD — LibroYa (Tienda de libros electrónicos)

## 1. Visión
Permitir la venta y entrega digital de libros electrónicos con gestión de catálogo, stock y envíos,
mediante una aplicación web full-stack generada con asistencia de IA.

## 2. Actores y roles
- **Cliente**: navega catálogo, arma carrito, paga con PayPal Sandbox, consulta historial, descarga sus e-books pagados y recibe actualizaciones en tiempo real.
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
9. Descarga autenticada de e-books comprados desde el detalle del pedido, con control de entitlement y estados de carga/error.

El laboratorio no cuenta con archivos comerciales de los libros. La entrega digital usa ediciones de demostración generadas por el backend en texto plano, con título, autor y un aviso claro de que no son la obra publicada. No se publican URLs de activos ni se leen rutas de archivos arbitrarias.

## 4. Reglas de negocio / restricciones
- El total se recalcula SIEMPRE en el backend con precios de la DB; nunca se confía en el precio del cliente.
- El stock se valida y descuenta en el servidor; no se vende más que el stock disponible.
- El pedido pasa a pagado únicamente tras captura verificada de PayPal (estado, importe, moneda, id de orden).
- Las capturas son idempotentes: repetir no genera cobros/pedidos duplicados.
- Un usuario solo consulta sus propios pedidos; un cliente no accede al panel del operador ni al CRUD de libros.
- Un e-book solo se descarga si el usuario tiene una orden con ese libro, `paymentStatus = PAID` y estado `PAID`, `PREPARING`, `SHIPPED` o `DELIVERED`; cualquier otro caso responde `403`.
- El nombre del archivo descargado se genera con un slug ASCII seguro y la respuesta no se almacena en caché.
- El handshake de Socket.IO se autentica con JWT; las salas se asignan por identidad verificada, no por nombre enviado por el navegador.
- Secretos (Mongo URI, JWT, PayPal Secret) solo en backend; nunca en variables `NEXT_PUBLIC_*`.

## 5. Máquina de estados
- Pedido: `PENDING_PAYMENT → PAID → PREPARING → SHIPPED → DELIVERED`
- Pago: `CREATED → APPROVED → CAPTURED` / `FAILED` / `CANCELLED`
- Solo el operador ejecuta transiciones de pedido; no se permiten saltos.

## 6. Endpoints (resumen)
Ver README / código. Grupos: `/api/auth`, `/api/books`, `/api/orders`, `/api/shipments`, `/api/payments/paypal`, `GET /health`. La entrega digital usa `GET /api/books/:id/download`.

## 7. Criterios de aceptación clave
- Cambiar el total desde DevTools no cambia el importe capturado.
- Un usuario no puede capturar/consultar el pago de un pedido ajeno.
- Las solicitudes repetidas no producen cobros ni pedidos duplicados.
- El menú público carga sin sesión y no expone funciones privadas.
- Cliente que intenta abrir el panel del operador recibe denegación en UI y servidor.
- Enviar cantidad negativa o dirección vacía se rechaza con mensaje claro.
- El dueño de un pedido pagado ve un botón de descarga por libro y recibe un adjunto de demostración seguro.
- Un pedido no pagado, cancelado o de otro usuario no permite descargar el e-book.

## 8. Entorno
- Desarrollo: frontend `http://localhost:3000`, backend `http://localhost:4000`.
- Producción: ambos servicios en Railway; WebSockets por WSS.