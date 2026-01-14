# Step 1: Build React app
# FROM node:20-alpine AS Build
FROM node:20-alpine AS build

# WORKDIR /app
WORKDIR /build
# WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Step 2: Serve with Nginx
FROM nginx:stable

RUN rm -rf /usr/share/nginx/html/*

# COPY --from=build /build/dist /usr/share/nginx/html
# COPY --from=build /dist /usr/share/nginx/html
COPY --from=build /build/dist /usr/share/nginx/html

# Expose Nginx port
# EXPOSE 5173
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
