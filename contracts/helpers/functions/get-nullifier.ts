import { loadPoseidon } from "../load-poseidon";

export const getNullifier = async (
  leafIndex: bigint | string,
  owner: bigint | string,
  secret: bigint | string,
  assetId: bigint | string,
  amount: bigint | string,
) => {
  const poseidonHash = await loadPoseidon();
  const nullifier = await poseidonHash([
    BigInt(leafIndex),
    BigInt(owner),
    BigInt(secret),
    BigInt(assetId),
    BigInt(amount),
  ]);

  return BigInt(nullifier.toString());
};
