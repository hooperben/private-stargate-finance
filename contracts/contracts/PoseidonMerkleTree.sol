// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./utils/Poseidon2.sol";

contract PoseidonMerkleTree {
    using Field for *;

    // The root of a poseidon2 merkle tree with height 12 and all leaf nodes filled with:
    // EMPTY_LEAF = keccak256(abi.encodePacked("TANGERINE")) % FIELD_MODULUS
    uint256 public constant INITIAL_ROOT =
        0x124005ad54174bbcb8c2dd053ea318daa80106cdcc518731504b771d6006123f;

    // The maximum field that can be hashed in our poseidon2 order
    uint256 public constant MAX_VALUE = Field.PRIME;

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

    function zeros(uint256 i) public pure returns (uint256) {
        if (i == 0) {
            // Base ZERO_VALUE: keccak256(abi.encodePacked("TANGERINE")) % FIELD_MODULUS
            return
                uint256(
                    0x1e2856f9f722631c878a92dc1d84283d04b76df3e1831492bdf7098c1e65e478
                );
        } else if (i == 1) {
            return
                uint256(
                    0x2c2eecb1b14035bfd9765e84195684b401a84fdb58c3c03f1bcea86dcf0c8105
                );
        } else if (i == 2) {
            return
                uint256(
                    0x237e412a71db31e5769f63d92346a09dd0f30b9c335e9d9aa96b6625eb537445
                );
        } else if (i == 3) {
            return
                uint256(
                    0x0b3ff120d61a7de2da3d80ff99d393796805c74be5c39e8a4c7436d1c65dad4c
                );
        } else if (i == 4) {
            return
                uint256(
                    0x0fc58e21665302678bef68714d9e5889583071f7bd3cf018b64fafc51b0a9cf3
                );
        } else if (i == 5) {
            return
                uint256(
                    0x235df7c585524ed8a26aea20a0fb168038f10df71d84720c9a8c1b3e78e3b6cd
                );
        } else if (i == 6) {
            return
                uint256(
                    0x1c6cabee394ea24dc09eab1788f7f62b367e95789f883e33690d94215d819264
                );
        } else if (i == 7) {
            return
                uint256(
                    0x09bec327ab2c8dda5d2d435cd267cb21e71f21371a01739885817eb1625d8976
                );
        } else if (i == 8) {
            return
                uint256(
                    0x2d35519ad7061578be50cbbfe040327843f6b4cdf1458e01b5f9737dbaf82b18
                );
        } else if (i == 9) {
            return
                uint256(
                    0x0f86c9e9c9e689394a4944bb87291a3f55cc930b21432fccf41b8267f1a98d6f
                );
        } else if (i == 10) {
            return
                uint256(
                    0x181c9ba70900093b180c96f55cc2b1d73d60b8ab613344cbba83b33cbcc94e2b
                );
        } else {
            revert("Index out of bounds");
        }
    }

    event LeafInserted(uint256 indexed leafIndex, uint256 indexed leafValue);

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

        emit LeafInserted(insertIndex, currentHash);

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
