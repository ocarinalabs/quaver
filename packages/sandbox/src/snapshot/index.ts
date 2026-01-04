import type { CreateSnapshotParams, Daytona } from "@daytonaio/sdk";

type SnapshotOptions = {
  onLogs?: (log: string) => void;
};

export const createSnapshot = (
  client: Daytona,
  params: CreateSnapshotParams,
  options?: SnapshotOptions
) => client.snapshot.create(params, options);
