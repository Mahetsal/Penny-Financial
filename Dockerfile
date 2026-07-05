# Build and Run Stage
FROM node:20-alpine

# Install build dependencies for sqlite3 compile if needed (alpine requires python and build tools)
RUN apk add --no-progress --no-cache make gcc g++ python3

# Set working directory
WORKDIR /app

# Copy root dependencies files
COPY package*.json ./

# Install root dependencies
RUN npm ci

# Copy frontend dependencies files
COPY frontend/package*.json ./frontend/

# Install frontend dependencies
RUN cd frontend && npm ci

# Copy all files
COPY . .

# Build frontend production bundle
RUN cd frontend && npm run build

# Prune build dependencies and non-production modules if needed
# (We keep sqlite3 compile)

# Expose backend production port
EXPOSE 5000

# Set environment
ENV NODE_ENV=production

# Start command
CMD ["npm", "run", "server"]
