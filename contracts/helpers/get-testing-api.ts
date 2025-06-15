import { Signer } from "ethers";
import { ethers } from "hardhat";
import { BASE_EID, deployMockTokens, REMOTE_EID } from "./deploy-mock-tokens";
import { deployPSF } from "./deploy-psf";
import { deployVerifiers } from "./deploy-verifiers";
import { getNoirClasses } from "./get-noir-classes";
import { getMerkleTree } from "./merkle";
import { loadPoseidon } from "./load-poseidon";

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
    verifiers.warp,
  );

  const remotePSF = await deployPSF(
    remoteEndpoint.address,
    await Deployer.getAddress(),
    verifiers.deposit,
    verifiers.transfer,
    verifiers.withdraw,
    verifiers.warp,
  );

  // wire up PSFs
  await baseEndpoint.setDestLzEndpoint(
    remotePSF.address,
    remoteEndpoint.address,
  );
  await remoteEndpoint.setDestLzEndpoint(basePSF.address, baseEndpoint.address);
  await basePSF.setPeer(
    REMOTE_EID,
    ethers.utils.zeroPad(remotePSF.address, 32),
  );
  await remotePSF.setPeer(BASE_EID, ethers.utils.zeroPad(basePSF.address, 32));

  const {
    depositNoir,
    depositBackend,
    transferNoir,
    transferBackend,
    withdrawNoir,
    withdrawBackend,
    warpNoir,
    warpBackend,
  } = await getNoirClasses();

  const tree = await getMerkleTree();

  return {
    usdcDeployment,
    lzOFTDeploymentBase,
    lzOFTDeploymentRemote,
    depositNoir,
    depositBackend,
    transferNoir,
    transferBackend,
    withdrawNoir,
    withdrawBackend,
    warpNoir,
    warpBackend,
    Signers,
    poseidonTest,
    poseidonHash,
    privateStargateFinance: basePSF,
    remotePSF,
    tree,
  };
};
