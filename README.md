# Keyman Developer Online

## Description

A server that makes the task of contributing new keyboards to https://keyman.com/ easier without requiring
an initial download of 1 GB of data.

The backend is implemented with [nest](https://nestjs.com/), the included frontend with
[angular](https://angular.io/).

## Installation

Install `node` version 10.15.3 and `npm` version 6.9.0. Then run the following commands:

```bash
# Install nestjs and angular
$ npm i -g @nestjs/cli @angular/cli

# Install dependencies for backend
$ npm i

# Install dependencies for frontend
$ cd frontend
$ npm i
```

## Preparation

Before you'll be able to run the app, you'll have to create a `development.env` or `production.env`
file. You can take the existing `test.env` file as template.

You'll also have to create an [OAuth App on GitHub](https://github.com/settings/developers).
Use `http://localhost:3000` as _Homepage URL_ and _Authorization callback URL_.

In the `*.env` file replace the values for `CLIENT_ID` and `CLIENT_SECRET` with the _Client ID_ and
_Client Secret_ that GitHub displays for the app. You should also replace the value for
`SESSION_SECRET` with a random value.

## Development

```bash
# Build backend
$ npm run build

# Build backend (watching for changes)
$ npm run build:watch

# Build frontend
$ cd frontend
$ npm run build

# Build frontend (watching for changes)
$ cd frontend
$ npm run build:watch
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
$ cd frontend
$ npm run test

# e2e tests (frontend)
$ cd frontend
$ npm run test:e2e
```

## Running the app

**Note:** you'll have to build the frontend first!

```bash
# development (http://localhost:3000)
$ npm run start

# watch mode
$ npm run start:watch:dev

# production mode
$ npm run start:prod
```

## License

Keyman Developer Online is [MIT licensed](LICENSE).
