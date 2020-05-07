# Testing the Backend API manually

The backend API provides two ways to authenticate. The usual method is through GitHub where the
authentication is entirely handled by GitHub and the backend just sees an OAUTH access token that is
valid for the current session. However, this is hard to automate and thus can't be used in tests.

The other method uses basic authentication with the GitHub username and personal access token.

This document describes the necessary backend API calls for authenticating either way. This
information is useful when implementing a client, but also when manually testing the backend
API through the [Swagger UI](http://localhost:3000/api) or Postman.

## GitHub OAUTH authentication

1. the client calls `GET /api/auth/login`. This returns a GitHub URL that allows the user to log in
   and give the backend access to his repo.
2. GitHub redirects to http://localhost:3000/index.html with a `code` and a `state` variable.
3. The client calls `POST /api/auth/login` with the provided `code` and `state`. The backend
   retrieves and returns the OAUTH token from GitHub and sets the username in a session variable.
4. The client uses this access token whenever it calls the backend API.

**NOTE:** Currently the GitHub authentication doesn't work in Swagger UI/Postman. There's probably
some information missing in our OpenAPI spec.

## Basic authentication

1. The client creates an authentication token by base64-encoding `Basic username:password` where
   `username` is the GitHub username and `password` a GitHub personal access token.
2. The client uses this access token whenever it calls the backend API.
3. The client calls `GET /api/authuser/test/{username}` (where `username` is the GitHub username).
   The backend sets the username in a session variable.

**NOTE:** It is currently still possible to provide the GitHub username and password. However, this
is deprecated by GitHub and will stop working in the near future. It is therefore advisable to create
a personal access token on the GitHub settings page and use that instead of the password.
