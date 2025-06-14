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

    console.log(tester);
  });

  it("creating a note", async () => {
    // stargate USDC
    const assetId = "0xc026395860Db2d07ee33e05fE50ed7bD583189C7";

    const amount = "5";
    const decimals = 6;

    const secret = "";
    const owner = "";

    // note hash = hash(assetId, amount, secret, owner)
    const note = poseidonHash([]);
  });
});
