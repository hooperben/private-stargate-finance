import { ethers, deployments } from "hardhat";
import { Signer } from "ethers";

import { UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import depositCircuit from "../../circuits/deposit/target/deposit.json";
import transferCircuit from "../../circuits/transfer/target/transfer.json";

import { PoseidonMerkleTree } from "./PoseidonMerkleTree";

import { ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import * as path from "path";

const ZERO_VALUE =
  BigInt(keccak256(toUtf8Bytes("TANGERINE"))) %
  BigInt("0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001");
const LEVELS = 12;
const TREE_CACHE_PATH = path.join(__dirname, "../cache/full-tree.json");

const getMerkleTree = async () => {
  // Try to load existing tree first
  let tree: PoseidonMerkleTree;
  try {
    console.log("Attempting to load cached tree...");
    tree = await PoseidonMerkleTree.loadFromFile(TREE_CACHE_PATH);
    console.log(
      "✅ Loaded cached tree with",
      tree?.insertedLeaves?.size || 0,
      "leaves",
    );
  } catch (error) {
    console.log("❌ No cached tree found, building new one...");
    tree = new PoseidonMerkleTree(LEVELS);

    const totalLeaves = 2 ** LEVELS;
    const insertPromises = [];
    for (let i = 0; i < totalLeaves; i++) {
      insertPromises.push(tree.insert(ZERO_VALUE, i));
    }

    await Promise.all(insertPromises);

    // Save for future use
    await tree.saveToFile(TREE_CACHE_PATH);
  }

  return tree;
};

export const getTestingAPI = async () => {
  const Signers = await ethers.getSigners();
  const Deployer = Signers[0] as unknown as Signer;

  const poseidonHash = await loadPoseidon();

  const poseidonTestFactory = await ethers.getContractFactory("PoseidonTest");
  const poseidonTest = await poseidonTestFactory.deploy();

  const EndpointV2MockArtifact = await deployments.getArtifact(
    "EndpointV2Mock",
  );
  const EndpointV2Mock = new ethers.ContractFactory(
    EndpointV2MockArtifact.abi,
    EndpointV2MockArtifact.bytecode,
    Deployer,
  );

  const deployment = await EndpointV2Mock.deploy(1);
  await deployment.deployed();

  const lzEndpointAddress = deployment.address;

  const lzEndpointContract = new ethers.Contract(
    lzEndpointAddress,
    EndpointV2MockArtifact.abi,
    Deployer,
  );

  const PrivateStargateFinanceFactory = await ethers.getContractFactory(
    "PrivateStargateFinance",
    Deployer,
  );
  const privateStargateFinance = await PrivateStargateFinanceFactory.deploy(
    lzEndpointAddress,
    await Deployer.getAddress(),
  );
  const privateStargateFinanceDeployment =
    await privateStargateFinance.deployed();

  const privateStargateContract = new ethers.Contract(
    privateStargateFinanceDeployment.address,
    PrivateStargateFinanceFactory.interface,
    Deployer,
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
    circuitNoir,
    circuitBackend,
    transferNoir,
    transferBackend,
    Signers,
    poseidonTest,
    poseidonHash,
    privateStargateFinance: privateStargateContract,
    lzMockEndpoint: lzEndpointContract,
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
