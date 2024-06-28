# Use an official Node runtime as the base image
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy the rest of the application code
COPY src/ ./src/

# Build the application
RUN npm run build

# The application's default port (adjust if needed)
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/index.js"]