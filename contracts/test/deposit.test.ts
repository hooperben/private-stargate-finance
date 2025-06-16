import { Noir } from "@noir-lang/noir_js";
import { getTestingAPI } from "../helpers/get-testing-api";

import { UltraHonkBackend } from "@aztec/bb.js";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { parseUnits } from "ethers";
import { approve } from "../helpers/functions/approve";
import { PrivateStargateFinance, USDC } from "../typechain-types";

describe("Testing deposit functionality", () => {
  let Signers: HardhatEthersSigner[];
  let poseidonHash: (inputs: bigint[]) => Promise<{ toString(): string }>;

  let depositNoir: Noir;
  let depositBackend: UltraHonkBackend;

  let privateStargateFinance: PrivateStargateFinance;
  let usdcDeployment: USDC;

  beforeEach(async () => {
    ({
      Signers,
      usdcDeployment,
      poseidonHash,
      depositNoir,
      depositBackend,
      privateStargateFinance,
    } = await getTestingAPI());
  });

  it("testing note proving in typescript", async () => {
    const assetId = await usdcDeployment.getAddress();
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

    await approve(
      Signers[0],
      await usdcDeployment.getAddress(),
      await privateStargateFinance.getAddress(),
      parseUnits("5", 6),
    );

    await privateStargateFinance.deposit(
      assetId,
      amount,
      proof.proof,
      proof.publicInputs,
      "0x",
    );
  });
});
