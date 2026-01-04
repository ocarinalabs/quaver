// Pure Bun server with native WebSocket and Terminal

type TerminalSession = {
  terminal: InstanceType<typeof Bun.Terminal>;
  proc: ReturnType<typeof Bun.spawn>;
};

const sessions = new WeakMap<object, TerminalSession>();

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Quaver Shell</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a0a; overflow: hidden; }
    #terminal { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="terminal"></div>
  <script src="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@xterm/addon-attach@0.11.0/lib/addon-attach.min.js"></script>
  <script>
    const term = new Terminal({
      theme: { background: '#0a0a0a', foreground: '#ededed', cursor: '#ededed' },
      fontFamily: 'Menlo, Monaco, monospace',
      fontSize: 14,
      cursorBlink: true,
    });

    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(document.getElementById('terminal'));
    fitAddon.fit();

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(protocol + '//' + location.host + '/ws');

    ws.onopen = () => {
      const attachAddon = new AttachAddon.AttachAddon(ws);
      term.loadAddon(attachAddon);
    };

    ws.onerror = () => term.writeln('\\r\\n\\x1b[31mConnection error\\x1b[0m');
    ws.onclose = () => term.writeln('\\r\\n\\x1b[33mConnection closed\\x1b[0m');

    window.addEventListener('resize', () => fitAddon.fit());
  </script>
</body>
</html>`;

Bun.serve({
  port: 3000,
  fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return undefined;
    }

    // Serve HTML
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  },
  websocket: {
    open(ws) {
      const terminal = new Bun.Terminal({
        cols: 120,
        rows: 30,
        data(_term, data) {
          ws.send(data);
        },
      });

      const proc = Bun.spawn(["/bin/bash"], {
        terminal,
        cwd: process.env.HOME,
        env: process.env,
      });

      sessions.set(ws, { terminal, proc });
    },
    message(ws, message) {
      const session = sessions.get(ws);
      if (session) {
        session.terminal.write(
          typeof message === "string"
            ? message
            : new TextDecoder().decode(message)
        );
      }
    },
    close(ws) {
      const session = sessions.get(ws);
      if (session) {
        session.proc.kill();
        session.terminal.close();
        sessions.delete(ws);
      }
    },
  },
});

console.log("Shell running on http://localhost:3000");
