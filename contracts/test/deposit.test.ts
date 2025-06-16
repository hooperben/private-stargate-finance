import { approve } from "@/helpers/functions/approve";
import { getDepositDetails } from "@/helpers/functions/deposit";
import { getTestingAPI } from "@/helpers/get-testing-api";
import { PoseidonMerkleTree } from "@/helpers/poseidon-merkle-tree";
import { PrivateStargateFinance, USDC } from "@/typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { parseUnits } from "ethers";

describe("Testing deposit functionality", () => {
  let Signers: HardhatEthersSigner[];
  let poseidonHash: (inputs: bigint[]) => Promise<{ toString(): string }>;

  let privateStargateFinance: PrivateStargateFinance;
  let usdcDeployment: USDC;

  let tree: PoseidonMerkleTree;

  beforeEach(async () => {
    ({ Signers, usdcDeployment, poseidonHash, privateStargateFinance, tree } =
      await getTestingAPI());
  });

  it("testing note proving in typescript", async () => {
    const assetId = await usdcDeployment.getAddress();
    const assetAmount = BigInt("5");

    const secret =
      2389312107716289199307843900794656424062350252250388738019021107824217896920n;
    const ownerSecret =
      10036677144260647934022413515521823129584317400947571241312859176539726523915n;
    const owner = BigInt((await poseidonHash([ownerSecret])).toString());

    // create the ZK proof
    const { proof } = await getDepositDetails({
      assetId,
      assetAmount,
      secret,
      owner,
    });

    const evmAmount = parseUnits("5", 6);

    // approve PSF to move the deposit token
    await approve(
      Signers[0],
      await usdcDeployment.getAddress(),
      await privateStargateFinance.getAddress(),
      evmAmount,
    );

    // check our balances beforehand
    const usdcBalanceBefore = await usdcDeployment.balanceOf(
      Signers[0].address,
    );

    // call the deposit TX
    await privateStargateFinance.deposit(
      assetId,
      assetAmount,
      proof.proof,
      proof.publicInputs,
      "0x",
    );

    const usdcBalanceAfter = await usdcDeployment.balanceOf(Signers[0].address);

    expect(usdcBalanceAfter).eq(usdcBalanceBefore - evmAmount);

    // check our merkle state matches
    await tree.insert(proof.publicInputs[0], 0);
  });
});
