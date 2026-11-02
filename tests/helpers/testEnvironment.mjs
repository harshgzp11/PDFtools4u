import os from 'os';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

// Dedicated external root directory outside OneDrive
export const GLOBAL_TEMP_ROOT = path.join(os.tmpdir(), 'pdftools4u-temp');

if (!fs.existsSync(GLOBAL_TEMP_ROOT)) {
  fs.mkdirSync(GLOBAL_TEMP_ROOT, { recursive: true });
}

// Active tracking set for managed temporary paths
const activeDirs = new Set();

/**
 * Creates and registers a dedicated temporary artifacts directory for a test suite.
 * Located strictly in the OS temp directory, outside OneDrive.
 */
export function getTestArtifactsDir(suiteName = 'test') {
  const safeSuiteName = suiteName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueId = `${Date.now()}_${process.pid}_${Math.random().toString(36).slice(2, 6)}`;
  const dirPath = path.join(GLOBAL_TEMP_ROOT, 'suites', `${safeSuiteName}_${uniqueId}`);
  fs.mkdirSync(dirPath, { recursive: true });
  activeDirs.add(dirPath);
  return dirPath;
}

/**
 * Creates and registers a dedicated Chrome browser profile directory.
 * Located strictly in the OS temp directory, outside OneDrive.
 */
export function getManagedBrowserProfileDir(profileName = 'qa-chrome') {
  const safeProfileName = profileName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueId = `${Date.now()}_${process.pid}_${Math.random().toString(36).slice(2, 6)}`;
  const dirPath = path.join(GLOBAL_TEMP_ROOT, 'profiles', `${safeProfileName}_${uniqueId}`);
  fs.mkdirSync(dirPath, { recursive: true });
  activeDirs.add(dirPath);
  return dirPath;
}

/**
 * Resolves the path to an intentional benchmark fixture in scratch/bench.
 * Validates that the fixture exists without modifying it.
 */
export function getBenchmarkFixturePath(projectRoot, filename) {
  const fixturePath = path.resolve(projectRoot, 'scratch', 'bench', filename);
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Intentional benchmark fixture not found: ${fixturePath}`);
  }
  return fixturePath;
}

/**
 * Helper to recursively clear read-only attributes on Windows before deletion.
 * Uses lstatSync to ensure symbolic links and directory junctions are never traversed.
 */
function clearReadOnlySync(targetPath) {
  try {
    if (!fs.existsSync(targetPath)) return;
    const stat = fs.lstatSync(targetPath);
    if (stat.isSymbolicLink()) {
      return; // Never traverse symbolic links or Windows junctions
    }
    if (stat.isDirectory()) {
      const items = fs.readdirSync(targetPath);
      for (const item of items) {
        clearReadOnlySync(path.join(targetPath, item));
      }
    }
    fs.chmodSync(targetPath, 0o666);
  } catch (_) {}
}

/**
 * Synchronous sleep without external dependencies.
 */
function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* busy wait */ }
}

/**
 * Helper to check whether a process with the given PID is actively alive.
 */
function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Strict path containment validation using path.relative().
 * Only permits deletion of strict descendants of GLOBAL_TEMP_ROOT.
 * Rejects GLOBAL_TEMP_ROOT itself, os.tmpdir(), siblings, parents, traversals, and non-descendants.
 */
export function isStrictDescendantOfTempRoot(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') {
    return false;
  }
  const root = path.resolve(GLOBAL_TEMP_ROOT);
  const target = path.resolve(targetPath);

  // Reject if normalized paths are identical (never delete GLOBAL_TEMP_ROOT itself)
  if (root.toLowerCase() === target.toLowerCase()) {
    return false;
  }

  const rel = path.relative(root, target);

  // Reject if rel is empty, current dir, starts with '..' (parent/sibling/ancestor), or is an absolute path (different drive)
  if (!rel || rel === '.' || rel.startsWith('..') || path.isAbsolute(rel)) {
    return false;
  }

  return true;
}

/**
 * Robust synchronous directory cleanup with Windows lock-release retry logic.
 */
export function cleanupDirSync(dirPath, maxRetries = 6, retryDelayMs = 250) {
  if (!dirPath || typeof dirPath !== 'string') return true;

  // Strict containment validation before ANY filesystem modification
  if (!isStrictDescendantOfTempRoot(dirPath)) {
    console.warn(`[testEnvironment] Security Warning: Rejected deletion of path outside strict temporary root boundary: ${dirPath}`);
    return false;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!fs.existsSync(dirPath)) {
        activeDirs.delete(dirPath);
        return true;
      }
      clearReadOnlySync(dirPath);
      fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      if (!fs.existsSync(dirPath)) {
        activeDirs.delete(dirPath);
        return true;
      }
    } catch (e) {
      if (attempt === maxRetries) {
        // As a last resort on Windows, attempt taskkill if files are held, then rmSync once more
        try {
          clearReadOnlySync(dirPath);
          fs.rmSync(dirPath, { recursive: true, force: true });
          if (!fs.existsSync(dirPath)) {
            activeDirs.delete(dirPath);
            return true;
          }
        } catch (_) {}
        console.warn(`[testEnvironment] Warning: Could not purge directory on attempt ${attempt}: ${dirPath} (${e.message})`);
        return false;
      }
      sleepSync(retryDelayMs);
    }
  }
  return false;
}

/**
 * Default force-termination strategy:
 * On Windows, terminates the process tree using taskkill /t /f.
 * On POSIX, sends SIGKILL.
 */
export function defaultForceKill(pid, proc) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /t /f`, { stdio: 'ignore' });
    } else if (proc && typeof proc.kill === 'function') {
      proc.kill('SIGKILL');
    }
  } catch (_) {}
}

