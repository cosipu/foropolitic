# ForoPolitic

Foro anónimo tipo imageboard diseñado con arquitectura static-first: el frontend funciona desde el primer commit en GitHub Pages con `localStorage`, y el mismo cliente cambia a API REST cuando detecta backend disponible en Railway.

## 1. Estructura del proyecto

```text
/forum
	index.html
	style.css
	main.js
	robots.txt
	/frontend
		README.md
	/backend
		server.js
		package.json
		.env.example
		/controllers
			threadController.js
			postController.js
		/routes
			threadRoutes.js
			postRoutes.js
		/middleware
			rateLimit.js
		/utils
			forum.js
			prisma.js
		/prisma
			schema.prisma
			/migrations
				/20260315000000_init
					migration.sql
```

## 2. Arquitectura

### Frontend static-first

- [index.html](index.html): entrypoint válido para GitHub Pages desde la raíz.
- [style.css](style.css): contiene exactamente tu base visual y añade reglas extra compatibles con las clases pedidas.
- [main.js](main.js): elige entre modo `localStorage` y modo API sin cambiar el HTML.

### Backend escalable

- [backend/server.js](backend/server.js): API Express y entrega del frontend estático cuando se despliega en Railway.
- [backend/controllers/threadController.js](backend/controllers/threadController.js): lógica de hilos y respuestas.
- [backend/controllers/postController.js](backend/controllers/postController.js): moderación por contraseña.
- [backend/prisma/schema.prisma](backend/prisma/schema.prisma): modelo PostgreSQL con Prisma.

### Estrategia de conmutación

1. El frontend intenta cargar `GET /threads`.
2. Si la API responde JSON válido, entra en modo backend.
3. Si falla, usa `localStorage` y sigue operativo en GitHub Pages.

Para evitar conflictos con bases locales anteriores, el ejemplo del backend apunta por defecto a `foropolitic_static` en PostgreSQL.

## 3. Frontend inicial

### Qué hace ya

- Muestra título del foro, estado de ejecución y lista de hilos.
- Permite crear hilos y comentar.
- Ordena por actividad reciente.
- Limita longitud de título y mensaje.
- Escapa contenido al renderizar para evitar XSS.
- Usa `Anonymous` como autor fijo.

### Configurar API remota desde GitHub Pages

Si luego quieres que el frontend estático en GitHub Pages consuma Railway, edita esta meta en [index.html](index.html):

```html
<meta name="forum-api-base" content="https://tu-backend.up.railway.app" />
```

Si la dejas vacía, el cliente intenta misma origin y hace fallback a `localStorage`.

## 4. Backend básico con Express

### Endpoints

- `GET /threads`
- `POST /threads`
- `GET /threads/:id`
- `POST /threads/:id/replies`
- `DELETE /posts/:id`
- `GET /health`

### Características incluidas

- PostgreSQL con Prisma.
- Sanitización del texto en backend.
- Rate limiting básico en memoria.
- Moderación mediante `x-mod-password` o `modPassword`.
- `robots.txt` y cabecera `X-Robots-Tag: noindex`.

## 5. Base de datos

### Modelos

- `Thread`: título, timestamps y colección de posts.
- `Post`: mensaje, referencia opcional a otro post y bandera `isOp` para el mensaje inicial.

Schema en [backend/prisma/schema.prisma](backend/prisma/schema.prisma).

Migración inicial en [backend/prisma/migrations/20260315000000_init/migration.sql](backend/prisma/migrations/20260315000000_init/migration.sql).

## 6. Desarrollo local

### Frontend estático puro

Puedes abrir [index.html](index.html) directamente o servirlo con cualquier servidor estático. En ese caso usará `localStorage`.

### Backend local

```powershell
npm install
Copy-Item backend/.env.example backend/.env
docker compose up -d postgres
npm run db:migrate
npm run dev
```

El backend quedará en `http://localhost:3000` y servirá también el frontend raíz.

## 7. Deploy en Railway

1. Crea un proyecto en Railway con PostgreSQL.
2. Sube este repositorio.
3. Configura las variables de [backend/.env.example](backend/.env.example):
	 `DATABASE_URL`, `MOD_PASSWORD`, `CORS_ORIGIN`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`.
4. Railway usará [Dockerfile](Dockerfile) y [railway.json](railway.json).

## 8. Observaciones de privacidad

El frontend estático en GitHub Pages no puede ser realmente privado: solo puede ser poco visible y no indexable. La privacidad real depende del backend y de la infraestructura donde lo despliegues. En Railway, la aplicación no persiste cuentas ni perfiles, pero el proveedor puede seguir generando logs de red fuera del control de la app.