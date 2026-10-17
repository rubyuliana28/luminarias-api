# luminarias-api

API REST para gestionar luminarias de alumbrado público, construida con NestJS, Prisma y PostgreSQL. Es un proyecto de práctica que voy construyendo por pasos para afianzar mis conocimientos de backend.

## Tecnologías

- Node.js y NestJS (TypeScript)
- PostgreSQL
- Prisma ORM 7, con migraciones versionadas
- class-validator para validar los datos de entrada con DTOs
- JWT (`@nestjs/jwt`) y bcryptjs para la autenticación

## Requisitos

- Node.js (versión LTS)
- PostgreSQL en ejecución, con una base de datos llamada `luminarias`

## Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `DATABASE_URL` | Dirección de conexión a PostgreSQL |
| `JWT_SECRET` | Clave con la que se firman los tokens JWT |

Un valor aleatorio para `JWT_SECRET` se puede generar así:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Cómo correrlo

```bash
git clone https://github.com/rubyuliana28/luminarias-api.git
cd luminarias-api
npm install
```

Crea el archivo `.env` a partir del ejemplo y escribe tus datos de PostgreSQL y tu `JWT_SECRET`:

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

**Luminaria**

| Campo | Tipo | Detalle |
|---|---|---|
| `id` | entero | Se genera solo |
| `sector` | texto | Obligatorio. Tiene un índice, porque es la columna por la que se filtra |
| `potencia` | entero | Obligatorio, mínimo 1 |
| `estado` | texto | Opcional, por defecto `encendida` |
| `creadaEn` | fecha | Se asigna al crear |

**Usuario**

| Campo | Tipo | Detalle |
|---|---|---|
| `id` | entero | Se genera solo |
| `email` | texto | Único (índice único) |
| `passwordHash` | texto | Hash bcrypt de la contraseña; la contraseña nunca se guarda |
| `rol` | texto | `operador` por defecto, o `admin` |
| `creadoEn` | fecha | Se asigna al crear |

## Endpoints

| Verbo y URL | Qué hace | Acceso | Respuesta normal |
|---|---|---|---|
| `POST /auth/register` | Registra un usuario (rol `operador`) | Público | 201, o 409 si el correo ya existe |
| `POST /auth/login` | Devuelve un token JWT | Público | 200, o 401 si las credenciales son inválidas |
| `POST /luminarias` | Crea una luminaria | Con token | 201 |
| `GET /luminarias` | Lista todas las luminarias | Con token | 200 |
| `GET /luminarias/:id` | Devuelve una luminaria | Con token | 200, o 404 si no existe |
| `PATCH /luminarias/:id` | Cambio parcial de una luminaria | Con token | 200, o 404 si no existe |
| `DELETE /luminarias/:id` | Borra una luminaria | Solo `admin` | 200, 403 si no es admin, o 404 si no existe |

Si los datos enviados no cumplen las reglas del DTO, la API responde 400 con el detalle del error.

## Autenticación y roles

- Todas las rutas, excepto el registro y el login, exigen la cabecera `Authorization: Bearer <token>`. Sin token, o con un token inválido o vencido, la respuesta es 401.
- El token se firma con `JWT_SECRET`, lleva el id, el correo y el rol del usuario, y vence en una hora.
- Borrar una luminaria exige el rol `admin`. Con otro rol, la respuesta es 403.
- Los usuarios nuevos nacen con rol `operador`. El primer administrador se asigna directamente en la base de datos, a propósito, para que nadie pueda ascenderse desde la API:

```sql
UPDATE "Usuario" SET rol = 'admin' WHERE email = 'correo@ejemplo.com';
```

## Ejemplo de uso (PowerShell)

```powershell
# Registrarse
Invoke-RestMethod -Method Post -Uri http://localhost:3000/auth/register -ContentType "application/json" -Body '{"email":"ana@ejemplo.com","password":"Clave12345"}'

# Iniciar sesión y guardar el token
$token = (Invoke-RestMethod -Method Post -Uri http://localhost:3000/auth/login -ContentType "application/json" -Body '{"email":"ana@ejemplo.com","password":"Clave12345"}').access_token

# Crear una luminaria
Invoke-RestMethod -Method Post -Uri http://localhost:3000/luminarias -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body '{"sector":"Norte","potencia":70}'

# Cambio parcial: solo el estado
Invoke-RestMethod -Method Patch -Uri http://localhost:3000/luminarias/1 -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body '{"estado":"apagada"}'
```

## Decisiones de diseño

- El acceso a la base de datos está en un `PrismaService`, un provider que se inyecta en los servicios. Así la lógica no conoce los detalles de la base.
- La validación se hace con DTOs y un `ValidationPipe` global: los datos inválidos se rechazan antes de llegar al servicio.
- Las contraseñas se guardan con hash bcrypt (con salt). El login las compara y nunca las descifra.
- El guard de autenticación es global y seguro por defecto: solo las rutas marcadas con `@Public()` pasan sin token. Un segundo guard comprueba el rol y responde 403.
- Las claves viven en el archivo `.env`, que no se sube al repositorio. En el repositorio solo está `.env.example`.

## Próximos pasos

- [x] Autenticación con JWT y contraseñas con hash
- [ ] Pruebas unitarias con Jest y mocks
- [ ] Docker y Docker Compose
- [ ] Pipeline de CI con GitHub Actions