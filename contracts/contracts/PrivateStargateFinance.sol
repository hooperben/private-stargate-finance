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

uint256 constant NOTES_INPUT_LENGTH = 3;

uint256 constant EXIT_ASSET_INDEX = 1;
uint256 constant EXIT_AMOUNT_INDEX = 2;
uint256 constant EXIT_ADDRESSES_INDEX = 3;
uint256 constant EXIT_ADDRESS_HASHES_INDEX = 4;

contract PrivateStargateFinance is PrivateStargateOApp {
    DepositVerifier public depositVerifier;
    TransferVerifier public transferVerifier;
    WithdrawVerifier public withdrawVerifier;
    WarpVerifier public warpVerifier;

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
    }

    function deposit(
        address _erc20,
        uint64 _amount, // !dev no exponent here
        bytes calldata _proof,
        bytes32[] calldata _publicInputs,
        bytes calldata _payload // TODO make this real
    ) public {
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

        require(
            _erc20 == address(uint160(uint256(_publicInputs[1]))),
            "ERC20 address mismatch"
        );

        require(
            _amount == uint64(uint256(_publicInputs[2])),
            "Address amount incorrect"
        );

        // insert note into the tree
        _insert(uint256(_publicInputs[0]));
    }

    event NullifierUsed(uint256 indexed nullifier);

    function transfer(
        bytes calldata _proof,
        bytes32[] calldata _publicInputs
    ) public {
        // verify the proof
        bool isValidProof = transferVerifier.verify(_proof, _publicInputs);
        require(isValidProof, "Invalid transfer proof");

        // if proof is valid, write nullifiers as spent
        for (uint256 i = 0; i < NOTES_INPUT_LENGTH - 1; i++) {
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
            uint256 i = NOTES_INPUT_LENGTH;
            i < NOTES_INPUT_LENGTH * 2 - 1;
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
        // Verify the withdrawal proof
        bool isValidProof = withdrawVerifier.verify(_proof, _publicInputs);
        require(isValidProof, "Invalid withdraw proof");

        // Mark nullifiers as spent
        for (uint256 i = 0; i < NOTES_INPUT_LENGTH - 1; i++) {
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

        // Process withdrawals
        for (uint256 i = 0; i < NOTES_INPUT_LENGTH - 1; i++) {
            uint256 assetIndex = EXIT_ASSET_INDEX * NOTES_INPUT_LENGTH + i;
            uint256 amountIndex = EXIT_AMOUNT_INDEX * NOTES_INPUT_LENGTH + i;
            uint256 addressIndex = EXIT_ADDRESSES_INDEX *
                NOTES_INPUT_LENGTH +
                i;

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
        uint256[] memory notes,
        bytes calldata _options
    ) public payable {
        bytes memory _payload = abi.encode(notes);
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
