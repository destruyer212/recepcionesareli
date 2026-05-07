# Areli API

Backend Spring Boot para el Sistema Administrativo de Recepciones Areli.

## Stack

- Java 17
- Spring Boot 3.5
- Maven
- Supabase PostgreSQL
- Flyway para migraciones
- OpenAI Responses API preparada para funciones inteligentes

## Configuracion

Copia `.env.example` y configura tus datos reales de Supabase/OpenAI.

En PowerShell puedes exportar variables asi:

```powershell
$env:SUPABASE_DB_URL="jdbc:postgresql://TU_HOST:6543/postgres?sslmode=require"
$env:SUPABASE_DB_USER="postgres.TU_PROJECT_REF"
$env:SUPABASE_DB_PASSWORD="TU_PASSWORD"
$env:AI_ENABLED="true"
$env:OPENAI_API_KEY="TU_API_KEY"
$env:OPENAI_MODEL="gpt-5"
```

Para probar sin IA real, deja:

```powershell
$env:AI_ENABLED="false"
```

## Ejecutar

```powershell
.\mvnw.cmd spring-boot:run
```

Health check:

```text
GET http://localhost:8083/api/health
```

## Endpoints iniciales

- `GET /api/floors`
- `GET /api/packages`
- `GET /api/clients`
- `POST /api/clients`
- `GET /api/events`
- `POST /api/events`
- `GET /api/dashboard/summary`

## Endpoints IA preparados

- `POST /api/ai/contracts/draft`
- `POST /api/ai/events/summary`
- `POST /api/ai/marketing/copy`
- `POST /api/ai/balance/explain`

Ejemplo para generar borrador de contrato:

```json
{
  "clientName": "Juan Perez",
  "clientDocument": "12345678",
  "eventType": "Matrimonio",
  "floorName": "2do piso",
  "eventDate": "2026-08-15",
  "startTime": "18:00:00",
  "endTime": "23:00:00",
  "packageName": "Paquete Premium",
  "totalAmount": 12500,
  "depositAmount": 3750,
  "guaranteeAmount": 800,
  "specialTerms": "Sin corcho libre. Garantia sujeta a revision del local."
}
```

## Notas de Supabase

Supabase se usa como PostgreSQL. El backend se conecta por JDBC y Flyway crea las tablas iniciales:

- clientes
- pisos
- paquetes
- eventos
- contratos
- pagos
- garantias
- personal
- gastos
- inventario
- galeria/media

La migracion inicial esta en:

```text
src/main/resources/db/migration/V1__initial_schema.sql
```
