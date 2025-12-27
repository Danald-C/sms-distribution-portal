# Step 1: Build React app
FROM node:20-alpine AS build
# WORKDIR /build/dist
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Serve with Nginx
FROM nginx:stable-alpine
RUN rm -rf /usr/share/nginx/html/*
# COPY --from=build /build/dist /usr/share/nginx/html
COPY --from=build /app/dist /usr/share/nginx/html

# Expose Nginx port
# EXPOSE 5173
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]




# ---------- Build stage ----------
# FROM node:20-alpine AS builder

# WORKDIR /app

# COPY package*.json ./
# RUN npm install

# COPY . .
# RUN npm run build


# ---------- Production stage ----------
# FROM nginx:alpine

# Remove default nginx static files
# RUN rm -rf /usr/share/nginx/html/*

# Copy build output
# COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config if you have one (optional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# EXPOSE 80

# CMD ["nginx", "-g", "daemon off;"]


