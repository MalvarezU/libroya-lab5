# Casos de prueba para TestSprite — LibroYa

## Configuración de la suite

- **Tipo:** Live Web App.
- **Nombre:** LibroYa — Lab 5.
- **URL:** https://frontend-production-c1fae6c3.up.railway.app
- **Requiere login:** Sí para flujos privados; el catálogo es público.
- **Cliente:** `cliente@demo.com` / `demo1234`.
- **Operador:** `operador@demo.com` / `demo1234`.
- **PayPal:** usar una cuenta **Personal/comprador** de Sandbox configurada en developer.paypal.com. No guardar sus credenciales en este archivo.
- **Documento de requisitos:** adjuntar `docs/PRD.md`.

## Precondiciones generales

1. El backend responde en https://libroya-lab5-production.up.railway.app/health.
2. El catálogo contiene los 12 libros del seed.
3. Existe al menos un libro disponible con stock suficiente.
4. Las cuentas de cliente y operador están activas.
5. PayPal está en Sandbox y el Client ID del frontend coincide con el del backend.
6. Usar datos ficticios para direcciones y envíos.
7. Para pruebas de pago, verificar que no exista una captura previa del mismo pedido.

---

## TS01 — Catálogo público sin sesión

**Prioridad:** Alta  
**Precondición:** Sin sesión iniciada.

**Pasos:**
1. Abrir la URL principal.
2. Esperar a que cargue el catálogo.
3. Verificar que se muestran libros con título, autor, precio y stock.
4. Seleccionar una categoría.
5. Abrir el detalle de un libro.

**Resultado esperado:**
- El catálogo carga sin login.
- El filtro muestra solo libros de la categoría.
- No se exponen acciones privadas de operador.
- El detalle muestra información coherente.

---

## TS02 — Registro de cliente

**Prioridad:** Alta  
**Datos:** correo único ficticio.

**Pasos:**
1. Ir a `/register`.
2. Ingresar nombre, correo y contraseña.
3. Enviar el formulario.

**Resultado esperado:**
- Se crea un usuario con rol `cliente`.
- Se inicia sesión automáticamente.
- No aparece el panel de operador.

---

## TS03 — Login válido e inválido

**Prioridad:** Alta

**Pasos:**
1. Ir a `/login`.
2. Probar credenciales inválidas.
3. Probar `cliente@demo.com` / `demo1234`.

**Resultado esperado:**
- Credenciales inválidas muestran un error genérico.
- Credenciales válidas permiten acceder al catálogo y al carrito.

---

## TS04 — Control de roles

**Prioridad:** Alta

**Pasos:**
1. Iniciar sesión como cliente.
2. Intentar abrir `/kitchen`.
3. Intentar abrir `/admin/books`.

**Resultado esperado:**
- El cliente es redirigido o recibe acceso denegado.
- No puede ver ni modificar el panel operador.

---

## TS05 — Catálogo, filtros y disponibilidad

**Prioridad:** Media

**Pasos:**
1. Iniciar sesión como cliente.
2. Filtrar por una categoría.
3. Abrir un libro disponible.
4. Intentar agregar un libro sin stock o no disponible.

**Resultado esperado:**
- Los resultados coinciden con la categoría.
- El stock mostrado es coherente.
- El botón de compra está deshabilitado para libros no disponibles.

---

## TS06 — Carrito y cantidades

**Prioridad:** Alta

**Pasos:**
1. Agregar dos libros distintos al carrito.
2. Aumentar y disminuir una cantidad.
3. Quitar un libro.
4. Revisar subtotal y total.

**Resultado esperado:**
- Las cantidades se actualizan.
- No se permiten cantidades menores a 1.
- El total coincide con precio × cantidad.
- El carrito persiste al recargar.

---

## TS07 — Validación de dirección

**Prioridad:** Media

**Pasos:**
1. Ir a `/cart`.
2. Dejar la dirección vacía o solo con espacios.
3. Intentar continuar al pago.

**Resultado esperado:**
- El botón de pago permanece deshabilitado o aparece un error claro.
- No se crea un pedido sin dirección válida.

---

## TS08 — Creación de pedido y total seguro

**Prioridad:** Alta

**Pasos:**
1. Agregar un libro al carrito.
2. Ingresar una dirección ficticia.
3. Iniciar el flujo de PayPal.
4. Inspeccionar la solicitud `POST /api/orders`.

**Resultado esperado:**
- El frontend envía solo `bookId`, `quantity` y `address`.
- El backend recalcula el total con el precio de MongoDB.
- Modificar el precio en la petición no cambia el importe.

---

## TS09 — Reintento de checkout sin duplicar pedido

**Prioridad:** Alta

**Pasos:**
1. Armar un carrito con dirección.
2. Abrir PayPal y cancelar.
3. Sin cambiar carrito ni dirección, volver a abrir PayPal.
4. Repetir el intento.

**Resultado esperado:**
- Se reutiliza el mismo pedido y la misma clave de idempotencia.
- No se crean pedidos duplicados.
- El stock no se descuenta varias veces.

---

## TS10 — Cambio de carrito o dirección

**Prioridad:** Alta

**Pasos:**
1. Iniciar un checkout.
2. Cancelar PayPal.
3. Cambiar una cantidad o la dirección.
4. Volver a pagar.

**Resultado esperado:**
- Se genera una nueva clave de checkout.
- El pedido anterior queda cancelado y libera su stock.
- El nuevo pedido refleja los datos actualizados.

