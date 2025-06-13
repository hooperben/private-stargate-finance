// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./utils/Poseidon2.sol";

contract PoseidonMerkleTree {
    using Field for *;

    uint256 public constant MAX_VALUE = Field.PRIME;
    uint256 public constant INITIAL_ROOT = Field.PRIME_DIV_2; // TODO make real root value

    // filledSubtrees and roots could be bytes32[size], but using mappings makes it cheaper because
    // it removes index range check on every interaction
    mapping(uint256 => uint256) public filledSubtrees;
    mapping(uint256 => uint256) public roots;

    uint256 public immutable height; // 12

    uint32 public constant ROOT_HISTORY_SIZE = 100;
    uint32 public currentRootIndex = 0;
    uint256 public nextIndex = 0;

    uint256 public MAX_LEAF_INDEX;

    Poseidon2 poseidon2Hasher;

    constructor(uint256 _height) {
        height = _height;
        MAX_LEAF_INDEX = 2 ** (_height - 1);

        poseidon2Hasher = new Poseidon2();
    }

    function zeros(uint256 height) public pure returns (uint256) {
        return 0;
    }

    function _insert(uint256 _leaf) internal returns (uint256 index) {
        uint256 insertIndex = nextIndex;
        require(insertIndex != MAX_LEAF_INDEX, "Tree Full");

        uint256 currentIndex = insertIndex;
        uint256 currentHash = _leaf;

        uint256 left;
        uint256 right;

        for (uint256 i = 0; i < height; i++) {
            if (currentIndex % 2 == 0) {
                left = currentHash;
                right = zeros(i);
            } else {
                left = filledSubtrees[i];
                right = currentHash;
            }
            // set the levels hash
            currentHash = hashLeftRight(left, right);
            // move up the tree
            currentIndex /= 2;
        }

        uint32 newRootIndex = (currentRootIndex + 1) % ROOT_HISTORY_SIZE;
        currentRootIndex = newRootIndex;

        // the above for loop stops at the top level, i.e the root
        roots[newRootIndex] = currentHash;

        nextIndex = insertIndex + 1; // Increment nextIndex based on the original insertion index

        return insertIndex; // Return the index where this leaf was inserted
    }

    function hashLeftRight(
        uint256 _left,
        uint256 _right
    ) public view returns (uint256) {
        return
            poseidon2Hasher
                .hash_2(uint256(_left).toField(), uint256(_right).toField())
                .toUint256();
    }
}
