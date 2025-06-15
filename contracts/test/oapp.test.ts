import { Noir } from "@noir-lang/noir_js";
import { getRandomWithField } from "../helpers";
import { getTestingAPI } from "../helpers/get-testing-api";

import { UltraHonkBackend } from "@aztec/bb.js";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { PoseidonMerkleTree } from "../helpers/PoseidonMerkleTree";
import {
  createInputNote,
  emptyInputNote,
  createOutputNote,
  emptyOutputNote,
} from "../helpers/formatting";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { expect } from "chai";

import { Options } from "@layerzerolabs/lz-v2-utilities";

describe("Testing OApp functionality", async () => {
  let Signers: SignerWithAddress[];
  let poseidonHash: (inputs: bigint[]) => Promise<{ toString(): string }>;

  let depositNoir: Noir;
  let depositBackend: UltraHonkBackend;

  let transferNoir: Noir;
  let transferBackend: UltraHonkBackend;

  let withdrawNoir: Noir;
  let withdrawBackend: UltraHonkBackend;

  let privateStargateFinance: Contract;
  let tree: PoseidonMerkleTree;

  let usdcDeployment: Contract;
  let lzOFTDeploymentBase: Contract;
  let lzOFTDeploymentRemote: Contract;

  beforeEach(async () => {
    Signers = await ethers.getSigners();
    ({
      usdcDeployment,
      lzOFTDeploymentBase,
      lzOFTDeploymentRemote,
      poseidonHash,
      depositNoir,
      depositBackend,
      transferNoir,
      transferBackend,
      withdrawNoir,
      withdrawBackend,
      privateStargateFinance,
      tree,
    } = await getTestingAPI());
  });

  it.only("OFT should work as expected", async () => {
    const deployerBalanceBefore = await lzOFTDeploymentRemote.balanceOf(
      Signers[0].address,
    );
    console.log(deployerBalanceBefore);

    // Defining the amount of tokens to send and constructing the parameters for the send operation
    const tokensToSend = parseEther("1");

    // Defining extra message execution options for the send operation
    const options = Options.newOptions()
      .addExecutorLzReceiveOption(200000, 0)
      .toHex()
      .toString();

    const sendParam = [
      2n, // REMOTE EID
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
});
