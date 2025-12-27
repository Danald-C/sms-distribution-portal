# Step 1: Build React app
FROM node:18 AS builder
WORKDIR /build/dist
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Serve with Nginx
FROM nginx:stable-alpine
COPY --from=build /build/dist /usr/share/nginx/html

# Expose Nginx port
EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]

