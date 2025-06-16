import { Fr } from "@aztec/foundation/fields";

export const createInputNote = (
  assetId: bigint | string,
  amount: bigint | string,
  owner: bigint | string,
  owner_secret: bigint | string,
  secret: bigint | string,
  leaf_index: bigint | string,
  path: bigint[] | string[] | Fr[],
  path_indices: bigint[] | number[],
) => {
  return {
    asset_id: assetId.toString(),
    asset_amount: amount.toString(),
    owner: owner.toString(),
    owner_secret: owner_secret.toString(),
    secret: secret.toString(),
    leaf_index: leaf_index.toString(),
    path: path.map((item) => BigInt(item.toString()).toString()),
    path_indices: path_indices.map((item) => item.toString()),
  };
};

export const emptyInputNote = createInputNote(
  0n,
  0n,
  0n,
  0n,
  0n,
  0n,
  [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
  [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
);

export const createOutputNote = (
  owner: bigint | string,
  secret: bigint | string,
  asset_id: bigint | string,
  asset_amount: bigint | string,
) => {
  return {
    owner: owner.toString(),
    secret: secret.toString(),
    asset_id: asset_id.toString(),
    asset_amount: asset_amount.toString(),
  };
};

export const emptyOutputNote = createOutputNote(0n, 0n, 0n, 0n);
