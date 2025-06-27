// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import "../PrivateStargateOApp.sol";
import "../StargateSenderBase.sol";

uint256 constant NOTES_INPUT_LENGTH = 3;

contract SenderAndWrite is PrivateStargateOApp, StargateSenderBase {
    constructor(
        address _endpoint,
        address _owner
    ) PrivateStargateOApp(_endpoint, _owner) {}

    function tester(
        uint32 _dstEid,
        bytes calldata _options,
        bytes32[] calldata _publicInputs
    ) public {
        uint256[] memory finalNotes = _extractOutputHashes(_publicInputs);
        // send the note hashes to insert through LZ
        bytes memory _payload = abi.encode(finalNotes);
        _lzSend(
            _dstEid,
            _payload,
            _options,
            // Fee in native gas and ZRO token.
            MessagingFee(msg.value, 0),
            // Refund address in case of failed source message.
            payable(address(this))
        );

        // get the address of private stargate finance on the remote chain
        bytes32 peer = peers[_dstEid];

        // send the stargate assets to the PSF on the remote chain
        _sendStargateAssets(_dstEid, peer, _publicInputs, _options);
    }

    fallback() external payable {}

    receive() external payable {}

    function _extractOutputHashes(
        bytes32[] calldata _publicInputs
    ) internal pure returns (uint256[] memory) {
        uint256[] memory notes = new uint256[](NOTES_INPUT_LENGTH);
        uint256 noteCount = 0;

        for (uint256 i = 4; i <= 6; i++) {
            // output hashes are at indices 4-6
            if (_publicInputs[i] != bytes32(0)) {
                notes[noteCount] = uint256(_publicInputs[i]);
                noteCount++;
            }
        }

        // Resize notes array to actual count
        uint256[] memory finalNotes = new uint256[](noteCount);
        for (uint256 i = 0; i < noteCount; i++) {
            finalNotes[i] = notes[i];
        }

        return finalNotes;
    }
}
