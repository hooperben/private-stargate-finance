// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {OApp, Origin, MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import "./PoseidonMerkleTree.sol";

contract PrivateStargateOApp is PoseidonMerkleTree, OApp {
    constructor(
        address _endpoint,
        address _owner
    ) PoseidonMerkleTree(12) OApp(_endpoint, _owner) Ownable(_owner) {}

    function _lzReceive(
        Origin calldata,
        bytes32,
        bytes calldata payload,
        address, // Executor address as specified by the OApp.
        bytes calldata // Any extra data or options to trigger on receipt.
    ) internal override {
        // Decode the payload as uint256[]
        uint256[] memory notes = abi.decode(payload, (uint256[]));

        // Insert each note into the Merkle tree
        for (uint256 i = 0; i < notes.length; i++) {
            _insert(notes[i]);
        }
    }
}
