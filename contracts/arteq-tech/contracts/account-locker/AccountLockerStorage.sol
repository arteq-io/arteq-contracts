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

/// @author Kam Amini <kam@arteq.io>
///
/// @notice Use at your own risk. Just got the basic
///         idea from: https://github.com/solidstate-network/solidstate-solidity
library AccountLockerStorage {

    struct Layout {
        mapping (address => uint256) lockedAccounts;
        mapping(uint256 => uint256) extra;
    }

    // Storage Slot: 3098ce16a8ed1f68ea20f7694311e285057a167791ff47ba6baf41ca0c4e98a0
    bytes32 internal constant STORAGE_SLOT =
        keccak256("arteq-tech.contracts.account-locker.storage");

    function layout() internal pure returns (Layout storage s) {
        bytes32 slot = STORAGE_SLOT;
        /* solhint-disable no-inline-assembly */
        assembly {
            s.slot := slot
        }
        /* solhint-enable no-inline-assembly */
    }
}
