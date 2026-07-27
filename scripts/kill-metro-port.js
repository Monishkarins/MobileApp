#!/usr/bin/env node

const {execSync} = require('node:child_process');

const port = process.env.RCT_METRO_PORT || '8081';

try {
  if (process.platform === 'win32') {
    const output = execSync(`netstat -ano | findstr :${port}`, {encoding: 'utf8'}).trim();
    const pids = [...new Set(output.split(/\r?\n/).map(line => line.trim().split(/\s+/).pop()).filter(Boolean))];
    for (const pid of pids) execSync(`taskkill /PID ${pid} /F`, {stdio: 'ignore'});
  } else {
    execSync(`lsof -ti tcp:${port} | xargs -r kill -9`, {stdio: 'ignore', shell: '/bin/sh'});
  }
} catch {
  // No process is using the Metro port.
}
