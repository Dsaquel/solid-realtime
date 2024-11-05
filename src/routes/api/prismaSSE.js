import { prismaInitSSE } from "solid-realtime";
import { prisma, tables } from "../../lib/realtime";

// SSE endpoint
export async function GET() {
  const response = prismaInitSSE(prisma, tables);
  return response;
}
