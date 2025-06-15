export const createInputNote = (
  assetId: bigint,
  amount: bigint,
  owner: bigint,
  owner_secret: bigint,
  secret: bigint,
  leaf_index: bigint,
  path: bigint[],
  path_indices: bigint[],
) => {
  return {
    asset_id: assetId.toString(),
    asset_amount: amount.toString(),
    owner: owner.toString(),
    owner_secret: owner_secret.toString(),
    secret: secret.toString(),
    leaf_index: leaf_index.toString(),
    path: path.map((item) => item.toString()),
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
  owner: bigint,
  secret: bigint,
  asset_id: bigint,
  asset_amount: bigint,
) => {
  return {
    owner: owner.toString(),
    secret: secret.toString(),
    asset_id: asset_id.toString(),
    asset_amount: asset_amount.toString(),
  };
};

export const emptyOutputNote = createOutputNote(0n, 0n, 0n, 0n);
