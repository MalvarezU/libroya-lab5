# Configuración de MongoDB Atlas — LibroYa

## 1. Proyecto y clúster

1. Entrar a https://cloud.mongodb.com/.
2. Crear/seleccionar el proyecto del laboratorio.
3. Crear un clúster de desarrollo (nivel gratuito si está disponible).
4. Anotar el host del clúster sin publicar la URI completa.

## 2. Usuario de base de datos

1. **Database Access** → **Add New Database User**.
2. Authentication Method: **Password**.
3. Crear un usuario dedicado para la aplicación (no reutilizar credenciales personales).
4. Password larga y única; evitar caracteres especiales o codificarlos con `encodeURIComponent` en la URI.
5. Privilegios mínimos: **Read and write to any database** para el lab, o permisos específicos sobre la base `platoya`.

## 3. Network Access

1. **Network Access** → **Add IP Address**.
2. Agregar la IP de desarrollo.
3. Para el lab se puede usar `0.0.0.0/0` temporalmente; no dejarlo como configuración de producción.
4. Al desplegar en Railway, verificar que Atlas acepte la conexión desde el servicio.

## 4. URI de conexión

1. **Connect** → **Drivers** → **Node.js**.
2. Copiar la URI y reemplazar `<db_username>` y `<db_password>`.
3. Agregar la base de datos: `/platoya`.
4. Guardar solo en `server/.env` o variables privadas de Railway.
5. Nunca commitear la URI ni pegarla en prompts/capturas.

Ejemplo de forma (sin valores reales):

```env
MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/platoya?retryWrites=true&w=majority
```

## 5. Validación

1. Iniciar backend: `cd server && npm run dev`.
2. Confirmar log `MongoDB connected successfully` sin secretos.
3. Ejecutar seed: `SEED=true npm run dev`.
4. Verificar colecciones `users`, `books`, `orders`, `payments`, `shipments` en Data Explorer.
5. Probar URI inválida y verificar que el proceso falla de forma controlada.

## 6. Transacciones

La reserva atómica de stock usa transacciones de MongoDB. El clúster Atlas debe ser un replica set (los clústeres Atlas lo son). Un MongoDB local standalone no sirve para esta prueba sin convertirse en replica set.
