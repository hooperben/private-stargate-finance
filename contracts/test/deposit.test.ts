import { Noir } from "@noir-lang/noir_js";
import { getRandomWithField } from "../helpers";
import { getTestingAPI } from "../helpers/get-testing-api";

import { UltraHonkBackend } from "@aztec/bb.js";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { PoseidonMerkleTree } from "../helpers/PoseidonMerkleTree";

describe("Testing deposit functionality", () => {
  let Signers: SignerWithAddress[];
  let poseidonTest: Contract;
  let poseidonHash: (inputs: bigint[]) => Promise<{ toString(): string }>;

  let circuitNoir: Noir;
  let circuitBackend: UltraHonkBackend;

  let privateStargateFinance: Contract;
  let tree: PoseidonMerkleTree;

  beforeEach(async () => {
    Signers = await ethers.getSigners();
    ({
      poseidonTest,
      poseidonHash,
      // Signers,
      circuitNoir,
      circuitBackend,
      privateStargateFinance,
      tree,
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

    // Wait for the transaction to be mined and get the receipt
    // const receipt = await depositTx.wait();

    // Find the LeafInserted event
    // const leafInsertedEvent = receipt.events?.find(
    //   (event: any) => event.event === "LeafInserted",
    // );

    // if (leafInsertedEvent) {
    //   console.log("LeafInserted event:");
    //   console.log("  leafIndex:", leafInsertedEvent.args.leafIndex.toString());
    //   console.log("  leafValue:", leafInsertedEvent.args.leafValue.toString());
    // } else {
    //   console.log("LeafInserted event not found");
    // }

    console.log(proof.publicInputs[0]);
    await tree.insert(proof.publicInputs[0], 0);

    const merkleProof = await tree.getProof(0);
    console.log(merkleProof.siblings.map((item) => item.toBigInt()));
    console.log(merkleProof.indices);
    const leaf = await tree.getLeafValue(0);
    console.log("leaf: ", leaf.toBigInt());

    // console.log(merkleProof);

    const formmated = merkleProof.siblings.map((item) => item.toBigInt());

    // console.log(formmated);

    const newRoot = await tree.getRoot();

    console.log(newRoot);

    // if we update our in memory tree to match the contract our roots should match

    // console.log(depositTx);
  });
});
