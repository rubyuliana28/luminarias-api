# luminarias-api

![CI](https://github.com/rubyuliana28/luminarias-api/actions/workflows/ci.yml/badge.svg)

API REST para gestionar luminarias de alumbrado público, construida con NestJS, Prisma y PostgreSQL. Es un proyecto de práctica que voy construyendo por pasos para afianzar mis conocimientos de backend.

## Tecnologías

- Node.js y NestJS (TypeScript)
- PostgreSQL
- Prisma ORM 7, con migraciones versionadas
- class-validator para validar los datos de entrada con DTOs
- JWT (`@nestjs/jwt`) y bcryptjs para la autenticación
- Jest para las pruebas unitarias
- Amazon SQS (`@aws-sdk/client-sqs`) para los trabajos en segundo plano
- Docker y Docker Compose; GitHub Actions para el CI y el CD

## Requisitos

- Node.js (versión LTS)
- PostgreSQL en ejecución, con una base de datos llamada `luminarias` (o Docker, ver más abajo)

## Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `DATABASE_URL` | Dirección de conexión a PostgreSQL |
| `JWT_SECRET` | Clave con la que se firman los tokens JWT |
| `POSTGRES_PASSWORD` | Clave de la base de datos del contenedor (solo para Docker Compose) |
| `AWS_PROFILE` | Perfil de AWS con permisos sobre la cola (en `~/.aws/config`) |
| `AWS_REGION` | Región de la cola, por ejemplo `us-east-2` |
| `SQS_QUEUE_URL` | URL de la cola de SQS. Si falta, la API arranca pero el consumidor no |

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

Crea el archivo `.env` a partir del ejemplo y escribe tus datos:

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

## Con Docker

```bash
docker compose up --build
```

Levanta la API en `http://localhost:3000` y una base PostgreSQL en el puerto 5433 de tu equipo. Las migraciones se aplican al arrancar. Requiere las variables `POSTGRES_PASSWORD` y `JWT_SECRET` en el archivo `.env`, y las de AWS para la cola.

Las credenciales de AWS no entran a la imagen: la carpeta `~/.aws` de tu equipo se monta en el contenedor. Si usas `aws login`, inicia sesión antes de levantar los contenedores (`aws login --profile luminarias`).

Para detener todo: `docker compose down`. Los datos se conservan en un volumen; `docker compose down -v` también los borra.

## Pruebas

```bash
npm test
```

Pruebas unitarias con Jest. Las dependencias (Prisma y el servicio de JWT) se reemplazan por mocks, así que no necesitan base de datos ni servidor.

## Integración continua

Cada Pull Request y cada push a `main` ejecutan el CI con GitHub Actions: instala las dependencias, genera el cliente de Prisma, corre las pruebas y compila. La imagen de Docker solo se construye si las pruebas pasan.

## Carga de datos

Un script carga un inventario de luminarias desde un archivo CSV:

```bash
npm run cargar:inventario -- "ruta/al/archivo.csv"
```

El CSV debe tener las columnas `codigo`, `direccion`, `sector`, `potencia` y `estado`. La carga se hace por lotes de 1.000 filas dentro de una transacción (o entra todo, o no entra nada), y se puede repetir sin duplicar filas: antes de insertar, borra las luminarias que ya tenían código.

Los datos del inventario no están en este repositorio: el script recibe la ruta del archivo como argumento, y los archivos `.csv` están ignorados por Git.

## Modelo de datos

**Luminaria**

| Campo | Tipo | Detalle |
|---|---|---|
| `id` | entero | Se genera solo |
| `codigo` | texto | Opcional y único (índice único). Identifica cada luminaria del inventario |
| `direccion` | texto | Opcional |
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

**Trabajo**

| Campo | Tipo | Detalle |
|---|---|---|
| `id` | texto (UUID) | Se genera solo |
| `tipo` | texto | Qué hay que hacer, por ejemplo `resumen-sectores` |
| `estado` | texto | `pendiente`, `procesando`, `completado` o `fallido` |
| `resultado` | JSON | Opcional. Lo guarda el consumidor al terminar |
| `error` | texto | Opcional. El motivo, si falló |
| `creadoEn` / `actualizadoEn` | fecha | Se asignan solas |

## Endpoints

| Verbo y URL | Qué hace | Acceso | Respuesta normal |
|---|---|---|---|
| `POST /auth/register` | Registra un usuario (rol `operador`) | Público | 201, o 409 si el correo ya existe |
| `POST /auth/login` | Devuelve un token JWT | Público | 200, o 401 si las credenciales son inválidas |
| `POST /luminarias` | Crea una luminaria | Con token | 201 |
| `GET /luminarias` | Lista luminarias por páginas (`?sector=COMUNA 5&page=1&pageSize=20`) | Con token | 200, o 400 si los parámetros son inválidos |
| `GET /luminarias/:id` | Devuelve una luminaria | Con token | 200, o 404 si no existe |
| `PATCH /luminarias/:id` | Cambio parcial de una luminaria | Con token | 200, o 404 si no existe |
| `DELETE /luminarias/:id` | Borra una luminaria | Solo `admin` | 200, 403 si no es admin, o 404 si no existe |
| `POST /luminarias/resumen-sectores` | Pide el conteo de luminarias por sector, en segundo plano | Solo `admin` | 202 con el `trabajoId` |
| `GET /luminarias/resumen-sectores/:trabajoId` | Estado y resultado de ese trabajo | Solo `admin` | 200, o 404 si no existe |

Si los datos enviados no cumplen las reglas del DTO, la API responde 400 con el detalle del error. Lo mismo si el `:id` no es un número entero o el `:trabajoId` no es un UUID.

## Cola de trabajos (SQS)

Las tareas pesadas no se hacen dentro de la petición: se dejan en una cola de Amazon SQS y las procesa un consumidor que corre dentro de la misma API.

1. `POST /luminarias/resumen-sectores` guarda una fila en la tabla `Trabajo` (estado `pendiente`), envía a la cola un mensaje con su `trabajoId` y responde **202** de inmediato.
2. El consumidor lee la cola con *long polling*: cada consulta espera hasta 20 segundos a que llegue algo, en vez de preguntar sin parar a una cola vacía.
3. Al recibir el mensaje, calcula el resumen, guarda el resultado en la fila (estado `completado`) y **solo entonces** borra el mensaje de la cola.
4. Si algo falla, el mensaje no se borra: SQS lo vuelve a entregar cuando vence el *visibility timeout*.
5. `GET /luminarias/resumen-sectores/:trabajoId` consulta la fila para ver el estado y el resultado.

SQS entrega cada mensaje **al menos una vez**, así que el mismo mensaje puede llegar dos veces. Por eso el procesamiento es **idempotente**: si el trabajo ya está `completado`, no se vuelve a calcular y solo se borra el mensaje.

Configuración recomendada en AWS:
- Una **cola de mensajes fallidos (DLQ)** con `maxReceiveCount` de 3. Así un mensaje que siempre falla deja de reintentarse y queda guardado para revisarlo.
- Permisos del usuario: `sqs:SendMessage`, `sqs:ReceiveMessage` y `sqs:DeleteMessage` sobre la cola.

```powershell
# Pedir el resumen (con un token de admin)
$trabajo = Invoke-RestMethod -Method Post -Uri http://localhost:3000/luminarias/resumen-sectores -Headers @{ Authorization = "Bearer $token" }

# Consultar cómo va
Invoke-RestMethod -Uri "http://localhost:3000/luminarias/resumen-sectores/$($trabajo.trabajoId)" -Headers @{ Authorization = "Bearer $token" }
```

## Paginación

`GET /luminarias` acepta tres parámetros opcionales: `sector` (texto exacto), `page` (desde 1) y `pageSize` (entre 1 y 100, por defecto 20). La respuesta trae los datos y la información de la página:

```json
{ "data": [], "total": 13216, "page": 1, "pageSize": 20, "totalPages": 661 }
```

El orden es siempre por `id`, para que las páginas no se repitan ni se salten filas.

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

# Listar la primera página de un sector
Invoke-RestMethod -Uri "http://localhost:3000/luminarias?sector=COMUNA%205&page=1&pageSize=5" -Headers @{ Authorization = "Bearer $token" }

# Cambio parcial: solo el estado
Invoke-RestMethod -Method Patch -Uri http://localhost:3000/luminarias/1 -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body '{"estado":"apagada"}'
```

## Decisiones de diseño

- El acceso a la base de datos está en un `PrismaService`, un provider que se inyecta en los servicios. Así la lógica no conoce los detalles de la base.
- La validación se hace con DTOs y un `ValidationPipe` global: los datos inválidos se rechazan antes de llegar al servicio.
- Las contraseñas se guardan con hash bcrypt (con salt). El login las compara y nunca las descifra.
- El guard de autenticación es global y seguro por defecto: solo las rutas marcadas con `@Public()` pasan sin token. Un segundo guard comprueba el rol y responde 403.
- Las claves viven en el archivo `.env`, que no se sube al repositorio. En el repositorio solo está `.env.example`, con marcadores.
- Las migraciones que agregan columnas a una tabla con datos las crean como opcionales, para no romper las filas existentes.
- La carga masiva usa lotes y una transacción, y los datos del inventario nunca entran al repositorio.
- En Docker, las migraciones se aplican al arrancar el contenedor, y los datos viven en un volumen, por lo que sobreviven a los contenedores.
- SQS no guarda resultados, así que el estado de cada trabajo vive en PostgreSQL. La fila se crea antes de enviar el mensaje, para que el consumidor siempre la encuentre.
- El consumidor solo borra un mensaje cuando el trabajo terminó bien, y es idempotente porque SQS puede entregar un mensaje más de una vez. Al apagar la app (`docker stop`), deja de escuchar y termina el mensaje que tenga en curso.

## Próximos pasos

- [x] Autenticación con JWT y contraseñas con hash
- [x] Pruebas unitarias con Jest y mocks
- [x] Docker y Docker Compose
- [x] Integración continua (CI) con GitHub Actions
- [x] Migración (`codigo`, `direccion`) y carga del inventario por lotes
- [x] Paginación y filtro por sector
- [x] Pruebas de los guards
- [ ] Tabla de sectores, con migración de datos
- [x] Cola de trabajos con SQS y consumidor idempotente
- [ ] Frontend sencillo, corriendo en Docker
- [ ] Despliegue continuo (CD) en la nube