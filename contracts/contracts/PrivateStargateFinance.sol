// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./PrivateStargateOApp.sol";

import {DepositVerifier} from "./verifiers/DepositVerifier.sol";
import {TransferVerifier} from "./verifiers/TransferVerifier.sol";
import {WithdrawVerifier} from "./verifiers/WithdrawVerifier.sol";
import {WarpVerifier} from "./verifiers/WarpVerifier.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

uint256 constant NOTES_INPUT_LENGTH = 3;

uint256 constant EXIT_ASSET_INDEX = 1;
uint256 constant EXIT_AMOUNT_INDEX = 2;
uint256 constant EXIT_ADDRESSES_INDEX = 3;
uint256 constant EXIT_ADDRESS_HASHES_INDEX = 4;

uint256 constant EXIT_ASSET_START_INDEX = 4;
uint256 constant EXIT_AMOUNT_START_INDEX = 7;
uint256 constant EXIT_ADDRESSES_START_INDEX = 10;

contract PrivateStargateFinance is PrivateStargateOApp, AccessControl {
    DepositVerifier public depositVerifier;
    TransferVerifier public transferVerifier;
    WithdrawVerifier public withdrawVerifier;
    WarpVerifier public warpVerifier;

    bytes32 public DEPOSIT_ROLE = keccak256("DEPOSIT_ROLE");

    mapping(bytes32 => bool) public nullifierUsed;

    constructor(
        address _endpoint,
        address _owner,
        address _depositVerifier,
        address _transferVerifier,
        address _withdrawVerifier,
        address _warpVerifier
    ) Ownable(_owner) PrivateStargateOApp(_endpoint, _owner) {
        depositVerifier = DepositVerifier(_depositVerifier);
        transferVerifier = TransferVerifier(_transferVerifier);
        withdrawVerifier = WithdrawVerifier(_withdrawVerifier);
        warpVerifier = WarpVerifier(_warpVerifier);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DEPOSIT_ROLE, msg.sender);
    }

    function deposit(
        address _erc20,
        uint64 _amount, // !dev no exponent here
        bytes calldata _proof,
        bytes32[] calldata _publicInputs,
        bytes calldata _payload // TODO make this real
    ) public onlyRole(DEPOSIT_ROLE) {
        uint8 decimals = ERC20(_erc20).decimals();
        bool depositTransfer = ERC20(_erc20).transferFrom(
            msg.sender,
            address(this),
            _amount * 10 ** decimals
        );

        require(depositTransfer, "failed to transfer deposit");

        // VERIFY PROOF
        bool isValidProof = depositVerifier.verify(_proof, _publicInputs);
        require(isValidProof, "Invalid deposit proof!");

        // CHECK INPUT ADDRESS AND AMOUNT MATCH PROOF INPUTS
        require(
            _erc20 == address(uint160(uint256(_publicInputs[1]))),
            "ERC20 address mismatch"
        );
        require(
            _amount == uint64(uint256(_publicInputs[2])),
            "Address amount incorrect"
        );

        // INSERT NOTE INTO TREE
        _insert(uint256(_publicInputs[0]));
    }

    event NullifierUsed(uint256 indexed nullifier);

    function transfer(
        bytes calldata _proof,
        bytes32[] calldata _publicInputs
    ) public {
        // verify the root is in the trees history
        require(isKnownRoot(uint256(_publicInputs[0])), "Invalid Root!");

        // verify the proof
        bool isValidProof = transferVerifier.verify(_proof, _publicInputs);
        require(isValidProof, "Invalid transfer proof");

        // if proof is valid, write nullifiers as spent
        for (uint256 i = 1; i < NOTES_INPUT_LENGTH + 1; i++) {
            if (_publicInputs[i] != bytes32(0)) {
                // check not spent
                require(
                    nullifierUsed[_publicInputs[i]] == false,
                    "Nullifier already spent"
                );
                // mark as spent
                nullifierUsed[_publicInputs[i]] = true;

                emit NullifierUsed(uint256(_publicInputs[i]));
            }
        }

        // and insert output note commitments
        for (
            uint256 i = NOTES_INPUT_LENGTH + 1;
            i < NOTES_INPUT_LENGTH + 1 + NOTES_INPUT_LENGTH;
            i++
        ) {
            if (_publicInputs[i] != bytes32(0)) {
                _insert(uint256(_publicInputs[i]));
            }
        }
    }

    function withdraw(
        bytes calldata _proof,
        bytes32[] calldata _publicInputs
    ) public {
        require(isKnownRoot(uint256(_publicInputs[0])), "Invalid Root!");
        // Verify the withdrawal proof
        bool isValidProof = withdrawVerifier.verify(_proof, _publicInputs);
        require(isValidProof, "Invalid withdraw proof");

        // Mark nullifiers as spent - FIX: include all 3 nullifiers
        for (uint256 i = 1; i <= NOTES_INPUT_LENGTH; i++) {
            if (_publicInputs[i] != bytes32(0)) {
                // check not spent
                require(
                    nullifierUsed[_publicInputs[i]] == false,
                    "Nullifier already spent"
                );
                // mark as spent
                nullifierUsed[_publicInputs[i]] = true;

                emit NullifierUsed(uint256(_publicInputs[i]));
            }
        }

        // Process withdrawals - FIX: correct index calculations
        for (uint256 i = 0; i < NOTES_INPUT_LENGTH; i++) {
            uint256 assetIndex = EXIT_ASSET_START_INDEX + i;
            uint256 amountIndex = EXIT_AMOUNT_START_INDEX + i;
            uint256 addressIndex = EXIT_ADDRESSES_START_INDEX + i;

            address exitAsset = address(
                uint160(uint256(_publicInputs[assetIndex]))
            );
            uint256 exitAmount = uint256(_publicInputs[amountIndex]);
            address exitAddress = address(
                uint160(uint256(_publicInputs[addressIndex]))
            );

            if (exitAmount > 0) {
                // Get token decimals and calculate actual amount to transfer
                uint8 decimals = ERC20(exitAsset).decimals();
                uint256 actualAmount = exitAmount * 10 ** decimals;

                // Transfer tokens to the exit address
                bool success = ERC20(exitAsset).transfer(
                    exitAddress,
                    actualAmount
                );
                require(success, "Token transfer failed");
            }
        }
    }

    function warp(
        uint32 _dstEid,
        bytes calldata _proof,
        bytes32[] calldata _publicInputs,
        bytes calldata _options
    ) public payable {
        // verify root is in the history of the tree
        require(isKnownRoot(uint256(_publicInputs[0])), "Invalid Root!");

        // verify the warp proof
        bool isValidProof = warpVerifier.verify(_proof, _publicInputs);
        require(isValidProof, "Invalid warp proof");

        // publicInputs layout:
        // 0 = root
        // 1 - 3 = nullifiers
        // 4 - 6 = output hashes
        // 7 - 9 = stargate asset addresses
        // 10 - 12 = stargate amounts

        // Mark nullifiers as spent
        for (uint256 i = 1; i <= NOTES_INPUT_LENGTH; i++) {
            if (_publicInputs[i] != bytes32(0)) {
                require(
                    nullifierUsed[_publicInputs[i]] == false,
                    "Nullifier already spent"
                );
                nullifierUsed[_publicInputs[i]] = true;
                emit NullifierUsed(uint256(_publicInputs[i]));
            }
        }

        // Extract non-zero output hashes for cross-chain payload
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

        // TODO: send the stargate asset through stargate based on indices 7-12

        // send the note hashes to insert through LZ
        bytes memory _payload = abi.encode(finalNotes);
        _lzSend(
            _dstEid,
            _payload,
            _options,
            // Fee in native gas and ZRO token.
            MessagingFee(msg.value, 0),
            // Refund address in case of failed source message.
            payable(msg.sender)
        );
    }
}
