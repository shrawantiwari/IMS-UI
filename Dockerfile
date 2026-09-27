# ================================
# Stage 1: Build Angular Application
# ================================

FROM node:26-alpine AS build

WORKDIR /app

# Copy dependency files first
COPY package.json package-lock.json ./

# Install exact dependencies
RUN npm ci

# Copy application source
COPY . .

# Build Angular application
RUN npm run build


# ================================
# Stage 2: Serve Angular Application
# ================================

FROM nginx:alpine

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy Angular build output
COPY --from=build /app/dist/inventory-management-system/browser /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]