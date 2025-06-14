import { Fr } from "@aztec/foundation/fields";
import { poseidon2Hash } from "@aztec/foundation/crypto";

export class PoseidonMerkleTree {
  private levels: number;
  private hashMap: Map<string, Fr>;
  private defaultNodes: Fr[];

  constructor(levels: number) {
    this.levels = levels;
    this.hashMap = new Map();
    this.defaultNodes = new Array(levels);
    this.initializeDefaultNodes();
  }

  private async initializeDefaultNodes() {
    // Initialize with zero value
    this.defaultNodes[0] = Fr.fromString("0");

    // Calculate default nodes for each level
    for (let i = 1; i < this.levels; i++) {
      this.defaultNodes[i] = await poseidon2Hash([
        this.defaultNodes[i - 1],
        this.defaultNodes[i - 1],
      ]);
    }
  }

  private getKey(level: number, index: number): string {
    return `${level}:${index}`;
  }

  public async insert(leaf: bigint | string, index: number) {
    if (index < 0 || index >= 2 ** this.levels) {
      throw new Error("Leaf index out of bounds");
    }

    // Convert input to Fr type
    let value =
      typeof leaf === "string"
        ? Fr.fromString(leaf)
        : Fr.fromString(leaf.toString());

    // Insert leaf
    let currentIndex = index;
    let currentHash = value;
    this.hashMap.set(this.getKey(0, currentIndex), currentHash);

    // Calculate parent nodes
    for (let i = 0; i < this.levels - 1; i++) {
      const isLeft = currentIndex % 2 === 0;
      const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;
      const siblingKey = this.getKey(i, siblingIndex);

      let sibling = this.hashMap.get(siblingKey);
      if (!sibling) {
        sibling = this.defaultNodes[i];
      }

      // Calculate parent hash
      currentHash = await poseidon2Hash(
        isLeft ? [currentHash, sibling] : [sibling, currentHash],
      );

      // Move up one level
      currentIndex = Math.floor(currentIndex / 2);
      this.hashMap.set(this.getKey(i + 1, currentIndex), currentHash);
    }
  }

  public async getRoot(): Promise<Fr> {
    const rootKey = this.getKey(this.levels - 1, 0);
    const root = this.hashMap.get(rootKey);
    return root || this.defaultNodes[this.levels - 1];
  }

  public async getProof(
    index: number,
  ): Promise<{ siblings: Fr[]; indices: number[] }> {
    if (index < 0 || index >= 2 ** this.levels) {
      throw new Error("Leaf index out of bounds");
    }

    const siblings: Fr[] = [];
    const indices: number[] = [];
    let currentIndex = index;

    for (let i = 0; i < this.levels - 1; i++) {
      const isLeft = currentIndex % 2 === 0;
      const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;
      const siblingKey = this.getKey(i, siblingIndex);

      let sibling = this.hashMap.get(siblingKey);
      if (!sibling) {
        sibling = this.defaultNodes[i];
      }

      siblings.push(sibling);
      indices.push(isLeft ? 1 : 0);
      currentIndex = Math.floor(currentIndex / 2);
    }

    return { siblings, indices };
  }

  public static async verifyProof(
    root: Fr,
    leaf: bigint | string,
    proof: { siblings: Fr[]; indices: number[] },
  ): Promise<boolean> {
    let value =
      typeof leaf === "string"
        ? Fr.fromString(leaf)
        : Fr.fromString(leaf.toString());
    let currentHash = value;

    for (let i = 0; i < proof.siblings.length; i++) {
      currentHash = await poseidon2Hash(
        proof.indices[i] === 0
          ? [proof.siblings[i], currentHash]
          : [currentHash, proof.siblings[i]],
      );
    }

    return currentHash.equals(root);
  }

  public async getLeafValue(leafIndex: number): Promise<Fr> {
    if (leafIndex < 0 || leafIndex >= 2 ** this.levels) {
      throw new Error("Leaf index out of bounds");
    }

    // Get the leaf value from the hashMap at level 0
    const leafKey = this.getKey(0, leafIndex);
    const leafValue = this.hashMap.get(leafKey);

    // If the leaf doesn't exist in the hashMap, return the default value (zero)
    return leafValue || this.defaultNodes[0];
  }
}
