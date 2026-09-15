FROM node:22-alpine AS frontend-build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY requirements-lock.txt ./
RUN python -m pip install --no-cache-dir --require-hashes -r requirements-lock.txt
COPY backend ./backend
COPY --from=frontend-build /app/dist ./dist

RUN addgroup --system app && adduser --system --ingroup app app \
    && chown -R app:app /app
USER app

EXPOSE 8000
CMD ["sh", "-c", "exec python -m uvicorn backend.api:app --host 0.0.0.0 --port ${PORT:-8000}"]
