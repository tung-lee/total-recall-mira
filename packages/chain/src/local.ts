import { ChannelCredentials } from "@grpc/grpc-js";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import { PacedTransport } from "./paced.ts";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function localGrpcHost(url: string): string {
  const parsed = new URL(url);
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(`a localnet gRPC URL must point at this machine, not ${parsed.hostname}`);
  }
  return `${parsed.hostname}:${parsed.port || 9000}`;
}

export function createLocalSuiClient(url: string, timeoutMs = 30_000): SuiGrpcClient {
  const transport = new GrpcTransport({
    host: localGrpcHost(url),
    channelCredentials: ChannelCredentials.createInsecure(),
    timeout: timeoutMs,
  });
  return new SuiGrpcClient({
    network: "localnet",
    transport: new PacedTransport(transport, { maxRps: 20, metered: false }),
  });
}
