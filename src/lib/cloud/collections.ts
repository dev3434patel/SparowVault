import { CLOUD_COLLECTIONS } from "@/config/syncContracts";

export { CLOUD_COLLECTIONS };

export type CloudCollectionKey = (typeof CLOUD_COLLECTIONS)[number];

export function isCloudCollectionKey(value: string): value is CloudCollectionKey {
  return (CLOUD_COLLECTIONS as readonly string[]).includes(value);
}
