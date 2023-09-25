# Base image with shared setup
FROM node:18.18.0-alpine3.17 as base

WORKDIR /app

RUN apk add --no-cache libc6-compat python3 make g++
ENV PYTHON /usr/bin/python3

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

#
# 🧑‍💻 Development
#
FROM base as dev
ENV NODE_ENV dev

# Copy source code into app folder
COPY . .

RUN npm install --location=global pnpm@latest

# Install dependencies
RUN pnpm install --frozen-lockfile

#
# 🏡 Production Build
#
FROM base as build
ENV NODE_ENV production

# Copy only the necessary files
COPY --from=dev /app/node_modules ./node_modules
COPY . .

RUN npm install --location=global pnpm@latest

# Corrected build script command
RUN pnpm run build
# Prune development dependencies to leave only production ones
RUN pnpm install --prod --frozen-lockfile

#
# 🚀 Production Server
#
FROM base as prod
ENV NODE_ENV production

# Switch to the non-root user
USER appuser

# Copy only the necessary files
COPY --from=build /app/dist dist
COPY --from=build /app/node_modules node_modules

EXPOSE 4000
CMD ["node", "dist/main.js"]
