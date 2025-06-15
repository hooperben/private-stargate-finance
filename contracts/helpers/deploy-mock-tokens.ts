import { ethers, deployments, network } from "hardhat";

export const BASE_EID = 1;
export const REMOTE_EID = 2;

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

  // Setting destination endpoints in the LZEndpoint mock for each MyOApp instance
  // (this is not needed in prod)
  await baseEndpoint.setDestLzEndpoint(
    lzOFTDeploymentRemote.address,
    remoteEndpoint.address,
  );
  await remoteEndpoint.setDestLzEndpoint(
    lzOFTDeploymentBase.address,
    baseEndpoint.address,
  );

  // wire up

  // Setting each MyOApp instance as a peer of the other
  await lzOFTDeploymentBase.setPeer(
    REMOTE_EID,
    ethers.utils.zeroPad(lzOFTDeploymentRemote.address, 32),
  );
  await lzOFTDeploymentRemote.setPeer(
    BASE_EID,
    ethers.utils.zeroPad(lzOFTDeploymentBase.address, 32),
  );

  return {
    usdcDeployment,
    lzOFTDeploymentBase,
    lzOFTDeploymentRemote,
    baseEndpoint,
    remoteEndpoint,
  };
};
