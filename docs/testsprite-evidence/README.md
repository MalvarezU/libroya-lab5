# Evidencia TestSprite — LibroYa

## Proyecto

- Nombre: LibroYa Lab 5.
- Tipo: Frontend / Live Web App.
- URL: https://frontend-production-c1fae6c3.up.railway.app
- Project ID: `d182ce8e-b90b-4605-b2ec-7098f1b3788d`.
- Portal: https://www.testsprite.com/dashboard-v3/o/0b1deba1-204b-5081-b3b9-feb547dcb177/projects/d182ce8e-b90b-4605-b2ec-7098f1b3788d

## Resumen

| Estado | Casos |
|--------|-------|
| PASSED | 12 |
| FAILED | 0 |
| BLOCKED | 8 |
| Total | 20 |

Tasa de éxito sobre casos ejecutables: **12/12 = 100%**.  
Tasa de cobertura total: **12/20 = 60%**; los 8 bloqueados requieren capacidades que el runner Free no ofrece o credenciales que no se almacenan de forma segura.

## Ejecuciones

- Cliente (TS01–TS04, TS06–TS07, TS09, TS11, TS13, TS18):  
  https://www.testsprite.com/dashboard-v3/o/0b1deba1-204b-5081-b3b9-feb547dcb177/projects/d182ce8e-b90b-4605-b2ec-7098f1b3788d/execution/5a998d77-5c59-45ba-820b-aec5027d6431
- Cliente (TS10, TS12, TS14, TS19):  
  https://www.testsprite.com/dashboard-v3/o/0b1deba1-204b-5081-b3b9-feb547dcb177/projects/d182ce8e-b90b-4605-b2ec-7098f1b3788d/execution/85e0e3b3-3dd1-4a70-a4a1-d7df145afd3f
- Operador (TS05):  
  https://www.testsprite.com/dashboard-v3/o/0b1deba1-204b-5081-b3b9-feb547dcb177/projects/d182ce8e-b90b-4605-b2ec-7098f1b3788d/execution/985becfa-7139-4f90-ae62-46eed8359c1d
- Bloqueados restantes (TS15, TS16, TS19, TS20):  
  https://www.testsprite.com/dashboard-v3/o/0b1deba1-204b-5081-b3b9-feb547dcb177/projects/d182ce8e-b90b-4605-b2ec-7098f1b3788d/execution/ab4cdaee-6050-48e7-a714-bc6d911be278
- Bloqueado TS17:  
  https://www.testsprite.com/dashboard-v3/o/0b1deba1-204b-5081-b3b9-feb547dcb177/projects/d182ce8e-b90b-4605-b2ec-7098f1b3788d/execution/a8f61571-0b05-4f6f-aea8-cbed85f015ae

## Resultados por caso

| Caso | Resultado | Evidencia |
|------|-----------|-----------|
| TS01 Catálogo público | PASSED | `results/TS01.json`, `TS01/final-step.png` |
| TS02 Registro | PASSED | `results/TS02.json` |
| TS03 Login | PASSED | `results/TS03.json` |
| TS04 Roles | PASSED | `results/TS04.json` |
| TS05 Sin stock | PASSED | `results/TS05.json`, `TS05/final-step.png` |
| TS06 Carrito | PASSED | `results/TS06.json`, `TS06/final-step.png` |
| TS07 Dirección vacía | PASSED | `results/TS07.json` |
| TS08 Precio manipulado | BLOCKED | Runner no permite editar `localStorage`; verificado manualmente por API |
| TS09 Reintento checkout | PASSED | `results/TS09.json` |
| TS10 Cambio de carrito | PASSED | `results/TS10.json`, `TS10/final-step.png` |
| TS11 Pago aprobado | BLOCKED | Runner no tiene credenciales seguras del comprador PayPal; pago verificado manualmente |
| TS12 Pago cancelado | PASSED | `results/TS12.json`, `TS12/final-step.png` |
| TS13 Captura repetida | BLOCKED | Requiere compra PayPal Sandbox; idempotencia verificada por API |
| TS14 Propiedad | PASSED | `results/TS14.json` |
| TS15 Descarga | BLOCKED | Requiere compra PayPal Sandbox; entitlement verificado por API |
| TS16 Kanban tiempo real | BLOCKED | Requiere operador + compra PayPal Sandbox; WSS verificado manualmente |
| TS17 Envíos | BLOCKED | Requiere operador + compra PayPal Sandbox; shipment verificado por API |
| TS18 Entrega | BLOCKED | Requiere operador + compra PayPal Sandbox; transición verificada por API |
| TS19 Rutas/sesión | PASSED | `results/TS19.json` |
| TS20 Recuperación WSS | BLOCKED | Requiere operador + compra PayPal Sandbox y control de red; WSS verificado manualmente |

## Evidencia manual complementaria

Ver `docs/informe-resultados.md`, sección “Pruebas manuales ejecutadas”:

- Pago PayPal Sandbox aprobado y capturado.
- Precio manipulado ignorado por el backend.
- Captura repetida sin regresión de estado.
- Descarga con entitlement 200 / sin entitlement 403.
- Shipment con carrier/tracking y transición a DELIVERED.
- WSS desplegado con recepción de `order:status_changed`.
