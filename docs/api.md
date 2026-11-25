# API y reglas de autorización — LibroYa

Base local: `http://localhost:4000`. Autenticación: `Authorization: Bearer <JWT>`.

## Modelos

| Colección | Campos principales | Reglas |
|-----------|--------------------|--------|
| `users` | name, email, passwordHash, role, timestamps | `role ∈ cliente, operador`; password hash con bcrypt |
| `books` | title, author, isbn, category, price, stock, coverUrl, available, timestamps | precio positivo; stock ≥ 0; disponibilidad validada en servidor |
| `orders` | userId, items[], address, total, checkoutKey, checkoutHash, status, paymentStatus, timestamps | total recalculado con precios de DB; stock reservado con transacción atómica |
| `payments` | orderId, provider, providerOrderId, captureId, amount, currency, status, timestamps | un pago por pedido; `providerOrderId` único; no almacena tarjetas |
| `shipments` | orderId, address, carrier, trackingCode, status, timestamps | un envío por pedido; se crea al preparar y avanza en la misma transacción que la orden |

Índices de consistencia:

- `orders`: único y sparse sobre `{ userId: 1, checkoutKey: 1 }`.
- `payments`: único sobre `orderId`; único y sparse sobre `providerOrderId`.
- `shipments`: único sobre `orderId`.

Si una base existente contiene pedidos duplicados para el mismo usuario y clave, o pagos duplicados por pedido/provider order, hay que resolverlos antes de construir estos índices.

## Máquina de estados

- Pedido: `PENDING_PAYMENT → PAID → PREPARING → SHIPPED → DELIVERED`.
- Un pedido `PENDING_PAYMENT` puede pasar a `CANCELLED` por su dueño o por expiración.
- `PAID` solo lo asigna el backend tras una captura PayPal verificada.
- El operador solo puede ejecutar `PAID → PREPARING → SHIPPED → DELIVERED`.
- La orden y su envío se actualizan en una única transacción Mongoose; los eventos WebSocket se emiten después de confirmar la transacción.
- Pago: `CREATED → APPROVED → CAPTURED` / `FAILED` / `CANCELLED`.
- Una captura repetida devuelve el pago existente y nunca retrocede el pedido a `PAID`.

## Endpoints

### Autenticación

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/api/auth/register` | Público | Crea usuario cliente; rol forzado por servidor |
| POST | `/api/auth/login` | Público | Devuelve JWT y usuario; limitado a 10 intentos fallidos por IP cada 15 minutos |

### Catálogo

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/books?category=` | Público | Lista libros, filtro opcional |
| GET | `/api/books/:id` | Público | Detalle de libro |
| POST | `/api/books` | Operador | Crea libro |
| PUT | `/api/books/:id` | Operador | Actualiza libro |
| DELETE | `/api/books/:id` | Operador | Elimina libro |

### Pedidos

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/api/orders` | Cliente | Crea o recupera un pedido idempotente y reserva stock |
| GET | `/api/orders/mine` | Cliente | Historial propio |
| GET | `/api/orders` | Operador | Todos los pedidos |
| GET | `/api/orders/:id` | Dueño u operador | Detalle |
| POST | `/api/orders/:id/cancel` | Dueño | Cancela un pedido pendiente y libera su stock |
| PATCH | `/api/orders/:id/status` | Operador | Avanza estado válido; `SHIPPED` exige `carrier` y `trackingCode` |

#### Creación idempotente

`POST /api/orders` exige el header `Idempotency-Key`:

- Entre 8 y 128 caracteres.
- Solo letras, números, puntos, guiones bajos, dos puntos y guiones.
- La clave se evalúa junto con `userId`.
- El servidor calcula `checkoutHash` con SHA-256 sobre la dirección recortada y las líneas del carrito fusionadas y ordenadas por `bookId`.

Respuestas:

| Código | Situación |
|--------|-----------|
| `201` | Pedido nuevo creado; stock reservado |
| `200` | Misma clave y mismo hash; devuelve el pedido existente sin reservar stock otra vez |
| `409` | Misma clave con carrito o dirección distintos |
| `400` | Header ausente/inválido o validación del cuerpo |

El cuerpo acepta `items[]` con `bookId` ObjectId de 24 hexadecimales y `quantity` entera de 1 a 100. `address` se recorta y admite hasta 500 caracteres. Las cantidades duplicadas del mismo libro se suman antes de validar stock.

#### Cancelación y expiración

`POST /api/orders/:id/cancel`:

- Solo el dueño puede llamarlo; un operador no puede cancelar en nombre del cliente.
- Solo `PENDING_PAYMENT` puede cancelarse.
- En una transacción restaura cada libro con `$inc`, marca la orden `CANCELLED` y marca el pago más reciente no capturado como `CANCELLED`.
- Si el pago ya está `CAPTURED`, devuelve `409` y no libera stock.
- Emite `order:status_changed` y `order:updated` después del commit.
- Cancelar una orden ya `CANCELLED` es idempotente.

El job `server/src/jobs/expireOrders.js` se inicia tras conectar MongoDB. Cada 60 segundos procesa hasta 100 pedidos `PENDING_PAYMENT` con más de 30 minutos de antigüedad mediante la misma función de cancelación transaccional. Su temporizador usa `unref()`.

### Envíos

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/api/shipments/order/:orderId` | Dueño u operador | Devuelve el envío del pedido; `404` si no existe |
| PUT | `/api/shipments/order/:orderId` | Operador | Actualiza transportista y código sin cambiar el estado de la orden |

