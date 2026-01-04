import type {
  CreateSandboxFromImageParams,
  CreateSandboxFromSnapshotParams,
  Daytona,
  Sandbox,
} from "@daytonaio/sdk";

type CreateSandboxParams =
  | CreateSandboxFromSnapshotParams
  | CreateSandboxFromImageParams;

export const createSandbox = (
  client: Daytona,
  params?: CreateSandboxParams
): Promise<Sandbox> => client.create(params);

export const findSandbox = (
  client: Daytona,
  idOrName: string
): Promise<Sandbox> => client.findOne({ idOrName });

export const getSandbox = (
  client: Daytona,
  idOrName: string
): Promise<Sandbox> => client.get(idOrName);

export const stopSandbox = async (sandbox: Sandbox): Promise<void> => {
  await sandbox.stop();
};

export const startSandbox = async (sandbox: Sandbox): Promise<void> => {
  await sandbox.start();
};

export const archiveSandbox = async (sandbox: Sandbox): Promise<void> => {
  await sandbox.archive();
};

export const recoverSandbox = async (sandbox: Sandbox): Promise<void> => {
  await sandbox.recover();
};

export const deleteSandbox = async (sandbox: Sandbox): Promise<void> => {
  await sandbox.delete();
};
