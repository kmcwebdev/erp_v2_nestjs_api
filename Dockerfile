# Dockerfile

#
# 🧑‍💻 Development
#
FROM node:18-alpine as dev
# add the missing shared libraries from alpine base image
RUN apk add --no-cache libc6-compat
# Create app folder
WORKDIR /app

# Set to dev environment
ENV NODE_ENV dev

ARG DATABASE_URL

# Install pnpm
RUN npm install -g pnpm

# Copy source code into app folder
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

RUN pnpm run kysely-codegen

#
# 🏡 Production Build
#
FROM node:18-alpine as build

WORKDIR /app
RUN apk add --no-cache libc6-compat

# Set to production environment
ENV NODE_ENV production

# Set the database url (for kysely-codegen)
ARG DATABASE_URL

# Install pnpm
RUN npm install -g pnpm

# Copy only the necessary files
COPY --from=dev /app/node_modules ./node_modules
COPY . .

# Generate the production build. The build script runs "nest build" to compile the application.
RUN pnpm build

# Install only the production dependencies and clean cache to optimize image size.
RUN pnpm install --prod

#
# 🚀 Production Server
#
FROM node:18-alpine as prod

WORKDIR /app
RUN apk add --no-cache libc6-compat

# Set to production environment
ENV NODE_ENV production

# Copy only the necessary files
COPY --from=build /app/dist dist
COPY --from=build /app/node_modules node_modules

CMD ["node", "dist/main.js"]