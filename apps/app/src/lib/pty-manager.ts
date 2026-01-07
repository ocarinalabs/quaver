import type { Sandbox } from "@daytonaio/sdk";

type PtySession = {
  handle: ReturnType<Sandbox["process"]["createPty"]> extends Promise<infer T>
    ? T
    : never;
  responseBuffer: string;
  resolveResponse: ((value: string) => void) | null;
};

const ptySessions = new Map<string, PtySession>();

async function getOrCreateQuaverSession(
  sandbox: Sandbox,
  sandboxId: string
): Promise<PtySession> {
  const existing = ptySessions.get(sandboxId);
  if (existing) {
    return existing;
  }

  const ptyHandle = await sandbox.process.createPty({
    id: `quaver-${sandboxId}`,
    cols: 120,
    rows: 30,
    onData: (data: Uint8Array) => {
      const text = new TextDecoder().decode(data);
      const currentSession = ptySessions.get(sandboxId);
      if (!currentSession) {
        return;
      }

      currentSession.responseBuffer += text;

      if (currentSession.responseBuffer.includes("---RESPONSE_END---")) {
        const response =
          currentSession.responseBuffer.split("---RESPONSE_END---")[0] ?? "";
        currentSession.responseBuffer = "";
        currentSession.resolveResponse?.(response);
        currentSession.resolveResponse = null;
      }
    },
  });

  await ptyHandle.waitForConnection();
  await ptyHandle.sendInput("HOME=/root quaver --interactive\n");

  const session: PtySession = {
    handle: ptyHandle,
    responseBuffer: "",
    resolveResponse: null,
  };

  ptySessions.set(sandboxId, session);
  return session;
}

function sendToQuaver(sandboxId: string, message: string): Promise<string> {
  const session = ptySessions.get(sandboxId);
  if (!session) {
    throw new Error("No active quaver session");
  }

  return new Promise((resolve) => {
    session.resolveResponse = resolve;
    session.responseBuffer = "";
    session.handle.sendInput(`${message}\n`);
  });
}

async function killQuaverSession(sandboxId: string): Promise<void> {
  const session = ptySessions.get(sandboxId);
  if (session) {
    await session.handle.kill();
    ptySessions.delete(sandboxId);
  }
}

export { getOrCreateQuaverSession, killQuaverSession, sendToQuaver };
export type { PtySession };
