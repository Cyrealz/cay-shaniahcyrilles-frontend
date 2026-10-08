# Stockroom frontend

Vue 3 inventory interface for the LavaLust API. It supports sign-in, viewing and filtering products, and admin-only product create, edit, and delete actions.

## Local development

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to the backend API base URL, for example `http://localhost:8000/api/v1`.
3. Install dependencies and start Vite:

   ```powershell
   npm install
   npm run dev
   ```

4. From the backend directory, create the database tables with `php console/cli.php migration run`.

The frontend does not include user registration. Create accounts using the backend API or database. New registrations must have passwords at least 8 characters long.

## API routes used by the frontend

The API base is `/api/v1`. Authenticated requests use `Authorization: Bearer <access_token>`.

| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/health` | Public |
| `POST` | `/auth/login` | Public, JSON `email` and `password` |
| `POST` | `/auth/register` | Public, JSON `username`, `email`, `password` |
| `POST` | `/auth/refresh` | Public, JSON `refresh_token` |
| `POST` | `/auth/logout` | Signed-in user, JSON `refresh_token` |
| `GET` | `/me` | Signed-in user |
| `GET` | `/products` | Signed-in user |
| `POST` | `/products/create` | Admin, product fields |
| `PUT` | `/products/{id}` | Admin, product fields |
| `DELETE` | `/products/{id}/delete` | Admin |

Product fields are `product_name`, `description`, `price`, and `quantity`. Registration always creates a regular user; only an administrator can create products or assign account roles.

## Deploy the backend to Render

Create a Render **Web Service** from the backend repository and select **Docker**. The included Dockerfile configures Apache to listen on Render's `PORT`. Set the health check path to `/api/v1/health`.

LavaLust needs a MySQL-compatible database. Render does not provide a managed MySQL service, so use an external managed MySQL provider and allow the Render service to connect to it.

Set these environment variables in the Render service:

| Variable | Value |
| --- | --- |
| `APP_ENV` | `production` |
| `APP_KEY` | A fresh random secret, at least 32 characters |
| `APP_TIMEZONE` | `Asia/Manila` |
| `DB_DRIVER` | `mysql` |
| `DB_HOST` | Hostname supplied by your MySQL provider |
| `DB_PORT` | Port supplied by your MySQL provider, usually `3306` |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name |
| `DB_CHARSET` | `utf8mb4` |
| `DB_PREFIX` | Leave empty unless your tables use a prefix |
| `JWT_SECRET` | A random secret of at least 32 characters |
| `REFRESH_TOKEN_KEY` | A different random secret of at least 32 characters |
| `CORS_ALLOWED_ORIGIN` | The exact deployed Vercel origin, including `https://` and no trailing slash |

Generate independent secrets locally with PHP:

```powershell
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
```

Run migrations once after setting the database variables, using the Render shell:

```sh
php console/cli.php migration status
php console/cli.php migration run
```

Do not add real secret values to source control. Configure them only in Render's environment settings.

## Deploy the frontend to Vercel

Import the frontend directory as its own Vercel project:

```text
C:\Users\Jayoffe\Documents\for shan\cay-shaniahcyrilles-frontend
```

Vercel detects Vite automatically. Use `npm run build` as the build command and `dist` as the output directory. Add this Vercel environment variable for Production, Preview, and Development as needed:

| Variable | Value |
| --- | --- |
| `VITE_API_BASE_URL` | `https://<your-render-service>.onrender.com/api/v1` |

Redeploy the frontend after changing its environment variables. Set `CORS_ALLOWED_ORIGIN` on Render to the frontend's exact production origin. If the frontend uses a custom domain, use that origin instead and redeploy the backend after changing CORS configuration.