Reglas de `PATCH /api/orders/:id/status`:

- `PREPARING`: crea o actualiza el envío con la dirección de la orden y estado `PREPARING`.
- `SHIPPED`: exige `carrier` y `trackingCode` no vacíos, los guarda en el envío y marca ambos documentos como `SHIPPED`.
- `DELIVERED`: marca la orden y el envío como `DELIVERED`.
- Una transición inválida o datos de envío faltantes devuelven `400` sin modificar documentos.

Ejemplo para enviar un pedido:

```json
{
  "status": "SHIPPED",
  "carrier": "Correos",
  "trackingCode": "TRK-123456"
}
```

`PUT /api/shipments/order/:orderId` acepta el mismo par de campos y devuelve `404` si todavía no existe un envío para ese pedido.

### Pagos PayPal

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/api/payments/orders/:orderId/paypal` | Dueño | Crea o reutiliza la orden PayPal del pedido |
| POST | `/api/payments/orders/:orderId/capture` | Dueño | Captura, verifica y registra el pago |

Ambas rutas exigen que la orden esté `PENDING_PAYMENT` y `paymentStatus = UNPAID` para iniciar una operación. Una repetición de captura ya completada devuelve el resultado existente sin llamar otra vez a PayPal.

Controles implementados:

- Un único documento `Payment` por `orderId`; los reintentos reutilizan ese documento y su `providerOrderId`.
- `PayPal-Request-Id` determinista y distinto para creación y captura; el valor tiene 32 caracteres.
- La captura solo se acepta si el ID superior coincide con `providerOrderId`, existe un capture ID, `purchase_units[0].custom_id` coincide con la orden, el capture está `COMPLETED`, el importe es finito y coincide en centavos, y la moneda es exactamente la esperada.
- Ante una respuesta no-2xx, el backend consulta `GET /v2/checkout/orders/:providerOrderId` y concilia si encuentra un capture completo y verificado.
- El pago y el paso de la orden a `PAID` se guardan en una transacción con actualizaciones condicionales.
- Si la orden ya avanzó, una repetición no la retrocede.

### Salud

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | `/health` | Público | `{ "status": "ok" }` sin secretos |

## WebSockets

Handshake autenticado con JWT. Salas asignadas por identidad verificada:

- `ops`: operadores.
- `user:<userId>`: dueño del pedido.

Eventos: `order:created`, `order:status_changed`, `order:updated`.

## Validación y errores

- Los IDs de pedido y pago deben ser ObjectIds de 24 hexadecimales.
- Cantidades: 1 a 100. Dirección: recortada, 1 a 500 caracteres.
- `carrier`: hasta 100 caracteres; `trackingCode`: hasta 120.
- Errores de validación: `{ "error": "Validation error", "details": [{ "path": "...", "message": "..." }] }`.
- El cliente acepta `{ error }` y `{ message }`, y muestra solo detalles de validación conocidos.

## Reglas de seguridad

- El navegador nunca envía precios finales ni decide estados de pago.
- Secretos de Mongo/JWT/PayPal solo en backend.
- `NEXT_PUBLIC_*` solo contiene URLs o Client ID público.
- CORS limitado a `CLIENT_ORIGIN`.
- Rate limit global, rate limit específico de login, helmet, validación zod y manejo centralizado de errores.
- La clave de checkout se genera con `crypto.randomUUID`, se guarda en `sessionStorage` por usuario y se rota si cambian carrito, dirección o usuario.
