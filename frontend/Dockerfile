# Step 1: Build React app
# FROM node:20-alpine AS Build
# FROM node:20-alpine AS build
FROM node:20 AS build

# WORKDIR /app
# WORKDIR /build
WORKDIR /app

ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

COPY package*.json ./

# RUN npm install
# RUN npm install --fetch-timeout=300000 --verbose
RUN npm ci --verbose
# RUN npm config set fetch-retries 5 \
#  && npm config set fetch-retry-mintimeout 20000 \
#  && npm config set fetch-retry-maxtimeout 120000 \
#  && npm install

COPY . .
RUN npm run build

# Step 2: Serve with Nginx
FROM nginx:stable

RUN rm -rf /usr/share/nginx/html/*

# COPY --from=build /build/dist /usr/share/nginx/html
COPY --from=build app/dist /usr/share/nginx/html
# COPY --from=build /build /usr/share/nginx/html

# Expose Nginx port
# EXPOSE 5173
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
