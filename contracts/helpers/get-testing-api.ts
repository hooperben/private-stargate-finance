import { ethers } from "hardhat";

import { UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import depositCircuit from "../../circuits/deposit/target/deposit.json";

export const getTestingAPI = async () => {
  const Signers = await ethers.getSigners();

  const poseidonHash = await loadPoseidon();

  const poseidonTestFactory = await ethers.getContractFactory("PoseidonTest");
  const poseidonTest = await poseidonTestFactory.deploy();

  // DEPOSIT CIRCUIT

  // @ts-expect-error -- idk
  const circuitNoir = new Noir(depositCircuit);
  const circuitBackend = new UltraHonkBackend(depositCircuit.bytecode);

  return {
    circuitNoir,
    circuitBackend,
    Signers,
    poseidonTest,
    poseidonHash,
  };
};

// Type representing a field element in the Aztec crypto system
type Fr = { toString(): string };

// Type for the poseidon2Hash function
type Poseidon2Hash = (inputs: bigint[]) => Promise<Fr>;

export const loadPoseidon = async (): Promise<Poseidon2Hash> => {
  const importModule = new Function(
    'return import("@aztec/foundation/crypto")',
  );
  const module = await importModule();
  return module.poseidon2Hash;
};
