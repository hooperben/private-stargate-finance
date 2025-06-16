import { InputNote, OutputNote } from "..";
import { getNoirClasses } from "../test-suite/get-noir-classes";
import { PoseidonMerkleTree } from "../PoseidonMerkleTree";

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
