import { ethers } from "hardhat";

export const deployVerifiers = async () => {
  const [Deployer] = await ethers.getSigners();
  const DepositVerifierFactory = await ethers.getContractFactory(
    "DepositVerifier",
    Deployer,
  );
  const depositDeployment = await DepositVerifierFactory.deploy();

  const TransferVerifierFactory = await ethers.getContractFactory(
    "TransferVerifier",
    Deployer,
  );
  const transferDeployment = await TransferVerifierFactory.deploy();

  const WithdrawVerifierFactory = await ethers.getContractFactory(
    "WithdrawVerifier",
    Deployer,
  );
  const withdrawDeployment = await WithdrawVerifierFactory.deploy();

  return {
    deposit: depositDeployment.address,
    transfer: transferDeployment.address,
    withdraw: withdrawDeployment.address,
  };
};
