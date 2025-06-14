// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./PrivateStargateOApp.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "hardhat/console.sol";

contract PrivateStargateFinance is PrivateStargateOApp {
    constructor(
        address _endpoint,
        address _owner
    ) PrivateStargateOApp(_endpoint, _owner) {}

    function deposit(
        address _erc20,
        uint256 _amount, // !dev no exponent here
        bytes calldata _proof,
        bytes32[] calldata _publicInputs,
        bytes calldata _payload
    ) public {
        // uint8 decimals = ERC20(_erc20).decimals();

        // bool depositTransfer = ERC20(_erc20).transferFrom(
        //     msg.sender,
        //     address(this),
        //     _amount * 10 ** decimals
        // );

        // require(depositTransfer, "failed to transfer");

        // VERIFY PROOF

        // INSERT INTO TREE
        _insert(uint256(_publicInputs[0]));
    }
}
