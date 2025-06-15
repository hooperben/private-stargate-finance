import { Noir } from "@noir-lang/noir_js";
import { getTestingAPI } from "../helpers/get-testing-api";

import { UltraHonkBackend } from "@aztec/bb.js";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseUnits } from "ethers/lib/utils";

describe("Testing deposit functionality", () => {
  let Signers: SignerWithAddress[];
  let poseidonHash: (inputs: bigint[]) => Promise<{ toString(): string }>;

  let depositNoir: Noir;
  let depositBackend: UltraHonkBackend;

  let privateStargateFinance: Contract;
  let usdcDeployment: Contract;

  beforeEach(async () => {
    Signers = await ethers.getSigners();
    ({
      usdcDeployment,
      poseidonHash,
      depositNoir,
      depositBackend,
      privateStargateFinance,
    } = await getTestingAPI());
  });

  it("testing note proving in typescript", async () => {
    const assetId = usdcDeployment.address;
    const amount = BigInt("5");

    const secret =
      2389312107716289199307843900794656424062350252250388738019021107824217896920n;
    const owner_secret =
      10036677144260647934022413515521823129584317400947571241312859176539726523915n;
    const owner = BigInt((await poseidonHash([owner_secret])).toString());
    const assetIdBigInt = BigInt(assetId);

    const note = await poseidonHash([assetIdBigInt, amount, owner, secret]);

    const { witness } = await depositNoir.execute({
      hash: BigInt(note.toString()).toString(),
      asset_id: assetIdBigInt.toString(),
      asset_amount: amount.toString(),
      owner: owner.toString(),
      secret: secret.toString(),
    });

    const proof = await depositBackend.generateProof(witness, { keccak: true });

    // approve PSF to move USDC tokens
    const parseAmount = parseUnits("5", 6);
    const approveTx = await usdcDeployment
      .connect(Signers[0])
      .approve(privateStargateFinance.address, parseAmount);
    await approveTx.wait();

    await privateStargateFinance.deposit(
      assetId,
      amount,
      proof.proof,
      proof.publicInputs,
      "0x",
    );
  });
});
