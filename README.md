# Todo Backend

## Run with Docker Desktop

The API container connects to a PostgreSQL database using `DATABASE_URL`. The database is not included in Docker Compose; configure a hosted PostgreSQL database such as Neon.

1. Install and start Docker Desktop.
2. In this directory, create `.env` from the template if you do not already have one:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Edit `.env` and set `DATABASE_URL` to your application's database connection string. Set `DATABASE_URL_UNPOOLED` to a direct, unpooled connection string as well if you need to run migrations. Keep these credentials private.
4. Build and start the API:

   ```powershell
   docker compose up --build -d
   ```

5. If the database schema has not been created, run the migration:

   ```powershell
   docker compose run --rm api node dist/migrate.js
   ```

6. The API is available at `http://localhost:8698`. For example, open `http://localhost:8698/todos`.

View container logs with `docker compose logs -f api`, and stop the container with `docker compose down`.
