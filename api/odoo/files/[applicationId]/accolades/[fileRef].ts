import { config, handleOdooFileRequest } from "../../../_shared.js";

export { config };

export async function GET(request: Request): Promise<Response> {
  return handleOdooFileRequest(request);
}