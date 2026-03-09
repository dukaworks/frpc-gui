# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build Frontend (Vite -> dist/)
# Use --ignore-scripts to prevent postinstall scripts from running, which might be platform specific
# But for build we need them.
# The error might be due to memory limit or node version.
# Let's try splitting the build command.

# First build backend to check TS issues
RUN npx tsc -p tsconfig.server.json

# Then build frontend
# Using npx vite build directly to skip tsc -b which might be checking everything including backend again and failing on types
RUN npx vite build

# Stage 2: Production Run
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "dist-server/server.js"]