# Solución de problemas — LibroYa

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| MongoDB no conecta | URI, usuario/password, IP o base incorrectos | Verificar `server/.env`, Database Access y Network Access; no publicar la URI |
| `bad auth` | Usuario/password no coinciden con Atlas | Revisar el usuario del proyecto que contiene el clúster; regenerar password si hace falta |
| CORS en navegador | `CLIENT_ORIGIN` no coincide con el frontend | Configurar origen exacto (esquema + host + puerto) y reiniciar backend |
| PayPal SDK no carga | `NEXT_PUBLIC_PAYPAL_CLIENT_ID` faltante/placeholder | Completar `web/.env.local` y reiniciar `npm run dev` |
| PayPal rechaza orden | Sandbox/Live mezclados o credenciales incorrectas | Usar Client ID/Secret de Sandbox y `PAYPAL_API_BASE=https://api-m.sandbox.paypal.com` |
| PayPal pide otra cuenta | Se está usando la cuenta Business del comercio para pagar | Usar una cuenta Sandbox **Personal/comprador** |
| Pedido figura pendiente tras pagar | Se está mirando otro pedido o el socket quedó con otra identidad | Verificar estado en Atlas/API; cerrar sesión y volver a entrar; recargar `/kitchen` |
| WebSocket no conecta | URL, WSS, CORS o handshake JWT | Revisar `NEXT_PUBLIC_API_URL`, `CLIENT_ORIGIN`, token y logs de Railway |
| Funciona local y no en Railway | Variable ausente, root directory o comando incorrecto | Backend root `/server`, frontend root `/web`; revisar build/start y variables |
| Stock no disminuye | Transacción falló o clúster sin soporte de transacciones | Revisar logs; confirmar replica set de Atlas |
| TestSprite intermitente | Datos compartidos, latencia o ambiente inestable | Aislar cuentas/datos, repetir de forma controlada y separar fallos de ambiente |
| Next.js: URL data fuera de Suspense | `params` accedido fuera del boundary | Mantener el acceso dentro de un componente async envuelto por `<Suspense>` |

## Logs útiles

```bash
# Backend
cd server && npm run dev

# Frontend
cd web && npm run dev

# Verificación de tipos
cd web && npx tsc --noEmit

# Build de producción
cd web && npm run build
```
