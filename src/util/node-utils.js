// Utility functions which are only relevant to particular Node.js constructs.

import {readdir} from 'fs/promises';
import {fileURLToPath} from 'url';
import * as path from 'path';

import _commandExists from 'command-exists';

// This package throws an error instead of returning false when the command
// doesn't exist, for some reason. Yay for making logic more difficult!
// Here's a straightforward workaround.
export function commandExists(command) {
  return _commandExists(command).then(
    () => true,
    () => false
  );
}

// Very cool function origin8ting in... http-music pro8a8ly!
// Sorry if we happen to 8e violating past-us's copyright, lmao.
export function promisifyProcess(proc, showLogging = true) {
  // Takes a process (from the child_process module) and returns a promise
  // that resolves when the process exits (or rejects, if the exit code is
  // non-zero).
  //
  // Ayy look, no alpha8etical second letter! Couldn't tell this was written
  // like three years ago 8efore I was me. 8888)

  return new Promise((resolve, reject) => {
    if (showLogging) {
      proc.stdout.pipe(process.stdout);
      proc.stderr.pipe(process.stderr);
    }

    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(code);
      }
    });
  });
}

// Handy-dandy utility function for detecting whether the passed URL is the
// running JavaScript file. This takes `import.meta.url` from ES6 modules, which
// is great 'cuz (module === require.main) doesn't work without CommonJS
// modules.
export function isMain(importMetaURL) {
  const metaPath = fileURLToPath(importMetaURL);
  const relative = path.relative(process.argv[1], metaPath);
  const isIndexJS = path.basename(metaPath) === 'index.js';
  return [
    '',
    isIndexJS && 'index.js'
  ].includes(relative);
}

// Like readdir... but it's recursive!
export function traverse(startDirPath, {
  pathStyle = 'device',
  filterFile = () => true,
  filterDir = () => true
} = {}) {
  const pathJoin = {
    'device': path.join,
    'posix': path.posix.join,
    'win32': path.win32.join,
  }[pathStyle];

  if (!pathJoin) {
    throw new Error(`Expected pathStyle to be device, posix, or win32`);
  }

  const recursive = (names, subDirPath) =>
    Promise.all(names.map(name =>
      readdir(pathJoin(startDirPath, subDirPath, name)).then(
        names =>
          (filterDir(name)
            ? recursive(names, pathJoin(subDirPath, name))
            : []),
        () =>
          (filterFile(name)
            ? [pathJoin(subDirPath, name)]
            : []))))
      .then(pathArrays => pathArrays.flat());

  return readdir(startDirPath).then(names => recursive(names, ''));
}
