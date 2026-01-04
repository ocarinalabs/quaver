import type { Daytona } from "@daytonaio/sdk";
import type { Volume } from "@daytonaio/sdk/src/Volume";

export const getVolume = (
  client: Daytona,
  name: string,
  create?: boolean
): Promise<Volume> => client.volume.get(name, create);

export const deleteVolume = (client: Daytona, volume: Volume): Promise<void> =>
  client.volume.delete(volume);
