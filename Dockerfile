# Dockerfile for Keyman Developer Online
# Build with: docker build -t kdo .
# Run with: docker run --env-file production.env kdo

# First stage
FROM node:lts AS base
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY package*.json ./
COPY frontend/package*.json frontend/
RUN npm ci && \
  cd frontend && \
  npm ci

# Second stage
FROM node:lts AS builder
WORKDIR /usr/src/app
COPY . .
RUN npm install -g gulp-cli gulp && \
  npm link gulp && \
  gulp installCi
ENV NODE_ENV=production
RUN gulp deploy

# Third stage
FROM node:lts
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /usr/src/app/dist dist/
COPY --from=builder /usr/src/app/frontend/dist frontend/dist/
COPY --from=base /usr/src/app/node_modules node_modules/
COPY --from=base /usr/src/app/frontend/node_modules frontend/node_modules/
RUN groupadd www && useradd --create-home --shell /bin/bash --gid www www
USER www
EXPOSE 3000
ENTRYPOINT [ "node", "dist/main.js" ]
