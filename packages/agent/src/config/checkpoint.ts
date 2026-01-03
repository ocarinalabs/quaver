import type { Checkpoint } from "../types/index.js";

export const getCheckpointOptions = (enabled: boolean) =>
  enabled
    ? {
        enableFileCheckpointing: true,
        extraArgs: { "replay-user-messages": null }, // Required for user message UUIDs
        env: {
          ...process.env,
          CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: "1", // SDK requirement
        },
      }
    : {};

export const createCheckpoint = (
  uuid: string,
  turnNumber: number
): Checkpoint => ({
  id: uuid,
  description: `Turn ${turnNumber}`,
  timestamp: new Date(),
});
