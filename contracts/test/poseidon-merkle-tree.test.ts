import { expect } from "chai";
import { PoseidonMerkleTree } from "../helpers/PoseidonMerkleTree";
import { keccak256, toUtf8Bytes } from "ethers";

describe("PoseidonMerkleTree", () => {
  let tree: PoseidonMerkleTree;
  const LEVELS = 12;

  beforeEach(async () => {
    tree = new PoseidonMerkleTree(LEVELS);
  });

  it.only("should calculate the correct root based off zero value", async () => {
    const ZERO_VALUE =
      BigInt(keccak256(toUtf8Bytes("TANGERINE"))) %
      BigInt(
        "0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001",
      );

    const totalLeaves = 2 ** LEVELS;

    const insertPromises = [];
    for (let i = 0; i < totalLeaves; i++) {
      insertPromises.push(tree.insert(ZERO_VALUE, i));
    }

    await Promise.all(insertPromises);

    console.log("root: ", await tree.getRoot());

    const proof = await tree.getProof(1);
    const leaf = await tree.getLeafValue(1);

    console.log("proof:", proof);
    console.log("leaf: ", leaf);

    const otherProof = await tree.getProof(32);

    console.log(otherProof);
  });
});
