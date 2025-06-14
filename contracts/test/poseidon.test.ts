import { getRandomWithField } from "../helpers";
import { getTestingAPI, loadPoseidon } from "../helpers/get-testing-api";
import { PoseidonTest } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Testing poseidon equivalencies", async () => {
  let Signers: HardhatEthersSigner[];
  let poseidonTest: PoseidonTest;
  let poseidonHash: (inputs: bigint[]) => Promise<{ toString(): string }>;

  beforeEach(async () => {
    ({ poseidonTest, poseidonHash, Signers } = await getTestingAPI());
  });

  it("should work", async () => {
    const test = await poseidonTest.poseidonHash2(1n, 2n);
    console.log("Solidity result:", test);

    const tsTest = await poseidonHash([1n, 2n]);
    console.log("TypeScript result:", tsTest.toString());

    const tester = BigInt(
      "0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001",
    );

    // console.log(tester);
  });

  it("creating a note", async () => {
    // stargate USDC
    const assetId = BigInt("0xc026395860Db2d07ee33e05fE50ed7bD583189C7");

    const amount = BigInt("5");
    const decimals = 6;

    const secret =
      2389312107716289199307843900794656424062350252250388738019021107824217896920n;
    const owner =
      10036677144260647934022413515521823129584317400947571241312859176539726523915n;
    const note = await poseidonHash([assetId, amount, owner, secret]);

    console.log(note);

    console.log({
      hash: BigInt(note.toString()),
      assetId,
      amount,
      owner,
      secret,
    });
  });
});
