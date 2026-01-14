# Use official Node image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
# RUN npm install --production
# RUN npm ci --omit=dev
RUN npm install

# Copy all backend source code
# COPY . .
# Copy only necessary source
COPY src ./src

# Expose your backend port (change if your app uses something else)
EXPOSE 4000

# Health check (optional but recommended)
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:4000/health || exit 1

# Start your app
CMD ["npm", "start"]
# CMD ["npm", "run", "devStart"]

