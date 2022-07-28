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

import "./AccountLockerStorage.sol";

/// @author Kam Amini <kam@arteq.io>
///
/// @notice Use at your own risk
library AccountLockerInternal {

    event LockTsChanged(address account, uint256 lockTimestamp);

    function _getLockTs(address account) internal view returns (uint256) {
        return __s().lockedAccounts[account];
    }

    function _updateLockTs(address account, uint256 lockTs) internal {
        uint256 oldLockTs = __s().lockedAccounts[account];
        __s().lockedAccounts[account] = lockTs;
        if (oldLockTs != lockTs) {
            emit LockTsChanged(account, lockTs);
        }
    }

    function _isLocked(address account) internal view returns (bool) {
        uint256 lockTs = _getLockTs(account);
        /* solhint-disable not-rely-on-time */
        return lockTs > 0 && block.timestamp <= lockTs;
    }

    function __s() private pure returns (AccountLockerStorage.Layout storage) {
        return AccountLockerStorage.layout();
    }
}
