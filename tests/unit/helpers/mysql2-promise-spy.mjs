import { appendFileSync } from "node:fs";

export function createConnection() {
  const flag = process.env.SV_CREATE_CONNECTION_FLAG;
  if (flag) appendFileSync(flag, "called\n");
  const error = new Error("CREATE_CONNECTION_CALLED");
  error.code = "CREATE_CONNECTION_CALLED";
  throw error;
}

export default { createConnection };
