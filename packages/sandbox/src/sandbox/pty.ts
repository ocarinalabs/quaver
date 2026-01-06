import type { Sandbox } from "@daytonaio/sdk";

export type PtyOptions = {
  id: string;
  cols?: number;
  rows?: number;
  onData: (data: Uint8Array) => void;
};

export const createPty = async (sandbox: Sandbox, options: PtyOptions) => {
  const ptyHandle = await sandbox.process.createPty({
    id: options.id,
    cols: options.cols ?? 120,
    rows: options.rows ?? 30,
    onData: options.onData,
  });

  await ptyHandle.waitForConnection();
  return ptyHandle;
};

export const runAgentViaPty = async (
  sandbox: Sandbox,
  prompt: string,
  apiKey: string,
  onData?: (text: string) => void
) => {
  const ptyHandle = await createPty(sandbox, {
    id: "quaver-agent",
    onData: (data) => onData?.(new TextDecoder().decode(data)),
  });

  // Run agent with API key
  ptyHandle.sendInput(
    `ANTHROPIC_API_KEY=${apiKey} quaver "${prompt.replace(/"/g, '\\"')}"\n`
  );

  const result = await ptyHandle.wait();
  return result;
};

export const runCommandViaPty = async (
  sandbox: Sandbox,
  command: string,
  onData: (text: string) => void
) => {
  const ptyHandle = await createPty(sandbox, {
    id: `cmd-${Date.now()}`,
    onData: (data) => onData(new TextDecoder().decode(data)),
  });

  ptyHandle.sendInput(`${command}\n`);

  const result = await ptyHandle.wait();
  return result;
};
