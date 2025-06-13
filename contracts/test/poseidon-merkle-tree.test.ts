import { expect } from "chai";
import { PoseidonMerkleTree } from "../helpers/PoseidonMerkleTree";

describe("PoseidonMerkleTree", () => {
  let tree: PoseidonMerkleTree;
  const LEVELS = 4; // 2^4 = 16 leaves

  beforeEach(async () => {
    tree = new PoseidonMerkleTree(LEVELS);
  });

  it("should insert leaves and calculate root correctly", async () => {
    // Insert some leaves
    await tree.insert("1", 0);
    await tree.insert("2", 1);
    await tree.insert("3", 2);

    const root = await tree.getRoot();
    expect(root).to.not.be.undefined;
  });

  it("should generate and verify proofs", async () => {
    // Insert leaves
    await tree.insert("100", 0);
    await tree.insert("200", 1);
    await tree.insert("300", 2);
    await tree.insert("400", 3);

    // Get root
    const root = await tree.getRoot();

    // Get proof for leaf at index 2
    const proof = await tree.getProof(2);

    // Verify the proof
    const isValid = await PoseidonMerkleTree.verifyProof(root, "300", proof);
    expect(isValid).to.be.true;

    // Verify with wrong leaf value
    const isInvalid = await PoseidonMerkleTree.verifyProof(root, "301", proof);
    expect(isInvalid).to.be.false;
  });

  it("should handle bigint inputs", async () => {
    const bigIntValue = 123456789n;
    await tree.insert(bigIntValue, 0);

    const root = await tree.getRoot();
    const proof = await tree.getProof(0);

    const isValid = await PoseidonMerkleTree.verifyProof(
      root,
      bigIntValue,
      proof,
    );
    expect(isValid).to.be.true;
  });
});