---

## TS11 — Pago PayPal Sandbox aprobado

**Prioridad:** Alta  
**Precondición:** cuenta Personal de Sandbox disponible.

**Pasos:**
1. Completar carrito y dirección.
2. Clic en **Pagar con PayPal**.
3. Iniciar sesión con la cuenta Personal de Sandbox.
4. Aprobar el pago.
5. Esperar la redirección al detalle del pedido.

**Resultado esperado:**
- El pago queda `CAPTURED`.
- El pedido pasa a `PAID`.
- El carrito se vacía.
- El pedido aparece en el historial.
- El pedido aparece en `/kitchen` sin recargar.

---

## TS12 — Pago cancelado

**Prioridad:** Alta

**Pasos:**
1. Iniciar un checkout.
2. En PayPal elegir **Cancelar**.
3. Volver a la aplicación.
4. Revisar el historial y el stock.

**Resultado esperado:**
- El pedido no figura como pagado.
- El pedido queda `CANCELLED`.
- El stock reservado se libera.
- Se muestra un mensaje claro y se puede iniciar otro intento.

---

## TS13 — Captura repetida

**Prioridad:** Alta

**Pasos:**
1. Completar un pago aprobado.
2. Repetir la solicitud de captura del mismo pedido.
3. Revisar el estado del pedido y los pagos.

**Resultado esperado:**
- Se devuelve el pago ya capturado.
- No se genera un segundo cobro.
- El estado del pedido no regresa de `PREPARING`, `SHIPPED` o `DELIVERED` a `PAID`.

---

## TS14 — Historial y propiedad

**Prioridad:** Alta

**Pasos:**
1. Iniciar sesión como cliente.
2. Abrir `/orders`.
3. Intentar acceder al ID de un pedido de otro usuario.

**Resultado esperado:**
- Solo se listan pedidos propios.
- El acceso al pedido ajeno responde `403`.

---

## TS15 — Descarga digital

**Prioridad:** Alta

**Pasos:**
1. Abrir el detalle de un pedido pagado.
2. Hacer clic en **Descargar e-book**.
3. Verificar el archivo descargado.
4. Intentar descargar el mismo libro desde una cuenta sin compra.

**Resultado esperado:**
- El dueño recibe un archivo de demo edition.
- Otra cuenta recibe `403`.
- Un pedido no pagado no muestra el botón o recibe `403`.

---

## TS16 — Panel Kanban en tiempo real

**Prioridad:** Alta  
**Precondición:** dos sesiones: cliente y operador.

**Pasos:**
1. Abrir `/kitchen` como operador.
2. En otra sesión, completar un pago como cliente.
3. Verificar que aparece el pedido en la columna **Pagado**.
4. Avanzar a **Preparando**.
5. Observar el detalle del pedido del cliente.

**Resultado esperado:**
- El pedido aparece sin recargar.
- El cambio de estado se refleja en el cliente sin recargar.
- Solo se permiten transiciones secuenciales.

---

## TS17 — Datos de envío

**Prioridad:** Alta

**Pasos:**
1. Como operador, avanzar un pedido a **Preparando**.
2. Intentar avanzar a **Enviado** sin transportista ni tracking.
3. Ingresar transportista y código de seguimiento.
4. Confirmar el envío.
5. Abrir el detalle como cliente.

**Resultado esperado:**
- Sin datos de envío se rechaza la transición.
- Con datos válidos, pedido y shipment pasan a `SHIPPED`.
- El cliente ve transportista y código de seguimiento.

---

## TS18 — Entrega final

**Prioridad:** Alta

**Pasos:**
1. Como operador, avanzar un pedido enviado a **Entregado**.
2. Revisar el detalle del cliente.

**Resultado esperado:**
- Pedido y shipment quedan `DELIVERED`.
- La timeline muestra **Entregado** como estado actual.

---

## TS19 — Persistencia y rutas internas

**Prioridad:** Media

**Pasos:**
1. Recargar `/login`, `/cart`, `/orders` y `/kitchen`.
2. Navegar entre catálogo y detalle de libro.
3. Cerrar sesión y volver a iniciar como otro rol.

**Resultado esperado:**
- No hay errores de ruta ni pantallas blancas.
- La sesión se conserva correctamente.
- El socket se reconecta con la nueva identidad.
- Un cliente no hereda eventos privados del operador.

---

## TS20 — Recuperación de WebSocket

**Prioridad:** Alta

**Pasos:**
1. Abrir el detalle de un pedido.
2. Interrumpir la conexión de red brevemente.
3. Restablecerla.
4. Cambiar el estado desde otra sesión de operador.

**Resultado esperado:**
- El cliente se reconecta por WSS.
- Al reconectar, consulta el estado actual por REST.
- No pierde actualizaciones posteriores.

---

## Evidencia a guardar

Para cada caso:

- Nombre del caso.
- Fecha y hora.
- Resultado: PASS / FAIL / BLOCKED.
- Captura de pantalla final.
- Captura del error si falla.
- Clasificación: defecto funcional, ambiente, dato inválido o falso positivo.

Sugerencia de nombres:

```text
TS01-catalogo-publico-PASS.png
TS11-pago-sandbox-PASS.png
TS17-envio-PASS.png
```

## Resumen final

- Total ejecutados:
- Aprobados:
- Fallidos:
- Bloqueados:
- Tasa de éxito:
- Defectos abiertos:
- Decisión de liberación:
