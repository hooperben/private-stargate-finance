import { PoseidonMerkleTree } from "../helpers/PoseidonMerkleTree";
import { getTestingAPI } from "../helpers/get-testing-api";

describe.skip("PoseidonMerkleTree", () => {
  let tree: PoseidonMerkleTree;

  beforeEach(async () => {
    ({ tree } = await getTestingAPI());
  });

  it("should have the correct ROOT set for ZERO_VALUE", async () => {
    const proof = await tree.getProof(1);

    console.log(proof);
  });
});
