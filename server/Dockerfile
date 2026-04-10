FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy all server files
COPY . .

# Expose port
EXPOSE 5000

# Start command
CMD ["npm", "start"]
