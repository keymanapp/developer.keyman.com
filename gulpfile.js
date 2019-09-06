const { series, parallel } = require('gulp');
const exec = require('child_process').exec;
const run = require('gulp-run-command').default;

function runCommand(cb, cmd) {
  exec(cmd, function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
}

function runCommand2(done, cmd, workDir) {
  run(cmd, {
    cwd: workDir
  })().then(done);
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
  runCommand2(cb, 'npm run test:e2e', 'frontend');
}

function installBackend(cb) {
  runCommand(cb, 'npm install');
}

function preInstallBackend(cb) {
  runCommand(cb, 'npm install gulp-run-command')
}

function installFrontend(cb) {
  runCommand2(cb, 'npm install', 'frontend');
}

function installFrontendWebdriver(cb) {
  runCommand2(cb, 'npm install webdriver-manager@latest', 'frontend/node_modules/protractor');
}

function updateFrontendWebdriver(cb) {
  runCommand2(cb, 'node_modules/.bin/webdriver-manager update', 'frontend/node_modules/protractor');
}

function installBackendCi(cb) {
  runCommand(cb, 'npm ci');
}

function installFrontendCi(cb) {
  runCommand2(cb, 'npm ci', 'frontend');
}

function deployBackend(cb) {
  runCommand(cb, 'npm run prestart:prod')
}

function deployFrontend(cb) {
  runCommand2(cb, 'npm run build:prod', 'frontend')
}

exports.default = series(
  parallel(installBackend,
    series(installFrontend, installFrontendWebdriver, updateFrontendWebdriver)),
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
  preInstallBackend,
  parallel(installBackendCi,
    series(installFrontendCi, installFrontendWebdriver, updateFrontendWebdriver)),
  parallel(lintBackend, lintFrontend))
exports.citest = series(
  parallel(testBackend, testFrontend),
  parallel(e2eBackend, e2eFrontend))
exports.deploy = series(deployFrontend, deployBackend)
