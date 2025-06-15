import { ethers } from "hardhat";
import { Signer } from "ethers";

import { UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import depositCircuit from "../../circuits/deposit/target/deposit.json";
import transferCircuit from "../../circuits/transfer/target/transfer.json";

import { getMerkleTree } from "./merkle";
import { deployVerifiers } from "./deploy-verifiers";
import { deployMockTokens } from "./deploy-mock-tokens";
import { deployPSF } from "./deploy-psf";

export const getTestingAPI = async () => {
  const Signers = await ethers.getSigners();
  const Deployer = Signers[0] as unknown as Signer;

  const verifiers = await deployVerifiers();

  const poseidonHash = await loadPoseidon();

  const poseidonTestFactory = await ethers.getContractFactory("PoseidonTest");
  const poseidonTest = await poseidonTestFactory.deploy();

  const {
    usdcDeployment,
    baseEndpoint,
    remoteEndpoint,
    lzOFTDeploymentBase,
    lzOFTDeploymentRemote,
  } = await deployMockTokens();

  const basePSF = await deployPSF(
    baseEndpoint.address,
    await Deployer.getAddress(),
    verifiers.deposit,
    verifiers.transfer,
    verifiers.withdraw,
  );

  const remotePSF = await deployPSF(
    remoteEndpoint.address,
    await Deployer.getAddress(),
    verifiers.deposit,
    verifiers.transfer,
    verifiers.withdraw,
  );

  // DEPOSIT CIRCUIT
  // @ts-expect-error idk
  const circuitNoir = new Noir(depositCircuit);
  const circuitBackend = new UltraHonkBackend(depositCircuit.bytecode);

  // @ts-expect-error no idea
  const transferNoir = new Noir(transferCircuit);
  const transferBackend = new UltraHonkBackend(transferCircuit.bytecode);

  const tree = await getMerkleTree();

  return {
    usdcDeployment,
    circuitNoir,
    circuitBackend,
    transferNoir,
    transferBackend,
    Signers,
    poseidonTest,
    poseidonHash,
    privateStargateFinance: basePSF,
    remotePSF,
    tree,
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
