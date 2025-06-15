import { ethers } from "hardhat";

export const deployPSF = async (
  lzEndpoint: string,
  owner: string,
  depositVerifier: string,
  transferVerifier: string,
  withdrawVerifer: string,
  warpVerifier: string,
) => {
  const [Deployer] = await ethers.getSigners();

  const PrivateStargateFinanceFactory = await ethers.getContractFactory(
    "PrivateStargateFinance",
    Deployer,
  );

  const privateStargateFinance = await PrivateStargateFinanceFactory.deploy(
    lzEndpoint,
    owner,
    depositVerifier,
    transferVerifier,
    withdrawVerifer,
    warpVerifier,
  );

  const privateStargateFinanceDeployment =
    await privateStargateFinance.deployed();

  const privateStargateContract = new ethers.Contract(
    privateStargateFinanceDeployment.address,
    PrivateStargateFinanceFactory.interface,
    Deployer,
  );

  return privateStargateContract;
};
