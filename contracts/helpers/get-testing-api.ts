import { zeroPadValue } from "ethers";
import { ethers } from "hardhat";
import { PrivateStargateFinance } from "../typechain-types";
import {
  BASE_EID,
  deployMockTokens,
  REMOTE_EID,
} from "./test-suite/deploy-mock-tokens";
import { deployPSF } from "./test-suite/deploy-psf";
import { deployVerifiers } from "./test-suite/deploy-verifiers";
import { getNoirClasses } from "./test-suite/get-noir-classes";
import { loadPoseidon } from "./load-poseidon";
import { getMerkleTree } from "./test-suite/merkle";

export const getTestingAPI = async () => {
  const Signers = await ethers.getSigners();
  const Deployer = Signers[0];

  const verifiers = await deployVerifiers();

  const poseidonHash = await loadPoseidon();

  const {
    usdcDeployment,
    baseEndpoint,
    remoteEndpoint,
    lzOFTDeploymentBase,
    lzOFTDeploymentRemote,
  } = await deployMockTokens();

  const basePSF = (await deployPSF(
    await baseEndpoint.getAddress(),
    Deployer.address,
    verifiers.deposit,
    verifiers.transfer,
    verifiers.withdraw,
    verifiers.warp,
  )) as unknown as PrivateStargateFinance;

  const remotePSF = (await deployPSF(
    await remoteEndpoint.getAddress(),
    Deployer.address,
    verifiers.deposit,
    verifiers.transfer,
    verifiers.withdraw,
    verifiers.warp,
  )) as unknown as PrivateStargateFinance;

  // wire up PSFs
  await baseEndpoint.setDestLzEndpoint(
    await remotePSF.getAddress(),
    await remoteEndpoint.getAddress(),
  );
  await remoteEndpoint.setDestLzEndpoint(
    await basePSF.getAddress(),
    await baseEndpoint.getAddress(),
  );
  await basePSF.setPeer(
    REMOTE_EID,
    zeroPadValue(await remotePSF.getAddress(), 32),
  );
  await remotePSF.setPeer(
    BASE_EID,
    zeroPadValue(await basePSF.getAddress(), 32),
  );

  const {
    depositNoir,
    depositBackend,
    transferNoir,
    transferBackend,
    withdrawNoir,
    withdrawBackend,
    warpNoir,
    warpBackend,
  } = getNoirClasses();

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
    poseidonHash,
    privateStargateFinance: basePSF,
    remotePSF,
    tree,
  };
};
