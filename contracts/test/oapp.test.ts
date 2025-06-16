import { getTestingAPI } from "../helpers/get-testing-api";

import { zeroPadValue } from "ethers";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

import { parseEther } from "ethers";
import { expect } from "chai";

import { Options } from "@layerzerolabs/lz-v2-utilities";
import { REMOTE_EID } from "../helpers/test-suite/deploy-mock-tokens";
import { LZOFT, PrivateStargateFinance } from "../typechain-types";

describe("Testing OApp functionality", async () => {
  let Signers: HardhatEthersSigner[];

  let privateStargateFinance: PrivateStargateFinance;

  let lzOFTDeploymentBase: LZOFT;
  let lzOFTDeploymentRemote: LZOFT;

  beforeEach(async () => {
    Signers = await ethers.getSigners();
    ({ lzOFTDeploymentBase, lzOFTDeploymentRemote, privateStargateFinance } =
      await getTestingAPI());
  });

  it("OFT should work as expected", async () => {
    const deployerBalanceBefore = await lzOFTDeploymentRemote.balanceOf(
      Signers[0].address,
    );

    // Defining the amount of tokens to send and constructing the parameters for the send operation
    const tokensToSend = parseEther("1");

    // Defining extra message execution options for the send operation
    const options = Options.newOptions()
      .addExecutorLzReceiveOption(600000, 0)
      .toHex()
      .toString();

    const sendParam = [
      REMOTE_EID, // REMOTE EID
      zeroPadValue(Signers[0].address, 32),
      tokensToSend,
      tokensToSend,
      options,
      "0x",
      "0x",
    ];

    const [nativeFee] = await lzOFTDeploymentBase.quoteSend(sendParam, false);

    // Executing the send operation from myOFTA contract
    await lzOFTDeploymentBase
      .connect(Signers[0])
      .send(sendParam, [nativeFee, 0], Signers[0].address, {
        value: nativeFee, // fees + native amount
      });

    const deployerBalanceAfter = await lzOFTDeploymentRemote.balanceOf(
      Signers[0].address,
    );

    expect(BigInt(deployerBalanceAfter - deployerBalanceBefore)).eq(
      tokensToSend,
    );
  });

  it("PSF OApp should work as expected", async () => {
    // Defining extra message execution options for the send operation
    const options = Options.newOptions()
      .addExecutorLzReceiveOption(600000, 0)
      .toHex()
      .toString();

    const notesToSend = [12345n, 56789n];
    const [nativeFee] = await privateStargateFinance.quote(
      REMOTE_EID,
      notesToSend,
      options,
      false,
    );

    // if it can get a quote it's wired correctly
    expect(nativeFee).to.not.be.undefined;
  });
});
