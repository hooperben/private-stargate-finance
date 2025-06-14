import { Noir } from "@noir-lang/noir_js";
import { getRandomWithField } from "../helpers";
import { getTestingAPI } from "../helpers/get-testing-api";
import { PoseidonTest } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { UltraHonkBackend } from "@aztec/bb.js";

describe("Testing deposit functionality", () => {
  let Signers: HardhatEthersSigner[];
  let poseidonTest: PoseidonTest;
  let poseidonHash: (inputs: bigint[]) => Promise<{ toString(): string }>;

  let circuitNoir: Noir;
  let circuitBackend: UltraHonkBackend;

  beforeEach(async () => {
    ({ poseidonTest, poseidonHash, Signers, circuitNoir, circuitBackend } =
      await getTestingAPI());
  });

  it.only("testing note proving in typescript", async () => {
    const assetId = BigInt("0xc026395860Db2d07ee33e05fE50ed7bD583189C7");
    const amount = BigInt("5");

    const secret =
      2389312107716289199307843900794656424062350252250388738019021107824217896920n;
    const owner =
      10036677144260647934022413515521823129584317400947571241312859176539726523915n;

    const note = await poseidonHash([assetId, amount, owner, secret]);

    const { witness } = await circuitNoir.execute({
      hash: BigInt(note.toString()).toString(),
      asset_id: assetId.toString(),
      asset_amount: amount.toString(),
      owner: owner.toString(),
      secret: secret.toString(),
    });

    const proof = await circuitBackend.generateProof(witness);

    console.log(proof);
  });
});
