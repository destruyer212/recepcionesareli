# Recepciones Areli

Proyecto administrativo para Recepciones Areli.

## Carpetas

- `areli-api`: backend Spring Boot + Java + Supabase PostgreSQL.
- `areli-web`: frontend React + Vite.
- `documentacion`: contratos, PDFs, Word y renders del análisis inicial.

## Ejecutar todo

```powershell
.\run-dev.ps1
```

URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8083/api/health
```

## Ejecutar por separado

Backend:

```powershell
cd areli-api
.\mvnw.cmd spring-boot:run
```

Frontend:

```powershell
cd areli-web
npm run dev -- --host 127.0.0.1 --port 5173
```
