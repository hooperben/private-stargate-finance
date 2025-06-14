import { expect } from "chai";
import { PoseidonMerkleTree } from "../helpers/PoseidonMerkleTree";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { Fr } from "@aztec/foundation/fields";
import * as path from "path";

describe("PoseidonMerkleTree", () => {
  let tree: PoseidonMerkleTree;
  const LEVELS = 12;
  const TREE_CACHE_PATH = path.join(__dirname, "../cache/full-tree.json");

  beforeEach(async () => {
    tree = new PoseidonMerkleTree(LEVELS);
  });

  it.only("should save and load tree from JSON", async () => {
    const ZERO_VALUE =
      BigInt(keccak256(toUtf8Bytes("TANGERINE"))) %
      BigInt(
        "0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001",
      );

    // Try to load existing tree first
    let tree: PoseidonMerkleTree;
    try {
      console.log("Attempting to load cached tree...");
      tree = await PoseidonMerkleTree.loadFromFile(TREE_CACHE_PATH);
      console.log(
        "✅ Loaded cached tree with",
        tree?.insertedLeaves?.size || 0,
        "leaves",
      );
    } catch (error) {
      console.log("❌ No cached tree found, building new one...");
      tree = new PoseidonMerkleTree(LEVELS);

      const totalLeaves = 2 ** LEVELS;
      const insertPromises = [];
      for (let i = 0; i < totalLeaves; i++) {
        insertPromises.push(tree.insert(ZERO_VALUE, i));
      }

      await Promise.all(insertPromises);

      // Save for future use
      await tree.saveToFile(TREE_CACHE_PATH);
      console.log("✅ Tree built and cached");
    }

    console.log("root: ", await tree.getRoot());

    const proof = await tree.getProof(1);
    const leaf = await tree.getLeafValue(1);

    console.log("proof:", proof);
    console.log("leaf: ", leaf);

    // Verify the loaded tree works correctly
    const otherProof = await tree.getProof(32);
    console.log("Other proof:", otherProof);
  });

  it("should serialize and deserialize correctly", async () => {
    const ZERO_VALUE = BigInt("123456789");

    // Insert a few leaves
    await tree.insert(ZERO_VALUE, 0);
    await tree.insert(ZERO_VALUE * 2n, 1);
    await tree.insert(ZERO_VALUE * 3n, 2);

    const originalRoot = await tree.getRoot();

    // Serialize
    const treeJson = tree.toJSON();

    // Deserialize
    const restoredTree = PoseidonMerkleTree.fromJSON(treeJson);
    const restoredRoot = await restoredTree.getRoot();

    expect(restoredRoot).to.equal(originalRoot);
    // expect(restoredTree.nextIndex).to.equal(tree.nextIndex);
  });
});
