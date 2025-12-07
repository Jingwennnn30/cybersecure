FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all backend files including serviceAccountKey.json
COPY . .

# Expose the port
EXPOSE 4000

# Start the server
CMD ["node", "server.js"]
