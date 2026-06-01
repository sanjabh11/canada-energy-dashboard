import { spawn } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/report-strategy-source-anchors.mjs');
vi.setConfig({ testTimeout: 20_000 });

let activeServer: Server | null = null;

function listen(server: Server) {
  return new Promise<{ port: number }>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('test server did not expose a TCP address'));
        return;
      }
      resolve({ port: address.port });
    });
  });
}

function closeServer(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function runSourceAnchorReport(args: string[]) {
  return await new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

function writeFixtureFiles(tempDir: string, url: string) {
  const roadmapPath = path.join(tempDir, 'roadmap.md');
  const anchorsPath = path.join(tempDir, 'anchors.json');

  writeFileSync(roadmapPath, `# Roadmap\n\nSource: ${url}\n`);
  writeFileSync(
    anchorsPath,
    JSON.stringify({
      anchors: [
        {
          label: 'Retry fixture source',
          url,
          terms: ['Retry Fixture Term'],
        },
      ],
    }),
  );

  return { roadmapPath, anchorsPath };
}

describe('strategy source anchor report', () => {
  afterEach(async () => {
    if (activeServer) {
      const server = activeServer;
      activeServer = null;
      await closeServer(server);
    }
  });

  it('recovers a transient source fetch failure with a bounded retry', async () => {
    let requests = 0;
    activeServer = createServer((req, res) => {
      requests += 1;
      if (requests === 1) {
        req.socket.destroy();
        return;
      }

      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html><title>Retry Fixture Term</title><body>Retry Fixture Term</body></html>');
    });

    const { port } = await listen(activeServer);
    const tempDir = mkdtempSync(path.join(tmpdir(), 'ceip-source-anchors-'));
    const { roadmapPath, anchorsPath } = writeFixtureFiles(tempDir, `http://127.0.0.1:${port}/fixture`);

    try {
      const result = await runSourceAnchorReport([
        '--roadmap',
        roadmapPath,
        '--anchors-file',
        anchorsPath,
        '--manual-evidence',
        'none',
        '--fetch-retries',
        '1',
        '--retry-delay-ms',
        '0',
        '--fail-on-unverified',
      ]);

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain('- Live-verified anchors: 1');
      expect(result.stdout).toContain('- Fetch retries per anchor: 1');
      expect(result.stdout).toContain('ok_after_2_attempts');
      expect(result.stdout).toContain('fetch attempts: 2');
      expect(requests).toBe(2);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('still fails when retries do not produce verified source evidence', async () => {
    let requests = 0;
    activeServer = createServer((req) => {
      requests += 1;
      req.socket.destroy();
    });

    const { port } = await listen(activeServer);
    const tempDir = mkdtempSync(path.join(tmpdir(), 'ceip-source-anchors-'));
    const { roadmapPath, anchorsPath } = writeFixtureFiles(tempDir, `http://127.0.0.1:${port}/fixture`);

    try {
      const result = await runSourceAnchorReport([
        '--roadmap',
        roadmapPath,
        '--anchors-file',
        anchorsPath,
        '--manual-evidence',
        'none',
        '--fetch-retries',
        '1',
        '--retry-delay-ms',
        '0',
        '--fail-on-unverified',
      ]);

      expect(result.status).toBe(1);
      expect(result.stdout).toContain('- Fetch-failed anchors: 1');
      expect(result.stdout).toContain('fetch attempts: 2');
      expect(requests).toBe(2);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
