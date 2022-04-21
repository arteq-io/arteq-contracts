/*
 * This file is part of the contracts written for artèQ Investment Fund (https://github.com/arteq-io/arteq-contracts).
 * Copyright (c) 2022 artèQ (https://arteq.io)
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

import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract arteQCollection is ERC721URIStorage, IERC2981 {

    uint256 private _tokenIdCounter;
    bool private _publicMinting;
    uint16 private _adminCounter;

    mapping (address => uint8) _admins;
    mapping (address => uint8) _minters;

    address private _defaultRoyaltyWallet;
    uint256 private _defaultRoyaltyPercentage;
    mapping (uint256 => address) _royaltyWallets;
    mapping (uint256 => uint256) _royaltyPercentages;
    mapping (uint256 => uint8) _royaltyExempts;

    event AdminAdded(address newAdmin);
    event AdminRemoved(address removedAdmin);
    event MinterAdded(address newMinter);
    event MinterRemoved(address removedMinter);
    event PublicMintingChanged(bool newValue);
    event TokenURIChanged(uint256 tokenId);
    event RoyaltyWalletChanged(uint256 tokenId, address newWallet);
    event RoyaltyPercentageChanged(uint256 tokenId, uint256 newValue);
    event DefaultRoyaltyWalletChanged(address newWallet);
    event DefaultRoyaltyPercentageChanged(uint256 newValue);
    event TokenRoyaltyInfoChanged(uint256 tokenId, address royaltyWallet, uint256 royaltyPercentage);
    event TokenAddedToExemptionList(uint256 tokenId);
    event TokenRemovedFromExemptionList(uint256 tokenId);

    modifier onlyAdmin {
        require(_admins[msg.sender] == 1, "arteQCollection: must be admin");
        _;
    }

    modifier onlyMinter {
        require(_publicMinting || _minters[msg.sender] == 1, "arteQCollection: must be minter");
        _;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, IERC165) returns (bool) {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }

    constructor(
        string memory name,
        string memory symbol,
        address admin2,
        address admin3,
        address initDefaultRoyaltyWallet,
        uint256 initDefaultRoyaltyPercentage
    ) ERC721(name, symbol) {

        _tokenIdCounter = 1;

        _publicMinting = false;
        emit PublicMintingChanged(false);

        _adminCounter = 0;

        _safeAddAdmin(msg.sender);
        _safeAddAdmin(admin2);
        _safeAddAdmin(admin3);

        _addMinter(msg.sender);

        _defaultRoyaltyWallet = initDefaultRoyaltyWallet;
        emit DefaultRoyaltyWalletChanged(_defaultRoyaltyWallet);

        _defaultRoyaltyPercentage = initDefaultRoyaltyPercentage;
        emit DefaultRoyaltyPercentageChanged(_defaultRoyaltyPercentage);
    }

    function isAdmin(address account) external view returns (bool) {
        return _admins[account] == 1;
    }

    function nrAdmins() external view returns (uint16) {
        return _adminCounter;
    }

    function addAdmin(address newAdmin) external onlyAdmin {
        _safeAddAdmin(newAdmin);
    }

    function removeAdmin(address toBeRemovedAdmin) external onlyAdmin {
        _removeAdmin(toBeRemovedAdmin);
    }

    function isMinter(address account) external view returns (bool) {
        return _minters[account] == 1;
    }

    function addMinter(address newMinter) external onlyAdmin {
        require(_minters[newMinter] == 0, "arteQCollection: already a minter");
        _addMinter(newMinter);
    }

    function removeMinter(address toBeRemovedMinter) external onlyAdmin {
        require(_minters[toBeRemovedMinter] == 1, "arteQCollection: not a minter");
        _removeMinter(toBeRemovedMinter);
    }

    function publicMinting() external view returns (bool) {
        return _publicMinting;
    }

    function setPublicMinting(bool newValue) external onlyAdmin {
        bool isThisAChange = (newValue != _publicMinting);
        _publicMinting = newValue;
        if (isThisAChange) {
            emit PublicMintingChanged(newValue);
        }
    }

    function defaultRoyaltyWallet() external view returns (address) {
        return _defaultRoyaltyWallet;
    }

    // set zero address to disable default roylaties
    function setDefaultRoyaltyWallet(address newDefaultRoyaltyWallet) external onlyAdmin {
        _defaultRoyaltyWallet = newDefaultRoyaltyWallet;
        emit DefaultRoyaltyWalletChanged(newDefaultRoyaltyWallet);
    }

    function defaultRoyaltyPercentage() external view returns (uint256) {
        return _defaultRoyaltyPercentage;
    }

    // Set to zero in order to disable default royalties. Still, settings set per token work.
    function setDefaultRoyaltyPercentage(uint256 newDefaultRoyaltyPercentage) external onlyAdmin {
        require(newDefaultRoyaltyPercentage >= 0 && newDefaultRoyaltyPercentage <= 50, "arteQCollection: royalty percentage must be between 0 and 50 inclusive");
        _defaultRoyaltyPercentage = newDefaultRoyaltyPercentage;
        emit DefaultRoyaltyPercentageChanged(newDefaultRoyaltyPercentage);
    }

    function addTokenToRoyaltyExemptionList(uint256 tokenId) external onlyAdmin {
        require(_exists(tokenId), "arteQCollection: non-existing token");
        require(_royaltyExempts[tokenId] == 0, "arteQCollection: already exempt");
        _royaltyExempts[tokenId] = 1;
        emit TokenAddedToExemptionList(tokenId);
    }

    function removeTokenFromRoyaltyExemptionList(uint256 tokenId) external onlyAdmin {
        require(_exists(tokenId), "arteQCollection: non-existing token");
        require(_royaltyExempts[tokenId] == 1, "arteQCollection: not in exemption list");
        _royaltyExempts[tokenId] = 0;
        emit TokenRemovedFromExemptionList(tokenId);
    }

    function setTokenRoyaltyInfo(uint256 tokenId, address royaltyWallet, uint256 royaltyPercentage) external onlyAdmin {
        require(_exists(tokenId), "arteQCollection: non-existing token");
        require(royaltyPercentage >= 0 && royaltyPercentage <= 50, "arteQCollection: royalty percentage must be between 0 and 50 inclusive");
        _royaltyWallets[tokenId] = royaltyWallet;
        _royaltyPercentages[tokenId] = royaltyPercentage;
        emit TokenRoyaltyInfoChanged(tokenId, royaltyWallet, royaltyPercentage);
    }

    function royaltyInfo(uint256 tokenId, uint256 salePrice) external view virtual override returns (address, uint256) {
        require(_exists(tokenId), "arteQCollection: non-existing token");
        if (_royaltyExempts[tokenId] == 1) {
            return (address(0), 0);
        }
        address royaltyWallet = _royaltyWallets[tokenId];
        uint256 royaltyPercentage = _royaltyPercentages[tokenId];
        if (royaltyWallet == address(0) || royaltyPercentage == 0) {
            royaltyWallet = _defaultRoyaltyWallet;
            royaltyPercentage = _defaultRoyaltyPercentage;
        }
        if (royaltyWallet == address(0) || royaltyPercentage == 0) {
            return (address(0), 0);
        }
        uint256 royalty = (salePrice * royaltyPercentage) / 100;
        return (royaltyWallet, royalty);
    }

    function mint(string memory uri) external onlyMinter {
        _safeMintTo(msg.sender, uri);
    }

    function batchMint(string[] memory uris) external onlyMinter {
        for (uint256 i = 0; i < uris.length; i++) {
            string memory uri = uris[i];
            _safeMintTo(msg.sender, uri);
        }
    }

    function mintTo(address owner, string memory uri) external onlyMinter {
        _safeMintTo(owner, uri);
    }

    function batchMintTo(address owner, string[] memory uris) external onlyMinter {
        for (uint256 i = 0; i < uris.length; i++) {
            string memory uri = uris[i];
            _safeMintTo(owner, uri);
        }
    }

    function updateTokenURI(uint256 tokenId, string memory uri) external onlyAdmin {
        require(bytes(uri).length > 0, "arteQCollection: empty uri");
        _setTokenURI(tokenId, uri);
        emit TokenURIChanged(tokenId);
    }

    function batchUpdateTokenURI(uint256[] memory tokenIds, string[] memory uris) external onlyAdmin {
        require(tokenIds.length == uris.length, "arteQCollection: lengths do not match");
        for (uint256 i = 0; i < uris.length; i++) {
            uint256 tokenId = tokenIds[i];
            string memory uri = uris[i];
            require(bytes(uri).length > 0, "arteQCollection: empty uri");
            _setTokenURI(tokenId, uri);
            emit TokenURIChanged(tokenId);
        }
    }

    function burn(uint256 tokenId) external onlyAdmin {
        _burn(tokenId);
    }

    function _safeAddAdmin(address newAdmin) internal {
        require(newAdmin != address(0), "arteQCollection: cannot set zero address as admin");
        require(_admins[newAdmin] == 0, "arteQCollection: already an admin");
        _admins[newAdmin] = 1;
        _adminCounter += 1;
        emit AdminAdded(newAdmin);
    }

    function _removeAdmin(address toBeRemovedAdmin) internal {
        require(_adminCounter > 1, "arteQCollection: no more admin can be removed");
        require(_admins[toBeRemovedAdmin] == 1, "arteQCollection: not an admin");
        _admins[toBeRemovedAdmin] = 0;
        _adminCounter -= 1;
        emit AdminRemoved(toBeRemovedAdmin);
    }

    function _addMinter(address newMinter) internal {
        _minters[newMinter] = 1;
        emit MinterAdded(newMinter);
    }

    function _removeMinter(address toBeRemovedMinter) internal {
        _minters[toBeRemovedMinter] = 0;
        emit MinterRemoved(toBeRemovedMinter);
    }

    function _safeMintTo(address owner, string memory uri) internal {
        require(bytes(uri).length > 0, "arteQCollection: empty uri");
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter += 1;
        _safeMint(owner, tokenId);
        _setTokenURI(tokenId, uri);
        emit TokenURIChanged(tokenId);
    }

    receive() external payable {
        revert("arteQCollection: cannot accept ether");
    }

    fallback() external payable {
        revert("arteQCollection: cannot accept ether");
    }
}
