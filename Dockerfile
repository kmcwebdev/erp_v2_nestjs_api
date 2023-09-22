# Base image with shared setup
FROM node:18-alpine as base

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
ARG DATABASE_URL

# Copy source code into app folder
COPY . .
# Install dependencies
RUN npm ci
RUN npm run kysely-codegen

#
# 🏡 Production Build
#
FROM base as build
ENV NODE_ENV production
ARG DATABASE_URL

# Copy only the necessary files
COPY --from=dev /app/node_modules ./node_modules
COPY . .
# Corrected build script command
RUN npm run build
# Prune development dependencies to leave only production ones
RUN npm prune --production

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
