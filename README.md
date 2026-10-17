# luminarias-api

API REST para gestionar luminarias de alumbrado público, construida con NestJS, Prisma y PostgreSQL. Es un proyecto de práctica que voy construyendo por pasos para afianzar mis conocimientos de backend.

## Tecnologías

- Node.js y NestJS (TypeScript)
- PostgreSQL
- Prisma ORM 7, con migraciones versionadas
- class-validator para validar los datos de entrada con DTOs

## Requisitos

- Node.js (versión LTS)
- PostgreSQL en ejecución, con una base de datos llamada `luminarias`

## Cómo correrlo

```bash
git clone https://github.com/rubyuliana28/luminarias-api.git
cd luminarias-api
npm install
```

Crea el archivo `.env` a partir del ejemplo y escribe tu usuario y tu clave de PostgreSQL:

```bash
cp .env.example .env
```

En PowerShell: `Copy-Item .env.example .env`

Aplica las migraciones, genera el cliente de Prisma y arranca el servidor:

```bash
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

La API queda disponible en `http://localhost:3000`.

## Modelo de datos

| Campo | Tipo | Detalle |
|---|---|---|
| `id` | entero | Se genera solo |
| `sector` | texto | Obligatorio. Tiene un índice, porque es la columna por la que se filtra |
| `potencia` | entero | Obligatorio, mínimo 1 |
| `estado` | texto | Opcional, por defecto `encendida` |
| `creadaEn` | fecha | Se asigna al crear |

## Endpoints

| Verbo y URL | Qué hace | Respuesta normal |
|---|---|---|
| `POST /luminarias` | Crea una luminaria | 201 |
| `GET /luminarias` | Lista todas las luminarias | 200 |
| `GET /luminarias/:id` | Devuelve una luminaria | 200, o 404 si no existe |
| `PATCH /luminarias/:id` | Cambio parcial de una luminaria | 200, o 404 si no existe |
| `DELETE /luminarias/:id` | Borra una luminaria | 200, o 404 si no existe |

Si los datos enviados no cumplen las reglas del DTO, la API responde 400 con el detalle del error.

## Ejemplo de uso (PowerShell)

```powershell
# Crear
Invoke-RestMethod -Method Post -Uri http://localhost:3000/luminarias -ContentType "application/json" -Body '{"sector":"Norte","potencia":70}'

# Listar
Invoke-RestMethod -Uri http://localhost:3000/luminarias

# Cambio parcial: solo el estado
Invoke-RestMethod -Method Patch -Uri http://localhost:3000/luminarias/1 -ContentType "application/json" -Body '{"estado":"apagada"}'
```

## Decisiones de diseño

- El acceso a la base de datos está en un `PrismaService`, un provider que se inyecta en el servicio de luminarias. Así la lógica no conoce los detalles de la base.
- La validación se hace con DTOs y un `ValidationPipe` global: los datos inválidos se rechazan antes de llegar al servicio.
- La clave de la base de datos vive en el archivo `.env`, que no se sube al repositorio. En el repositorio solo está `.env.example`.

## Próximos pasos

- [ ] Autenticación con JWT y contraseñas con hash
- [ ] Pruebas unitarias con Jest y mocks
- [ ] Docker y Docker Compose
- [ ] Pipeline de CI con GitHub Actions