import { describe, expect, it } from "vitest";
import { localGrpcHost } from "./local.ts";

describe("localGrpcHost", () => {
  it("reads a localnet URL as host and port, 9000 by default", () => {
    expect(localGrpcHost("http://127.0.0.1:9000")).toBe("127.0.0.1:9000");
    expect(localGrpcHost("http://localhost")).toBe("localhost:9000");
  });

  it("refuses anything that isn't this machine", () => {
    expect(() => localGrpcHost("https://fullnode.testnet.sui.io:443")).toThrow(/this machine/);
  });
});
