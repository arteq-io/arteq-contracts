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

import "./TaskExecutor.sol";

/// @author Kam Amini <kam@arteq.io>
///
/// @notice Use at your own risk
abstract contract RoleManager is TaskExecutor {

    mapping (uint256 => mapping(address => bool)) private _roles;

    event RoleGrant(uint256 role, address account);
    event RoleRevoke(uint256 role, address account);

    modifier mustHaveRole(uint256 role) {
        require(_hasRole(msg.sender, role), "RM: missing role");
        _;
    }

    function hasRole(
        address account,
        uint256 role
    ) external view returns (bool) {
        return _hasRole(account, role);
    }

    function grantRole(
        uint256 taskId,
        address account,
        uint256 role
    ) external
      tryExecuteTaskAfterwards(taskId)
    {
        _grantRole(account, role);
    }

    function revokeRole(
        uint256 taskId,
        address account,
        uint256 role
    ) external
      tryExecuteTaskAfterwards(taskId)
    {
        _revokeRole(account, role);
    }

    function _hasRole(
        address account,
        uint256 role
    ) internal view returns (bool) {
        return _roles[role][account];
    }

    function _grantRole(
        address account,
        uint256 role
    ) internal {
        require(!_roles[role][account], "RM: already has role");
        _roles[role][account] = true;
        emit RoleGrant(role, account);
    }

    function _revokeRole(
        address account,
        uint256 role
    ) internal {
        require(_roles[role][account], "RM: does not have role");
        _roles[role][account] = false;
        emit RoleRevoke(role, account);
    }
}
