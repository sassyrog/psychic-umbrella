# Base stage for shared configuration
FROM node:22-alpine AS base
WORKDIR /app

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy only package management files initially
COPY package.json pnpm-lock.yaml* ./

# Development stage
FROM base AS development
RUN pnpm install
COPY . .


# Build stage
FROM development AS build
RUN pnpm run build

# Test stage
FROM development AS test
CMD ["pnpm", "run", "test"]

# Production dependencies stage
FROM base AS production-deps
RUN pnpm install --prod --frozen-lockfile

# Production stage
FROM node:22-alpine AS production
WORKDIR /app

# Install pnpm for production
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependencies and build artifacts
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

# Set node environment and expose port
ENV NODE_ENV=production
EXPOSE 3000

# Start application
CMD ["node", "dist/main"]