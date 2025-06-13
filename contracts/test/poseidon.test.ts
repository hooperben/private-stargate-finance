import { getTestingAPI, loadPoseidon } from "../helpers/get-testing-api";
import { PoseidonTest } from "../typechain-types";

describe("Testing poseidon equivalencies", async () => {
  let poseidonTest: PoseidonTest;
  let poseidonHash: (inputs: bigint[]) => Promise<{ toString(): string }>;

  beforeEach(async () => {
    ({ poseidonTest, poseidonHash } = await getTestingAPI());
  });

  it("should work", async () => {
    const test = await poseidonTest.poseidonHash2(1n, 2n);
    console.log("Solidity result:", test);

    const tsTest = await poseidonHash([1n, 2n]);
    console.log("TypeScript result:", tsTest.toString());
  });
});
