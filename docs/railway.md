# Despliegue en Railway — LibroYa

## 1. Repositorio

1. Subir el repo a GitHub sin `.env` (verificado: gitignored).
2. Confirmar build local:
   - `cd server && npm start`
   - `cd web && npm run build && npm run start`

## 2. Proyecto Railway

1. Crear proyecto en Railway desde GitHub.
2. Crear dos servicios desde el mismo repositorio.

### Servicio Backend

- **Root Directory:** `/server`
- **Build Command:** `npm install` (o el detectado por Railway)
- **Start Command:** `npm start`
- Variables:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `CLIENT_ORIGIN` = dominio HTTPS exacto del frontend
  - `PAYPAL_CLIENT_ID`
  - `PAYPAL_CLIENT_SECRET`
  - `PAYPAL_API_BASE=https://api-m.sandbox.paypal.com`
  - `NODE_ENV=production`
  - `PORT` lo inyecta Railway
- Generar dominio público y verificar `GET /health`.

### Servicio Frontend

- **Root Directory:** `/web`
- **Build Command:** `npm run build`
- **Start Command:** `npm run start`
- Variables:
  - `NEXT_PUBLIC_API_URL` = dominio HTTPS público del backend
  - `NEXT_PUBLIC_PAYPAL_CLIENT_ID` = Client ID de Sandbox (público)
- Generar dominio público.

## 3. Orden de configuración

1. Desplegar backend con `CLIENT_ORIGIN` provisional (`http://localhost:3000`).
2. Obtener dominio backend.
3. Desplegar frontend con `NEXT_PUBLIC_API_URL` del backend.
4. Obtener dominio frontend.
5. Actualizar `CLIENT_ORIGIN` del backend con el dominio exacto del frontend y redesplegar.

## 4. Checklist

- [ ] Frontend abre por HTTPS.
- [ ] Backend responde `/health`.
- [ ] CORS permite solo el dominio frontend.
- [ ] Atlas acepta la conexión desde Railway (IP `0.0.0.0/0` para el lab).
- [ ] PayPal usa Sandbox y credenciales correctas.
- [ ] Socket.IO conecta por WSS y se reconecta.
- [ ] Logs no imprimen secretos.
- [ ] Flujo completo de compra funciona desplegado.

## 5. URLs de entrega

- Frontend: `<pendiente>`
- Backend: `<pendiente>`
