import { SYNC_CONTRACT_SERVER_ALLOWLIST } from "@/config/syncContracts";

export const CLOUD_COLLECTIONS = SYNC_CONTRACT_SERVER_ALLOWLIST;

export type CloudCollectionKey = (typeof CLOUD_COLLECTIONS)[number];

export function isCloudCollectionKey(value: string): value is CloudCollectionKey {
  return (CLOUD_COLLECTIONS as readonly string[]).includes(value);
}
