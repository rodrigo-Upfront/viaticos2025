# Multi-stage Dockerfile for full-stack deployment
# This Dockerfile is for demonstration - individual services use their own Dockerfiles

FROM node:18-alpine as frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim as backend
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./

# This is a placeholder - use individual service Dockerfiles for actual deployment
FROM nginx:alpine
COPY --from=frontend-build /app/frontend/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
