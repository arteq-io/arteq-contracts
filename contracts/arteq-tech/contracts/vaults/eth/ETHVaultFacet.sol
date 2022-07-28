/*
 * This file is part of the artèQ Technologies contracts (https://github.com/arteq-tech/contracts).
 * Copyright (c) 2022 artèQ Technologies (https://arteq.tech)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
// SPDX-License-Identifier: GNU General Public License v3.0

pragma solidity 0.8.1;

import "../../security/role-manager/RoleManagerLib.sol";
import "../VaultsConfig.sol";
import "./ETHVaultInternal.sol";

/// @author Kam Amini <kam@arteq.io>
///
/// @notice Use at your own risk
contract ETHVaultFacet {

    modifier onlyVaultAdmin {
        RoleManagerLib._checkRole(VaultsConfig.ROLE_VAULT_ADMIN);
        _;
    }

    function isDepositEnabled() external view returns (bool) {
        return ETHVaultInternal._isDepositEnabled();
    }

    function setEnableDeposit(bool enableDeposit) external onlyVaultAdmin {
        ETHVaultInternal._setEnableDeposit(enableDeposit);
    }

    /* solhint-disable func-name-mixedcase */
    function ETHTransfer(
        address to,
        uint256 amount
    ) external onlyVaultAdmin {
        ETHVaultInternal._ETHTransfer(to, amount);
    }
}
