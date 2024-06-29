# Build stage
FROM node:18 AS builder

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:18-slim

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy built assets from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Set NODE_ENV to production
ENV NODE_ENV production

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/app.js"]