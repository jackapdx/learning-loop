# Use official Bun image
FROM oven/bun:1.3-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Build the project
RUN bun run --cwd apps/api build
RUN bun run --cwd packages/shared build

# Production stage
FROM oven/bun:1.3-alpine AS production

WORKDIR /app

# Copy built artifacts and dependencies
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/apps/api/package.json ./apps/api/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the application with Bun for performance
CMD ["bun", "run", "apps/api/dist/index.js"]
