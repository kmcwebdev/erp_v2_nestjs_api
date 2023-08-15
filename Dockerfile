FROM node:18-alpine3.16 AS development

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./

RUN npm i --location=global pnpm@latest

RUN pnpm install

COPY . . 

RUN pnpm run build

FROM node:18-alpine3.16 as production

ARG NODE_ENV production

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./

RUN npm i --location=global pnpm@latest

RUN pnpm install --prod

COPY . .

COPY --from=development /usr/src/app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/src/main"]
