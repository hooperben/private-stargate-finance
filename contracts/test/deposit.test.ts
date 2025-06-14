import { Noir } from "@noir-lang/noir_js";
import { getRandomWithField } from "../helpers";
import { getTestingAPI } from "../helpers/get-testing-api";

import { UltraHonkBackend } from "@aztec/bb.js";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Testing deposit functionality", () => {
  let Signers: SignerWithAddress[];
  let poseidonTest: Contract;
  let poseidonHash: (inputs: bigint[]) => Promise<{ toString(): string }>;

  let circuitNoir: Noir;
  let circuitBackend: UltraHonkBackend;

  let privateStargateFinance: Contract;

  beforeEach(async () => {
    Signers = await ethers.getSigners();
    ({
      poseidonTest,
      poseidonHash,
      // Signers,
      circuitNoir,
      circuitBackend,
      privateStargateFinance,
    } = await getTestingAPI());
  });

  it("testing note proving in typescript", async () => {
    const assetId = "0xc026395860Db2d07ee33e05fE50ed7bD583189C7";
    const amount = BigInt("5");

    const secret =
      2389312107716289199307843900794656424062350252250388738019021107824217896920n;
    const owner =
      10036677144260647934022413515521823129584317400947571241312859176539726523915n;

    const assetIdBigInt = BigInt(assetId);

    const note = await poseidonHash([assetIdBigInt, amount, owner, secret]);

    const { witness } = await circuitNoir.execute({
      hash: BigInt(note.toString()).toString(),
      asset_id: assetIdBigInt.toString(),
      asset_amount: amount.toString(),
      owner: owner.toString(),
      secret: secret.toString(),
    });

    const proof = await circuitBackend.generateProof(witness);

    const depositTx = await privateStargateFinance.deposit(
      assetId,
      amount,
      proof.proof,
      proof.publicInputs,
      "0x",
    );

    // if we update our in memory tree to match the contract our roots should match

    // console.log(depositTx);
  });
});
