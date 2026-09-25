export type {
  DimensionKind,
  PartyCategoryRow,
  PartyCategoryMember,
  VoucherPreviewLine,
  VoucherPreviewPayload,
} from "./client/core";

export { partiesApi } from "./client/parties";
export { vouchersApi } from "./client/vouchers";
export { reportsApi } from "./client/reports";
export { adminApi } from "./client/admin";

import { partiesApi } from "./client/parties";
import { vouchersApi } from "./client/vouchers";
import { reportsApi } from "./client/reports";
import { adminApi } from "./client/admin";

export const companyApi = {
  ...adminApi,
  ...partiesApi,
  ...vouchersApi,
  ...reportsApi,
};
