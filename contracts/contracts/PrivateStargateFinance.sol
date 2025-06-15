// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./PrivateStargateOApp.sol";

import {DepositVerifier} from "./verifiers/DepositVerifier.sol";
import {TransferVerifier} from "./verifiers/TransferVerifier.sol";
import {WithdrawVerifier} from "./verifiers/WithdrawVerifier.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract PrivateStargateFinance is PrivateStargateOApp {
    DepositVerifier public depositVerifier;
    TransferVerifier public transferVerifier;
    WithdrawVerifier public withdrawVerifier;

    constructor(
        address _endpoint,
        address _owner,
        address _depositVerifier,
        address _transferVerifier,
        address _withdrawVerifier
    ) Ownable(_owner) PrivateStargateOApp(_endpoint, _owner) {
        depositVerifier = DepositVerifier(_depositVerifier);
        transferVerifier = TransferVerifier(_transferVerifier);
        withdrawVerifier = WithdrawVerifier(_withdrawVerifier);
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

    function transfer() public {}
}
