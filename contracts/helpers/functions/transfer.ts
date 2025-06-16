import { ProofData } from "@aztec/bb.js";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { InputNote, OutputNote } from "..";
import { PrivateStargateFinance } from "../../typechain-types";
import { PoseidonMerkleTree } from "../PoseidonMerkleTree";
import { getNoirClasses } from "../test-suite/get-noir-classes";

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

export const transfer = async (
  privateStargateFinance: PrivateStargateFinance,
  proof: ProofData,
  runner: HardhatEthersSigner,
) => {
  const tx = await privateStargateFinance
    .connect(runner)
    .transfer(proof.proof, proof.publicInputs);

  return tx;
};
