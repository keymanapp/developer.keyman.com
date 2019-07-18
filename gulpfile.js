const { series, parallel } = require('gulp');
const exec = require('child_process').exec;

function runCommand(cb, cmd) {
  exec(cmd, function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
}

function buildBackend(cb) {
  runCommand(cb, 'npm run build');
}

function buildFrontend(cb) {
  runCommand(cb, 'cd frontend && npm run build');
}

function testBackend(cb) {
  runCommand(cb, 'npm run test');
}

function testFrontend(cb) {
  runCommand(cb, 'cd frontend && npm run test');
}

function lintBackend(cb) {
  runCommand(cb, 'npm run lint');
}

function lintFrontend(cb) {
  runCommand(cb, 'cd frontend && npm run lint');
}

function e2eBackend(cb) {
  runCommand(cb, 'npm run test:e2e');
}

function e2eFrontend(cb) {
  runCommand(cb, 'cd frontend && npm run test:e2e');
}

function installBackend(cb) {
  runCommand(cb, 'npm install');
}

function installFrontend(cb) {
  runCommand(cb, 'cd frontend && npm install');
}

function installBackendCi(cb) {
  runCommand(cb, 'npm ci');
}

function installFrontendCi(cb) {
  runCommand(cb, 'cd frontend && npm ci');
}

function deployBackend(cb) {
  runCommand(cb, 'npm run prestart:prod')
}

function deployFrontend(cb) {
  runCommand(cb, 'cd frontend && npm run build')
}

exports.default = series(
  parallel(installBackend, installFrontend),
  parallel(lintBackend, lintFrontend),
  parallel(testBackend, testFrontend),
  parallel(e2eBackend, e2eFrontend))
exports.build = series(buildBackend, buildFrontend)
exports.test = series(testBackend, testFrontend)
exports.lint = series(lintBackend, lintFrontend)
exports.e2e = series(e2eBackend, e2eFrontend)
exports.install = series(installBackend, installFrontend)
exports.installCi = series(installBackendCi, installFrontendCi)
exports.cibuild = series(
  parallel(installBackendCi, installFrontendCi),
  parallel(lintBackend, lintFrontend))
exports.citest = series(
  parallel(testBackend, testFrontend),
  parallel(e2eBackend, e2eFrontend))
exports.deploy = series(deployFrontend, deployBackend)
