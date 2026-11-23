FROM python:3.12-slim

WORKDIR /app

# psycopg2-binary needs libpq at runtime; build-essential is only needed
# transiently for the few wheels without a manylinux build for this arch.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/storage
ENV STORAGE_ROOT=/app/storage
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Run migrations, guarantee the bootstrap admin exists (no-op once it does),
# then start the API — one process, no --reload, sized for a small
# single-instance deploy (see docs on scaling workers with WEB_CONCURRENCY).
CMD alembic upgrade head && python -m scripts.ensure_admin && uvicorn app.main:app --host 0.0.0.0 --port 8000
