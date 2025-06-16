import { getNoirClasses } from "../get-noir-classes";
import { PoseidonMerkleTree } from "../PoseidonMerkleTree";

interface InputNote {
  asset_id: bigint | string;
  asset_amount: bigint | string;
  owner: bigint | string;
  owner_secret: bigint | string;
  secret: bigint | string;
  leaf_index: bigint | string;
  path: bigint | string[];
  path_indices: bigint | string[];
}

interface OutputNote {
  owner: string;
  secret: string;
  asset_id: string;
  asset_amount: string;
}

export const getTransferDetails = async (
  tree: PoseidonMerkleTree,
  inputNotes: InputNote[],
  nullifiers: BigInt[],
  outputNotes: OutputNote[],
  outputHashes: BigInt[],
) => {
  const { transferNoir, transferBackend } = getNoirClasses();

  const root = await tree.getRoot();

  const { witness: transferWitness } = await transferNoir.execute({
    root: root.toBigInt().toString(),
    // not my ideal any'ing please don't judge me
    input_notes: inputNotes as any,
    output_notes: outputNotes as any,
    nullifiers: nullifiers.map((item) => item.toString()),
    output_hashes: outputHashes.map((item) => item.toString()),
  });

  const transferProof = await transferBackend.generateProof(transferWitness, {
    keccak: true,
  });

  return {
    proof: transferProof,
  };
};
