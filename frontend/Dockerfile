# syntax=docker/dockerfile:1
FROM node:20-alpine AS build

# API base URL baked into the bundle at build time.
# Override with: docker build --build-arg VITE_API_BASE_URL=https://api.example.com .
ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Create work directory
WORKDIR /app

# Copy and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy packages
COPY . ./

# Build static assets
RUN npm run build

# Run stage
FROM nginx:1.27-alpine

# Serve the built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Replace the default nginx config with our static + SPA fallback config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80
