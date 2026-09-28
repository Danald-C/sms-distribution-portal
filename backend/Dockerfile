# Use official Node image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY . .

# The application uses Railway's PORT in production.
# 4000 remains the local/default fallback.
EXPOSE 4000

CMD ["npm", "start"]