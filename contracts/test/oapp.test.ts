import { Noir } from "@noir-lang/noir_js";
import { getRandomWithField } from "../helpers";
import { getTestingAPI } from "../helpers/get-testing-api";

import { Contract } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseEther } from "ethers/lib/utils";
import { expect } from "chai";

import { Options } from "@layerzerolabs/lz-v2-utilities";
import { REMOTE_EID } from "../helpers/deploy-mock-tokens";

describe("Testing OApp functionality", async () => {
  let Signers: SignerWithAddress[];

  let privateStargateFinance: Contract;

  let lzOFTDeploymentBase: Contract;
  let lzOFTDeploymentRemote: Contract;

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
      ethers.utils.zeroPad(Signers[0].address, 32),
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
      tokensToSend.toBigInt(),
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
    // const warpTx = await privateStargateFinance.warp(2n, notesToSend, options, {
    //   value: nativeFee,
    // });
  });
});
