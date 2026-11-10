/**
 * Tops up the operator's testnet key from the Sui faucet (v3, which solves a small proof of work; v2
 * answers "CI compatibility is disabled"). Testnet only: it never touches mainnet.
 *   npm run cash:faucet
 */
import { loadEnv } from "@mira/memory";
import { getFaucetHost, requestSuiFromFaucetV3 } from "@mysten/sui/faucet";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

loadEnv();
const key = process.env.SUI_OPERATOR_KEY?.trim();
if (!key) {
  console.error("SUI_OPERATOR_KEY is not set in .env");
  process.exit(1);
}
const address = Ed25519Keypair.fromSecretKey(key).toSuiAddress();
const res = await requestSuiFromFaucetV3({ host: getFaucetHost("testnet"), recipient: address });
console.log(res.status === "success" ? `+${Number(res.amountMist) / 1e9} SUI to ${address} (${res.digest})` : `faucet: ${JSON.stringify(res)}`);