/**
 * Reliable Chrome process termination:
 * 1. Closes WebSocket connection
 * 2. Attempts graceful SIGTERM
 * 3. Waits for process termination
 * 4. Forces termination if process remains alive (using injectable forceKill strategy)
 * 5. Verifies termination
 */
export async function shutdownChromeProcess(
  proc,
  ws = null,
  timeoutMsOrOpts = 2500,
  checkAliveArg = isPidAlive,
  forceKillArg = defaultForceKill
) {
  if (ws) {
    try {
      ws.close();
    } catch (_) {}
  }

  if (!proc) {
    return true;
  }

  // Parse arguments: support either positional parameters or options object
  let timeoutMs = 2500;
  let checkAlive = isPidAlive;
  let forceKill = defaultForceKill;

  if (typeof timeoutMsOrOpts === 'object' && timeoutMsOrOpts !== null) {
    timeoutMs = timeoutMsOrOpts.timeoutMs ?? 2500;
    checkAlive = timeoutMsOrOpts.checkAlive ?? isPidAlive;
    forceKill = timeoutMsOrOpts.forceKill ?? defaultForceKill;
  } else {
    timeoutMs = typeof timeoutMsOrOpts === 'number' ? timeoutMsOrOpts : 2500;
    checkAlive = typeof checkAliveArg === 'function' ? checkAliveArg : isPidAlive;
    forceKill = typeof forceKillArg === 'function' ? forceKillArg : defaultForceKill;
  }

  const pid = proc.pid;
  if (!checkAlive(pid)) {
    return true;
  }

  // Step 1: Attempt graceful shutdown
  try {
    proc.kill('SIGTERM');
  } catch (_) {}

  // Step 2: Wait for process exit up to timeout
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (!checkAlive(pid)) {
      return true;
    }
    await new Promise(r => setTimeout(r, 100));
  }

  // Step 3: Force termination if still alive (using injectable forceKill strategy)
  if (pid && checkAlive(pid)) {
    try {
      forceKill(pid, proc);
    } catch (_) {}
  }

  // Step 4: Verification wait (bounded up to 1500ms)
  const verifyStart = Date.now();
  while (Date.now() - verifyStart < 1500) {
    if (!checkAlive(pid)) {
      return true;
    }
    await new Promise(r => setTimeout(r, 100));
  }

  // Step 5: Final confirmation
  if (checkAlive(pid)) {
    console.error(`[testEnvironment] Chrome shutdown failure: Process PID ${pid} is still alive after force termination.`);
    return false;
  }

  // Allow Windows to release file handles
  await new Promise(r => setTimeout(r, 200));
  return true;
}

