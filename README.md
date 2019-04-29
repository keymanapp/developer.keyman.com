# Keyman Developer Online

## Description

A server that makes the task of contributing new keyboards to https://keyman.com/ easier without requiring
an initial download of 1 GB of data.

The backend is implemented with [nest](https://nestjs.com/), the included frontend with
[angular](https://angular.io/).

## Installation

```bash
$ npm i -g @nestjs/cli
$ npm i
```

## Development

```bash
# Build backend
$ npm build

# Build backend (watching for changes)
$ npm build:watch

# Build frontend
$ npm build frontend

# Build frontend (watching for changes)
$ npm build:watch frontend
```

## Running the app

```bash
# development (http://localhost:3000)
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests (backend)
$ npm run test

# test coverage (backend)
$ npm run test:cov

# e2e tests (backend)
$ npm run test:e2e

# unit tests (frontend)
$ npm run test frontend

# e2e tests (frontend)
$ npm run test:e2e frontend
```

## License

Keyman Developer Online is [MIT licensed](LICENSE).
