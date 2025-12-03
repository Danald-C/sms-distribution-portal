# Use official Node image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy all backend source code
COPY . .

# Expose your backend port (change if your app uses something else)
EXPOSE 5000

# Start your app
CMD ["npm", "start"]