/**
 * Combined browser shutdown and profile cleanup helper:
 * 1. Shuts down Chrome process
 * 2. Removes the associated browser profile only after confirming termination
 * 3. Verifies cleanup
 */
export async function shutdownAndCleanupProfile(
  proc,
  profileDir,
  ws = null,
  checkAliveOrOpts = isPidAlive,
  forceKillArg = defaultForceKill
) {
  let checkAlive = isPidAlive;
  let forceKill = defaultForceKill;

  if (typeof checkAliveOrOpts === 'object' && checkAliveOrOpts !== null) {
    checkAlive = checkAliveOrOpts.checkAlive ?? isPidAlive;
    forceKill = checkAliveOrOpts.forceKill ?? defaultForceKill;
  } else {
    checkAlive = typeof checkAliveOrOpts === 'function' ? checkAliveOrOpts : isPidAlive;
    forceKill = typeof forceKillArg === 'function' ? forceKillArg : defaultForceKill;
  }

  const isTerminated = await shutdownChromeProcess(proc, ws, { timeoutMs: 2500, checkAlive, forceKill });
  if (!isTerminated) {
    console.error(`[testEnvironment] Aborting profile directory removal: Chrome process PID ${proc?.pid} is still running. Profile retained: ${profileDir}`);
    return false;
  }

  if (profileDir) {
    return cleanupDirSync(profileDir);
  }
  return true;
}

/**
 * Ensures a Vite development server is accessible on the target port.
 * If already running, reuses it without stopping.
 * If spawned, provides a clean stop() function.
 */
export async function ensureDevServer(port = 5173, projectRoot = process.cwd()) {
  let isRunning = false;
  try {
    const res = await fetch(`http://localhost:${port}/`);
    isRunning = res.ok;
  } catch (_) {
    isRunning = false;
  }

  if (isRunning) {
    return { proc: null, stop: () => {} };
  }

  console.log(`Starting Vite dev server on port ${port}...`);
  const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const proc = (await import('child_process')).spawn(cmd, ['vite', '--port', String(port), '--strictPort'], {
    cwd: projectRoot,
    shell: true,
    stdio: 'ignore'
  });

  const start = Date.now();
  let ready = false;
  while (Date.now() - start < 15000) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      if (res.ok) {
        ready = true;
        break;
      }
    } catch (_) {}
    await new Promise(r => setTimeout(r, 300));
  }

  if (!ready) {
    try {
      if (process.platform === 'win32' && proc.pid) {
        execSync(`taskkill /pid ${proc.pid} /t /f`, { stdio: 'ignore' });
      } else {
        proc.kill();
      }
    } catch (_) {}
    throw new Error(`Vite dev server failed to become responsive on port ${port} within 15s`);
  }

  return {
    proc,
    stop: () => {
      if (proc && !proc.killed) {
        try {
          if (process.platform === 'win32' && proc.pid) {
            execSync(`taskkill /pid ${proc.pid} /t /f`, { stdio: 'ignore' });
          } else {
            proc.kill();
          }
        } catch (_) {}
      }
    }
  };
}

/**
 * Fallback safety hook: clean all remaining tracked active directories on process exit.
 */
function emergencyCleanup() {
  for (const dir of Array.from(activeDirs)) {
    try {
      if (isStrictDescendantOfTempRoot(dir) && fs.existsSync(dir)) {
        clearReadOnlySync(dir);
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (_) {}
  }
  activeDirs.clear();
}

process.on('exit', emergencyCleanup);
process.on('SIGINT', () => { emergencyCleanup(); process.exit(130); });
process.on('SIGTERM', () => { emergencyCleanup(); process.exit(143); });

