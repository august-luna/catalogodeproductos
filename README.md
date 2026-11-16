# La Barra — catálogo de bebidas

Catálogo de productos en español creado con Next.js App Router, React, TypeScript y Tailwind CSS. La interfaz incluye búsqueda, filtros por categoría, favoritos y una bolsa de compras de demostración.

## Requisitos

- Node.js 20.9 o posterior
- npm
- MySQL 8 o compatible (opcional; si no está configurado, se muestran productos de ejemplo)

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Preparar MySQL

1. Copia `.env.example` a `.env.local` y configura las credenciales de tu instancia para ejecutar el script local de administración. La aplicación desplegada usa el binding `HYPERDRIVE` de `wrangler.jsonc`, no las variables `MYSQL_*`. No subas `.env.local` al repositorio.
2. Ejecuta `database/schema.sql` para una base de datos nueva. Para las tablas existentes, ejecuta una sola vez `database/migrations/001_user_roles.sql` en `db_tienda_august`.
3. Genera un valor aleatorio para `SESSION_SECRET` (el comando está en `.env.example`) y define contraseñas distintas de al menos 12 caracteres para `ADMIN_PASSWORD` y `PROFESOR_PASSWORD` en `.env.local`.
4. Ejecuta `npm run db:setup-admins`. La operación convierte a hashes scrypt las contraseñas existentes en texto plano y crea o actualiza las cuentas administradoras `admin` y `profesor`. Al ejecutarla de nuevo, también restablece las contraseñas de esas dos cuentas con los valores actuales de `.env.local`.
5. Inicia el sitio con `npm run dev` y entra al panel en `/admin/login`. Las cuentas normales tienen rol `usuario`; solo cuentas activas con rol `admin` pueden entrar.
6. `txt_foto_pro` debe contener una URL `https://...` o una ruta de imagen dentro de `public/`. Por ejemplo, `bebidas/cola.jpg` se sirve desde `public/bebidas/cola.jpg`. Si falta la imagen o no carga, se muestra una ilustración de respaldo. La columna guarda la ruta/URL, no los bytes del archivo.

El panel permite crear, consultar y editar productos, categorías, usuarios, pedidos, detalles y estatus. Productos y usuarios se desactivan para preservar referencias; los pedidos se conservan como historial. Crear/editar detalles de un pedido actualiza existencias y total en una transacción. Las contraseñas nunca se devuelven en las respuestas del panel y se guardan como hashes.

El catálogo y el panel se conectan a MySQL mediante el binding `HYPERDRIVE` de Cloudflare. Las credenciales de la base se configuran en Hyperdrive, no en variables `MYSQL_*` del Worker. El script local `npm run db:setup-admins` sí usa `MYSQL_*` de `.env.local` para conectarse directamente desde tu equipo. La bolsa y favoritos del catálogo público siguen siendo interacciones de demostración.

## Comandos

- `npm run dev`: inicia el servidor de desarrollo.
- `npm run lint`: ejecuta ESLint.
- `npm run build`: genera la aplicación para producción.
- `npm run cf:build`: genera el Worker con OpenNext.
- `npm run cf:deploy`: genera el Worker y lo despliega con Wrangler.
