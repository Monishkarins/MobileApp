#!/usr/bin/env node

/**
 * Runs `react-native run-android` with Windows-safe Gradle settings.
 * Short GRADLE_USER_HOME avoids MAX_PATH failures during native CMake/ninja builds.
 */

const {spawnSync} = require('node:child_process');
const fs = require('node:fs');

const env = {...process.env};

if (process.platform === 'win32') {
  const gradleHome = env.GRADLE_USER_HOME || 'C:\\gradle';
  env.GRADLE_USER_HOME = gradleHome;
  fs.mkdirSync(gradleHome, {recursive: true});
}

const cliArgs = ['react-native', 'run-android', '--active-arch-only', ...process.argv.slice(2)];
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const result = spawnSync(command, cliArgs, {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
