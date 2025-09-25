ARG NODE_VERSION=18.0.0
FROM node:${NODE_VERSION}-alpine AS builder


WORKDIR /app

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm run build

# Stage 2: Run the app using a smaller image
FROM node:18-alpine AS runner

WORKDIR /app

# Copy only necessary files from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# If you use environment variables, you can COPY .env as well
# COPY .env ./

# Expose the app port
EXPOSE 3000

# Run the built app
CMD ["node", "dist/main"]
