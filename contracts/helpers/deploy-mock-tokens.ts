import { ethers, deployments, network } from "hardhat";

const BASE_EID = 1;
const REMOTE_EID = 2;

const setUpLZ = async () => {
  if (network.name !== "hardhat" && network.name !== "localhost")
    throw new Error("Called this one wrong");
  const [Deployer] = await ethers.getSigners();

  // DEPLOY LZ TEST SUITE
  const EndpointV2MockArtifact = await deployments.getArtifact(
    "EndpointV2Mock",
  );
  const EndpointV2Mock = new ethers.ContractFactory(
    EndpointV2MockArtifact.abi,
    EndpointV2MockArtifact.bytecode,
    Deployer,
  );

  const baseEndpoint = await EndpointV2Mock.deploy(BASE_EID);
  const remoteEndpoint = await EndpointV2Mock.deploy(REMOTE_EID);

  return {
    baseEndpoint,
    remoteEndpoint,
  };
};

export const deployMockTokens = async () => {
  const [Deployer] = await ethers.getSigners();
  const USDCFactory = await ethers.getContractFactory("USDC", Deployer);
  const usdcDeployment = await USDCFactory.deploy();

  const LZOFTFactory = await ethers.getContractFactory("LZOFT", Deployer);

  const { baseEndpoint, remoteEndpoint } = await setUpLZ();

  const lzOFTDeploymentBase = await LZOFTFactory.deploy(
    "XXX",
    "XXX",
    baseEndpoint.address,
    Deployer.address,
  );

  const lzOFTDeploymentRemote = await LZOFTFactory.deploy(
    "YYY",
    "YYY",
    remoteEndpoint.address,
    Deployer.address,
  );

  return {
    usdcDeployment,
    lzOFTDeploymentBase,
    lzOFTDeploymentRemote,
    baseEndpoint,
    remoteEndpoint,
  };
};
