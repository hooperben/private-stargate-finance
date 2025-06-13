// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./utils/Poseidon2.sol";

contract PoseidonTest {
    using Field for *;

    Poseidon2 poseidon2Hasher;

    constructor() {
        poseidon2Hasher = new Poseidon2();
    }

    function poseidonHash2(uint256 x, uint256 y) public view returns (bytes32) {
        uint256 test_hash = poseidon2Hasher
            .hash_2(uint256(x).toField(), uint256(y).toField())
            .toUint256();

        return bytes32(test_hash);
    }
}
