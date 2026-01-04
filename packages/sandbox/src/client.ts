import { Daytona, type DaytonaConfig } from "@daytonaio/sdk";

export const createClient = (config?: DaytonaConfig): Daytona =>
  new Daytona(config);
