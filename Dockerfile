# Multi-stage Dockerfile for 1inch Unite Cross-Chain Bridge
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    curl \
    git \
    python3 \
    make \
    g++ \
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && source ~/.bashrc \
    && rustup target add wasm32-unknown-unknown

# Set environment variables
ENV PATH="/root/.cargo/bin:${PATH}"
ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY demo/package*.json ./demo/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm install --production=false
RUN cd demo && npm install --production=false
RUN cd shared && npm install --production=false

# Build stage for contracts and shared utilities
FROM base AS build

# Copy source code
COPY . .

# Build shared utilities
WORKDIR /app/shared
RUN npm run build

# Build demo UI
WORKDIR /app/demo
RUN npm run build

# Install Foundry for Ethereum contracts
WORKDIR /app
RUN curl -L https://foundry.paradigm.xyz | bash
ENV PATH="/root/.foundry/bin:${PATH}"
RUN foundryup

# Build Ethereum contracts
WORKDIR /app/ethereum
RUN forge build

# Build Near contracts
WORKDIR /app/near/contracts
RUN cargo build --target wasm32-unknown-unknown --release

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache curl

WORKDIR /app

# Copy built applications
COPY --from=build /app/demo/.next ./demo/.next
COPY --from=build /app/demo/public ./demo/public
COPY --from=build /app/demo/package.json ./demo/
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/shared/package.json ./shared/
COPY --from=build /app/ethereum/out ./ethereum/out
COPY --from=build /app/near/contracts/target ./near/contracts/target

# Copy deployment scripts
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/.env.example ./.env.example

# Install production dependencies
COPY --from=build /app/demo/node_modules ./demo/node_modules
COPY --from=build /app/shared/node_modules ./shared/node_modules

# Create startup script
RUN cat > /app/start.sh << 'EOF'
#!/bin/sh
echo "🚀 Starting 1inch Unite Cross-Chain Bridge..."

# Start demo UI
cd /app/demo
echo "📱 Starting demo UI on port 3000..."
npm start &

# Keep container running
wait
EOF

RUN chmod +x /app/start.sh

EXPOSE 3000

CMD ["/app/start.sh"]