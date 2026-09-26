# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

# Add libc6-compat for Alpine compatibility
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Placeholder values — replaced at runtime by docker-entrypoint.sh
ENV NEXT_PUBLIC_API_URL=PLACEHOLDER_NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=PLACEHOLDER_NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ENV NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=PLACEHOLDER_NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
ENV NEXT_PUBLIC_BACKEND_URL=PLACEHOLDER_NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_GRPC_URL=PLACEHOLDER_NEXT_PUBLIC_GRPC_URL
ENV NEXT_PUBLIC_DOCUMENTATION_URL=PLACEHOLDER_NEXT_PUBLIC_DOCUMENTATION_URL
ENV NEXT_PUBLIC_COMUNITY_URL=PLACEHOLDER_NEXT_PUBLIC_COMUNITY_URL
ENV NEXT_PUBLIC_TUNNEL_URL=PLACEHOLDER_NEXT_PUBLIC_TUNNEL_URL
ENV METRICS_BACKEND_URL=PLACEHOLDER_METRICS_BACKEND_URL
ENV METRICS_AUTH_URL=PLACEHOLDER_METRICS_AUTH_URL
ENV NEXT_PUBLIC_APP_VERSION=PLACEHOLDER_NEXT_PUBLIC_APP_VERSION

# Build the application
RUN npm run build

# ============================================
# Stage 3: Production Runner
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Pick up patched versions of base-image packages (e.g. openssl CVEs)
# regardless of how stale the node:20-alpine tag itself is at build time.
RUN apk upgrade --no-cache

# This runtime stage only ever runs `node server.js` (see docker-entrypoint.sh)
# — the Next.js standalone output is self-contained and never shells out to
# npm. The base image's bundled global npm/npx/corepack (and everything npm
# itself depends on — tar, glob, minimatch, cross-spawn, pacote, sigstore,
# etc.) is therefore unused dead weight that only adds CVE surface to the
# shipped image, so it's removed here.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /opt/yarn*

# Set production environment
ENV NODE_ENV=production \
 NEXT_TELEMETRY_DISABLED=1 \
 PORT=3000 \
 NEXT_PUBLIC_API_URL=http://localhost:8082/api \
 NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dblrqxs6d \
 NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ml_default \
 NEXT_PUBLIC_BACKEND_URL=http://localhost:8082 \
 NEXT_PUBLIC_GRPC_URL=localhost:8082 \
 NEXT_PUBLIC_DOCUMENTATION_URL=https://docs.webxterm.me \
 NEXT_PUBLIC_COMUNITY_URL=https://community.webxterm.me \
 NEXT_PUBLIC_TUNNEL_URL=http://localhost:8082 \
 METRICS_AUTH_URL=http://localhost:8082 \     
 METRICS_BACKEND_URL=http://localhost:8080 \
 NEXT_PUBLIC_APP_VERSION=1.2.1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set hostname
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Start the application
ENTRYPOINT ["/bin/sh", "docker-entrypoint.sh"]
