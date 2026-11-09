FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim

WORKDIR /app

COPY --from=build /app /app

ENV NODE_ENV=production
EXPOSE 3000

# State is mounted here at run time. The image does not contain the database.
VOLUME ["/app/data"]

CMD ["npm", "start"]
