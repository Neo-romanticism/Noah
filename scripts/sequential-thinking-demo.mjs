import { spawn } from 'node:child_process';

// Minimal MCP host over stdio to demonstrate the sequential_thinking tool.
// Usage: node scripts/sequential-thinking-demo.mjs

function encodeEnvelope(obj) {
  const json = JSON.stringify(obj);
  return `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;
}

function createMcpStdioClient(serverCommand, serverArgs) {
  const child = spawn(serverCommand, serverArgs, {
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  let buffer = '';
  let contentLength = null;

  const pending = new Map();
  let seq = 1;

  function send(msg) {
    child.stdin.write(encodeEnvelope(msg));
  }

  function handleMessage(msg) {
    // Responses come back with id; ignore notifications for this demo.
    if (msg && typeof msg === 'object' && 'id' in msg && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      else resolve(msg);
    }
  }

  function parseIncoming() {
    while (true) {
      if (contentLength === null) {
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) return;
        const header = buffer.slice(0, headerEnd);
        buffer = buffer.slice(headerEnd + 4);
        const m = header.match(/Content-Length:\s*(\d+)/i);
        if (!m) throw new Error(`Failed to parse Content-Length header: ${header}`);
        contentLength = Number(m[1]);
      }

      if (buffer.length < contentLength) return;

      const body = buffer.slice(0, contentLength);
      buffer = buffer.slice(contentLength);
      contentLength = null;

      let msg;
      try {
        msg = JSON.parse(body);
      } catch (e) {
        throw new Error(`Failed to parse JSON body: ${e}`);
      }

      handleMessage(msg);
    }
  }

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    parseIncoming();
  });

  async function request(method, params) {
    const id = seq++;
    const msg = { jsonrpc: '2.0', id, method, params };

    const p = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    send(msg);
    return p;
  }

  async function initialize() {
    const result = await request('initialize', {
      capabilities: {},
      clientInfo: { name: 'sequential-thinking-demo', version: '0.1.0' },
    });

    // MCP JSON-RPC: send initialized notification/request if supported.
    await request('initialized', {});
    return result;
  }

  return { child, request, initialize };
}

async function main() {
  const server = {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
  };

  const client = createMcpStdioClient(server.command, server.args);

  // Give the child a moment to start.
  await new Promise((r) => setTimeout(r, 700));

  await client.initialize();

  // List tools.
  const toolsResp = await client.request('tools/list', {});
  const tools = toolsResp?.result?.tools ?? [];
  console.log('Available tools:', tools.map((t) => t.name));

  const targetTool = tools.find((t) => t.name === 'sequential_thinking');
  if (!targetTool) {
    throw new Error(`Tool sequential_thinking not found. Got: ${tools.map((t) => t.name).join(', ')}`);
  }

  // Call the tool once.
  const callResp = await client.request('tools/call', {
    name: 'sequential_thinking',
    arguments: {
      thought: 'Plan steps to set up the sequential thinking MCP server and verify its tool invocation.',
      nextThoughtNeeded: true,
      thoughtNumber: 1,
      totalThoughts: 3,
    },
  });

  console.log('sequential_thinking result:', JSON.stringify(callResp?.result, null, 2));
  client.child.kill('SIGTERM');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

