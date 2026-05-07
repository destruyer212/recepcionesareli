# Areli Web

Frontend administrativo para Recepciones Areli, construido con React, Vite y Tailwind CSS.

## Vistas listas

- Dashboard del negocio
- Calendario/lista de eventos
- Registro de clientes
- Paquetes comerciales
- Pisos y ambientes
- Herramientas IA
- Layout responsive para escritorio, tablet y celular

## Configuracion

El frontend consume el backend en:

```text
http://localhost:8083/api
```

Esto se configura en:

```text
.env
```

## Ejecutar

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Abrir:

```text
http://localhost:5173
```

## Compilar

```powershell
npm run build
```
