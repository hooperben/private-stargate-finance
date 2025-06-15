import { Signer } from "ethers";
import { ethers } from "hardhat";
import { deployMockTokens } from "./deploy-mock-tokens";
import { deployPSF } from "./deploy-psf";
import { deployVerifiers } from "./deploy-verifiers";
import { getNoirClasses } from "./get-noir-classes";
import { getMerkleTree } from "./merkle";

export const getTestingAPI = async () => {
  const Signers = await ethers.getSigners();
  const Deployer = Signers[0] as unknown as Signer;

  const verifiers = await deployVerifiers();

  const poseidonHash = await loadPoseidon();

  const poseidonTestFactory = await ethers.getContractFactory("PoseidonTest");
  const poseidonTest = await poseidonTestFactory.deploy();

  const getNullifier = async (
    leafIndex: bigint,
    owner: bigint,
    secret: bigint,
    assetId: bigint,
    amount: bigint,
  ) => {
    const nullifier = await poseidonHash([
      leafIndex,
      owner,
      secret,
      assetId,
      amount,
    ]);

    return nullifier;
  };

  const getOutputHash = async (
    owner: bigint,
    secret: bigint,
    assetId: bigint,
    amount: bigint,
  ) => {
    const noteHash = await poseidonHash([assetId, amount, owner, secret]);
    return noteHash;
  };

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

  const {
    depositNoir,
    depositBackend,
    transferNoir,
    transferBackend,
    withdrawNoir,
    withdrawBackend,
  } = await getNoirClasses();

  const tree = await getMerkleTree();

  return {
    getNullifier,
    getOutputHash,
    usdcDeployment,
    lzOFTDeploymentBase,
    lzOFTDeploymentRemote,
    depositNoir,
    depositBackend,
    transferNoir,
    transferBackend,
    withdrawNoir,
    withdrawBackend,
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
