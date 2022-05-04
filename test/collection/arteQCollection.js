/*
 * This file is part of the contracts written for artèQ Investment Fund (https://github.com/arteq-io/contracts).
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

const { expect } = require("chai");
const { ethers } = require("hardhat");

const zeroAddress = "0x0000000000000000000000000000000000000000";

describe("arteQCollection", function() {

    var deployer, minter, user;

    beforeEach(async () => {

      [
        deployer,
        admin2,
        admin3,
        minter,
        user,
        royalty,
        royalty2,
      ] = await ethers.getSigners();

      const arteQCollectionContract = await ethers.getContractFactory("arteQCollection", deployer);
      contract = await arteQCollectionContract.deploy(
        "arteQCollection",
        "ARTEQ-COLLECTION",
        admin2.address,
        admin3.address,
        royalty.address,
        15
      );
      await contract.deployed();

      deployReceipt = await contract.deployTransaction.wait();
      expect(deployReceipt.logs.length).to.equal(7);
      await expect(contract.deployTransaction).to.emit(contract, "AdminAdded").withArgs(deployer.address);
      await expect(contract.deployTransaction).to.emit(contract, "AdminAdded").withArgs(admin2.address);
      await expect(contract.deployTransaction).to.emit(contract, "AdminAdded").withArgs(admin3.address);
      await expect(contract.deployTransaction).to.emit(contract, "MinterAdded").withArgs(deployer.address);
      await expect(contract.deployTransaction).to.emit(contract, "PublicMintingChanged").withArgs(false);
      await expect(contract.deployTransaction).to.emit(contract, "DefaultRoyaltyWalletChanged").withArgs(royalty.address);
      await expect(contract.deployTransaction).to.emit(contract, "DefaultRoyaltyPercentageChanged").withArgs(15);

      expect(await contract.connect(user).publicMinting()).to.equal(false);
      expect(await contract.connect(user).name()).to.equal("arteQCollection");
      expect(await contract.connect(user).symbol()).to.equal("ARTEQ-COLLECTION");
      expect(await contract.connect(user).nrAdmins()).to.equal(3);
      expect(await contract.connect(user).defaultRoyaltyWallet()).to.equal(royalty.address);
      expect(await contract.connect(user).defaultRoyaltyPercentage()).to.equal(15);

      expect(await contract.connect(user).isAdmin(deployer.address)).to.equal(true);
      expect(await contract.connect(user).isMinter(deployer.address)).to.equal(true);

      expect(await contract.connect(user).isAdmin(admin2.address)).to.equal(true);
      expect(await contract.connect(user).isMinter(admin2.address)).to.equal(false);

      expect(await contract.connect(user).isAdmin(admin3.address)).to.equal(true);
      expect(await contract.connect(user).isMinter(admin3.address)).to.equal(false);

      expect(await contract.connect(user).isAdmin(minter.address)).to.equal(false);
      expect(await contract.connect(user).isMinter(minter.address)).to.equal(false);

      expect(await contract.connect(user).isAdmin(user.address)).to.equal(false);
      expect(await contract.connect(user).isMinter(user.address)).to.equal(false);

      // reset royalty info
      await contract.connect(deployer).setDefaultRoyaltyWallet(zeroAddress);
      await contract.connect(deployer).setDefaultRoyaltyPercentage(0);
      expect(await contract.connect(user).defaultRoyaltyWallet()).to.equal(zeroAddress);
      expect(await contract.connect(user).defaultRoyaltyPercentage()).to.equal(0);
    });

    it("should not accept ether", async() => {
      await expect(user.sendTransaction({
        to: contract.address,
        value: ethers.utils.parseEther("1"),
      })).to.be.revertedWith("arteQCollection: cannot accept ether");
    });

    it("[addAdmin] cannot be called by a non-admin account", async () => {
      await expect(contract.connect(minter).addAdmin(minter.address)).to.be.revertedWith("arteQCollection: must be admin");
      await expect(contract.connect(user).addAdmin(minter.address)).to.be.revertedWith("arteQCollection: must be admin");
    });

    it("[addAdmin] must fail when adding zero address as an admin account", async () => {
      await expect(contract.connect(deployer).addAdmin(zeroAddress)).to.be.revertedWith("arteQCollection: cannot set zero address as admin");
    });

    it("[addAdmin] must fail when adding an already admin account", async () => {
      await expect(contract.connect(deployer).addAdmin(admin3.address)).to.be.revertedWith("arteQCollection: already an admin");
    });

    it("[addAdmin] successfully add an admin", async () => {
      expect(await contract.connect(user).isAdmin(user.address)).to.equal(false);
      expect(await contract.connect(user).isMinter(user.address)).to.equal(false);

      // deployer is admin
      const call = contract.connect(deployer).addAdmin(user.address);
      const tx = await call;
      const receipt = await tx.wait();
      expect(receipt.logs.length).to.equal(1);
      await expect(call).to.emit(contract, "AdminAdded").withArgs(user.address);

      // user is admin now
      expect(await contract.connect(user).isAdmin(user.address)).to.equal(true);
      expect(await contract.connect(user).isMinter(user.address)).to.equal(false);
    });

    it("[removeAdmin] cannot be called by a non-admin account", async () => {
      await expect(contract.connect(minter).removeAdmin(minter.address)).to.be.revertedWith("arteQCollection: must be admin");
      await expect(contract.connect(user).removeAdmin(minter.address)).to.be.revertedWith("arteQCollection: must be admin");
    });

    it("[removeAdmin] must fail when removing an already non-admin account", async () => {
      await expect(contract.connect(deployer).removeAdmin(user.address)).to.be.revertedWith("arteQCollection: not an admin");
    });

    it("[removeAdmin] successfully remove an admin", async () => {
      expect(await contract.connect(user).nrAdmins()).to.equal(3);
      expect(await contract.connect(user).isAdmin(deployer.address)).to.equal(true);
      expect(await contract.connect(user).isAdmin(admin2.address)).to.equal(true);
      expect(await contract.connect(user).isAdmin(admin3.address)).to.equal(true);

      const call = contract.connect(admin2).removeAdmin(admin3.address);
      const tx = await call;
      const receipt = await tx.wait();
      expect(receipt.logs.length).to.equal(1);
      await expect(call).to.emit(contract, "AdminRemoved").withArgs(admin3.address);

      expect(await contract.connect(user).nrAdmins()).to.equal(2);
      expect(await contract.connect(user).isAdmin(deployer.address)).to.equal(true);
      expect(await contract.connect(user).isAdmin(admin2.address)).to.equal(true);
      expect(await contract.connect(user).isAdmin(admin3.address)).to.equal(false);
    });

    it("[removeAdmin] cannot remove last admin", async () => {
      expect(await contract.connect(user).nrAdmins()).to.equal(3);
      expect(await contract.connect(user).isAdmin(deployer.address)).to.equal(true);
      expect(await contract.connect(user).isAdmin(admin2.address)).to.equal(true);
      expect(await contract.connect(user).isAdmin(admin3.address)).to.equal(true);
      await contract.connect(admin2).removeAdmin(admin3.address);

      expect(await contract.connect(user).nrAdmins()).to.equal(2);
      expect(await contract.connect(user).isAdmin(deployer.address)).to.equal(true);
      expect(await contract.connect(user).isAdmin(admin2.address)).to.equal(true);
      expect(await contract.connect(user).isAdmin(admin3.address)).to.equal(false);
      await contract.connect(admin2).removeAdmin(deployer.address);

      expect(await contract.connect(user).nrAdmins()).to.equal(1);
      expect(await contract.connect(user).isAdmin(deployer.address)).to.equal(false);
      expect(await contract.connect(user).isAdmin(admin2.address)).to.equal(true);
      expect(await contract.connect(user).isAdmin(admin3.address)).to.equal(false);
      await expect(contract.connect(admin2).removeAdmin(admin2.address)).to.be.revertedWith("arteQCollection: no more admin can be removed");
    });

    it("[addMinter] cannot be called by a non-admin account", async () => {
      await expect(contract.connect(minter).addMinter(minter.address)).to.be.revertedWith("arteQCollection: must be admin");
      await expect(contract.connect(user).addMinter(minter.address)).to.be.revertedWith("arteQCollection: must be admin");
    });

    it("[addMinter] successfully add a minter", async () => {
      expect(await contract.connect(user).isAdmin(user.address)).to.equal(false);
      expect(await contract.connect(user).isMinter(user.address)).to.equal(false);

      // deployer is admin
      const call = contract.connect(deployer).addMinter(user.address);
      const tx = await call;
      const receipt = await tx.wait();
      expect(receipt.logs.length).to.equal(1);
      await expect(call).to.emit(contract, "MinterAdded").withArgs(user.address);

      // user is minter now
      expect(await contract.connect(user).isAdmin(user.address)).to.equal(false);
      expect(await contract.connect(user).isMinter(user.address)).to.equal(true);
    });

    it("[addMinter] must fail when adding an already minter account", async () => {
      await contract.connect(deployer).addMinter(user.address);
      await expect(contract.connect(deployer).addMinter(user.address)).to.be.revertedWith("arteQCollection: already a minter");
    });

    it("[removeMinter] cannot be called by a non-admin account", async () => {
      await expect(contract.connect(minter).removeMinter(minter.address)).to.be.revertedWith("arteQCollection: must be admin");
      await expect(contract.connect(user).removeMinter(minter.address)).to.be.revertedWith("arteQCollection: must be admin");
    });

    it("[removeAdmin] must fail when removing an already non-minter account", async () => {
      await expect(contract.connect(deployer).removeMinter(user.address)).to.be.revertedWith("arteQCollection: not a minter");
    });

    it("[removeMinter] successfully remove a minter", async () => {
      expect(await contract.connect(user).isMinter(minter.address)).to.equal(false);
      await contract.connect(admin2).addMinter(minter.address)
      expect(await contract.connect(user).isMinter(minter.address)).to.equal(true);

      const call = contract.connect(admin3).removeMinter(minter.address);
      const tx = await call;
      const receipt = await tx.wait();
      expect(receipt.logs.length).to.equal(1);
      await expect(call).to.emit(contract, "MinterRemoved").withArgs(minter.address);

      expect(await contract.connect(user).isMinter(minter.address)).to.equal(false);
    });

    it("[setPublicMinting] successful calls", async () => {
      {
        expect(await contract.connect(user).publicMinting()).to.equal(false);
        const call = contract.connect(admin3).setPublicMinting(true);
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(1);
        await expect(call).to.emit(contract, "PublicMintingChanged").withArgs(true);
        expect(await contract.connect(user).publicMinting()).to.equal(true);
      }
      // again, set it to true
      {
        expect(await contract.connect(user).publicMinting()).to.equal(true);
        const call = contract.connect(admin3).setPublicMinting(true);
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(0);
        expect(await contract.connect(user).publicMinting()).to.equal(true);
      }
      // now, set it back to false
      {
        expect(await contract.connect(user).publicMinting()).to.equal(true);
        const call = contract.connect(admin3).setPublicMinting(false);
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(1);
        await expect(call).to.emit(contract, "PublicMintingChanged").withArgs(false);
        expect(await contract.connect(user).publicMinting()).to.equal(false);
      }
      // set it to false again
      {
        expect(await contract.connect(user).publicMinting()).to.equal(false);
        const call = contract.connect(admin3).setPublicMinting(false);
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(0);
        expect(await contract.connect(user).publicMinting()).to.equal(false);
      }
    });

    it("[setPublicMinting] cannot be called by a non-admin account", async () => {
      await expect(contract.connect(user).setPublicMinting(true)).to.be.revertedWith("arteQCollection: must be admin");
    });

    it("[setDefaultRoyaltyWallet] cannot be called by a non-admin account", async () => {
      await expect(contract.connect(minter).setDefaultRoyaltyWallet(royalty.address)).to.be.revertedWith("arteQCollection: must be admin");
      await expect(contract.connect(user).setDefaultRoyaltyWallet(royalty.address)).to.be.revertedWith("arteQCollection: must be admin");
    });

    it("[setDefaultRoyaltyWallet] successful call", async () => {
      {
        expect(await contract.connect(user).defaultRoyaltyWallet()).to.equal(zeroAddress);
        expect(await contract.connect(user).defaultRoyaltyPercentage()).to.equal(0);

        const call = contract.connect(admin2).setDefaultRoyaltyWallet(royalty.address);
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(1);
        await expect(call).to.emit(contract, 'DefaultRoyaltyWalletChanged').withArgs(royalty.address);

        expect(await contract.connect(user).defaultRoyaltyWallet()).to.equal(royalty.address);
        expect(await contract.connect(user).defaultRoyaltyPercentage()).to.equal(0);
      }
      // it is fine to set zero address
      {
        const call = contract.connect(deployer).setDefaultRoyaltyWallet(zeroAddress);
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(1);
        await expect(call).to.emit(contract, 'DefaultRoyaltyWalletChanged').withArgs(zeroAddress);

        expect(await contract.connect(user).defaultRoyaltyWallet()).to.equal(zeroAddress);
        expect(await contract.connect(user).defaultRoyaltyPercentage()).to.equal(0);
      }
    });

    it("[setDefaultRoyaltyPercentage] cannot be called by a non-admin account", async () => {
      await expect(contract.connect(minter).setDefaultRoyaltyPercentage(12)).to.be.revertedWith("arteQCollection: must be admin");
      await expect(contract.connect(user).setDefaultRoyaltyPercentage(13)).to.be.revertedWith("arteQCollection: must be admin");
    });

    it("[setDefaultRoyaltyPercentage] cannot set values above 50", async () => {
      await expect(contract.connect(deployer).setDefaultRoyaltyPercentage(51)).to.be.revertedWith("arteQCollection: royalty percentage must be between 0 and 50 inclusive");
    });

    it("[setDefaultRoyaltyPercentage] successful call", async () => {
      {
        expect(await contract.connect(user).defaultRoyaltyWallet()).to.equal(zeroAddress);
        expect(await contract.connect(user).defaultRoyaltyPercentage()).to.equal(0);

        const call = contract.connect(admin2).setDefaultRoyaltyPercentage(12);
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(1);
        await expect(call).to.emit(contract, 'DefaultRoyaltyPercentageChanged').withArgs(12);

        expect(await contract.connect(user).defaultRoyaltyWallet()).to.equal(zeroAddress);
        expect(await contract.connect(user).defaultRoyaltyPercentage()).to.equal(12);
      }
      // let's set it to 50
      {
        const call = contract.connect(admin2).setDefaultRoyaltyPercentage(50);
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(1);
        await expect(call).to.emit(contract, 'DefaultRoyaltyPercentageChanged').withArgs(50);

        expect(await contract.connect(user).defaultRoyaltyWallet()).to.equal(zeroAddress);
        expect(await contract.connect(user).defaultRoyaltyPercentage()).to.equal(50);
      }
      // it is fine to set zero
      {
        const call = contract.connect(deployer).setDefaultRoyaltyPercentage(0);
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(1);
        await expect(call).to.emit(contract, 'DefaultRoyaltyPercentageChanged').withArgs(0);

        expect(await contract.connect(user).defaultRoyaltyWallet()).to.equal(zeroAddress);
        expect(await contract.connect(user).defaultRoyaltyPercentage()).to.equal(0);
      }
    });

    it("[setDefaultRoyaltyPercentage] cannot be called by a non-admin account", async () => {
      await expect(contract.connect(minter).setDefaultRoyaltyPercentage(12)).to.be.revertedWith("arteQCollection: must be admin");
      await expect(contract.connect(user).setDefaultRoyaltyPercentage(13)).to.be.revertedWith("arteQCollection: must be admin");
    });

    it("[mint] cannot be called by a non-minter when public minting is off", async () => {
      // deployer is minter by default
      await expect(contract.connect(admin2).mint('https://url')).to.be.revertedWith("arteQCollection: must be minter");
      await expect(contract.connect(admin3).mint('https://url')).to.be.revertedWith("arteQCollection: must be minter");
      await expect(contract.connect(user).mint('https://url')).to.be.revertedWith("arteQCollection: must be minter");
    });

    it("[mint] must fail if uri is empty", async () => {
      // deployer is minter by default
      await expect(contract.connect(deployer).mint('')).to.be.revertedWith("arteQCollection: empty uri");
    });

    it("[mint] successful mint", async () => {
      // deployer is minter by default
      const call = contract.connect(deployer).mint('https://url');
      const tx = await call;
      const receipt = await tx.wait();
      expect(receipt.logs.length).to.equal(2);
      await expect(call).to.emit(contract, 'Transfer').withArgs(zeroAddress, deployer.address, 1);
      await expect(call).to.emit(contract, 'TokenURIChanged').withArgs(1);
      expect(await contract.connect(user).tokenURI(1)).to.equal('https://url');
      expect(await contract.connect(deployer).ownerOf(1)).to.equal(deployer.address);
    });

    it("[mint] successful mint by any account when public minting is on", async () => {
      // deployer is minter by default
      expect(await contract.connect(user).publicMinting()).to.equal(false);
      await expect(contract.connect(user).mint('https://url')).to.be.revertedWith("arteQCollection: must be minter");

      await contract.connect(admin2).setPublicMinting(true);
      expect(await contract.connect(user).publicMinting()).to.equal(true);

      const call = contract.connect(user).mint('https://url');
      const tx = await call;
      const receipt = await tx.wait();
      expect(receipt.logs.length).to.equal(2);
      await expect(call).to.emit(contract, 'Transfer').withArgs(zeroAddress, user.address, 1);
      await expect(call).to.emit(contract, 'TokenURIChanged').withArgs(1);
      expect(await contract.connect(deployer).tokenURI(1)).to.equal('https://url');
      expect(await contract.connect(deployer).ownerOf(1)).to.equal(user.address);
      expect(await contract.connect(deployer).balanceOf(user.address)).to.equal(1);
    });

    it("[batchMint] cannot be called by a non-minter when public minting is off", async () => {
      // deployer is minter by default
      await expect(contract.connect(admin2).batchMint(['https://url', 'https://url2'])).to.be.revertedWith("arteQCollection: must be minter");
      await expect(contract.connect(admin3).batchMint(['https://url', 'https://url2'])).to.be.revertedWith("arteQCollection: must be minter");
      await expect(contract.connect(user).batchMint(['https://url', 'https://url2'])).to.be.revertedWith("arteQCollection: must be minter");
    });

    it("[batchMint] must fail if one of the uris is empty", async () => {
      // deployer is minter by default
      await expect(contract.connect(deployer).batchMint(['https://url', '', 'https://url3'])).to.be.revertedWith("arteQCollection: empty uri");
    });

    it("[batchMint] successful mint", async () => {
      // deployer is minter by default
      const call = contract.connect(deployer).batchMint(['https://url', 'https://url2']);
      const tx = await call;
      const receipt = await tx.wait();
      expect(receipt.logs.length).to.equal(4);
      await expect(call).to.emit(contract, 'Transfer').withArgs(zeroAddress, deployer.address, 1);
      await expect(call).to.emit(contract, 'Transfer').withArgs(zeroAddress, deployer.address, 2);
      await expect(call).to.emit(contract, 'TokenURIChanged').withArgs(1);
      await expect(call).to.emit(contract, 'TokenURIChanged').withArgs(2);
      expect(await contract.connect(user).tokenURI(1)).to.equal('https://url');
      expect(await contract.connect(user).tokenURI(2)).to.equal('https://url2');
      expect(await contract.connect(deployer).ownerOf(1)).to.equal(deployer.address);
      expect(await contract.connect(deployer).ownerOf(2)).to.equal(deployer.address);
      expect(await contract.connect(deployer).balanceOf(deployer.address)).to.equal(2);
    });

    it("[batchMint] successful mint by any account when public minting is on", async () => {
      // deployer is minter by default
      expect(await contract.connect(user).publicMinting()).to.equal(false);
      await expect(contract.connect(user).batchMint(['https://url', 'https://url2'])).to.be.revertedWith("arteQCollection: must be minter");

      await contract.connect(admin2).setPublicMinting(true);
      expect(await contract.connect(user).publicMinting()).to.equal(true);

      const call = contract.connect(user).batchMint(['https://url', 'https://url2']);
      const tx = await call;
      const receipt = await tx.wait();
      expect(receipt.logs.length).to.equal(4);
      await expect(call).to.emit(contract, 'Transfer').withArgs(zeroAddress, user.address, 1);
      await expect(call).to.emit(contract, 'Transfer').withArgs(zeroAddress, user.address, 2);
      await expect(call).to.emit(contract, 'TokenURIChanged').withArgs(1);
      await expect(call).to.emit(contract, 'TokenURIChanged').withArgs(2);
      expect(await contract.connect(user).tokenURI(1)).to.equal('https://url');
      expect(await contract.connect(user).tokenURI(2)).to.equal('https://url2');
      expect(await contract.connect(deployer).ownerOf(1)).to.equal(user.address);
      expect(await contract.connect(deployer).ownerOf(2)).to.equal(user.address);
      expect(await contract.connect(deployer).balanceOf(user.address)).to.equal(2);
    });

    it("[mintTo] cannot be called by a non-minter when public minting is off", async () => {
      // deployer is minter by default
      await expect(contract.connect(admin2).mintTo(user.address, 'https://url')).to.be.revertedWith("arteQCollection: must be minter");
      await expect(contract.connect(admin3).mintTo(user.address, 'https://url')).to.be.revertedWith("arteQCollection: must be minter");
      await expect(contract.connect(user).mintTo(user.address, 'https://url')).to.be.revertedWith("arteQCollection: must be minter");
    });

    it("[mintTo] must fail if uri is empty", async () => {
      // deployer is minter by default
      await expect(contract.connect(deployer).mintTo(user.address, '')).to.be.revertedWith("arteQCollection: empty uri");
    });

    it("[mintTo] successful mint", async () => {
      // deployer is minter by default
      const call = contract.connect(deployer).mint('https://url');
      const tx = await call;
      const receipt = await tx.wait();
      expect(receipt.logs.length).to.equal(2);
      await expect(call).to.emit(contract, 'Transfer').withArgs(zeroAddress, deployer.address, 1);
      await expect(call).to.emit(contract, 'TokenURIChanged').withArgs(1);
      expect(await contract.connect(user).tokenURI(1)).to.equal('https://url');
      expect(await contract.connect(deployer).ownerOf(1)).to.equal(deployer.address);
    });

    it("[mint] successful mint by any account when public minting is on", async () => {
      // deployer is minter by default
      expect(await contract.connect(user).publicMinting()).to.equal(false);
      await expect(contract.connect(user).mint('https://url')).to.be.revertedWith("arteQCollection: must be minter");

      await contract.connect(admin2).setPublicMinting(true);
      expect(await contract.connect(user).publicMinting()).to.equal(true);

      const call = contract.connect(user).mint('https://url');
      const tx = await call;
      const receipt = await tx.wait();
      expect(receipt.logs.length).to.equal(2);
      await expect(call).to.emit(contract, 'Transfer').withArgs(zeroAddress, user.address, 1);
      await expect(call).to.emit(contract, 'TokenURIChanged').withArgs(1);
      expect(await contract.connect(deployer).tokenURI(1)).to.equal('https://url');
      expect(await contract.connect(deployer).ownerOf(1)).to.equal(user.address);
      expect(await contract.connect(deployer).balanceOf(user.address)).to.equal(1);
    });

    it("[batchMintTo] cannot be called by a non-minter when public minting is off", async () => {
      // deployer is minter by default
      await expect(contract.connect(admin2).batchMintTo(user.address, ['https://url', 'https://url2'])).to.be.revertedWith("arteQCollection: must be minter");
      await expect(contract.connect(admin3).batchMintTo(user.address, ['https://url', 'https://url2'])).to.be.revertedWith("arteQCollection: must be minter");
      await expect(contract.connect(user).batchMintTo(user.address, ['https://url', 'https://url2'])).to.be.revertedWith("arteQCollection: must be minter");
    });

    it("[batchMintTo] must fail if one of the uris is empty", async () => {
      // deployer is minter by default
      await expect(contract.connect(deployer).batchMintTo(user.address, ['https://url', '', 'https://url3'])).to.be.revertedWith("arteQCollection: empty uri");
    });

    it("[batchMintTo] successful mint", async () => {
      // deployer is minter by default
      const call = contract.connect(deployer).batchMintTo(user.address, ['https://url', 'https://url2']);
      const tx = await call;
      const receipt = await tx.wait();
      expect(receipt.logs.length).to.equal(4);
      await expect(call).to.emit(contract, 'Transfer').withArgs(zeroAddress, user.address, 1);
      await expect(call).to.emit(contract, 'Transfer').withArgs(zeroAddress, user.address, 2);
      await expect(call).to.emit(contract, 'TokenURIChanged').withArgs(1);
      await expect(call).to.emit(contract, 'TokenURIChanged').withArgs(2);
      expect(await contract.connect(user).tokenURI(1)).to.equal('https://url');
      expect(await contract.connect(user).tokenURI(2)).to.equal('https://url2');
      expect(await contract.connect(deployer).ownerOf(1)).to.equal(user.address);
      expect(await contract.connect(deployer).ownerOf(2)).to.equal(user.address);
      expect(await contract.connect(deployer).balanceOf(user.address)).to.equal(2);
    });

    it("[batchMintTo] successful mint by any account when public minting is on", async () => {
      // deployer is minter by default
      expect(await contract.connect(user).publicMinting()).to.equal(false);
      await expect(contract.connect(user).batchMintTo(admin2.address, ['https://url', 'https://url2'])).to.be.revertedWith("arteQCollection: must be minter");

      await contract.connect(admin2).setPublicMinting(true);
      expect(await contract.connect(user).publicMinting()).to.equal(true);

      const call = contract.connect(user).batchMintTo(admin2.address, ['https://url', 'https://url2']);
      const tx = await call;
      const receipt = await tx.wait();
      expect(receipt.logs.length).to.equal(4);
      await expect(call).to.emit(contract, 'Transfer').withArgs(zeroAddress, admin2.address, 1);
      await expect(call).to.emit(contract, 'Transfer').withArgs(zeroAddress, admin2.address, 2);
      await expect(call).to.emit(contract, 'TokenURIChanged').withArgs(1);
      await expect(call).to.emit(contract, 'TokenURIChanged').withArgs(2);
      expect(await contract.connect(user).tokenURI(1)).to.equal('https://url');
      expect(await contract.connect(user).tokenURI(2)).to.equal('https://url2');
      expect(await contract.connect(deployer).ownerOf(1)).to.equal(admin2.address);
      expect(await contract.connect(deployer).ownerOf(2)).to.equal(admin2.address);
      expect(await contract.connect(deployer).balanceOf(admin2.address)).to.equal(2);
    });

    it("[updateTokenURI] cannot be called by a non-admin account", async () => {
      await contract.connect(deployer).batchMintTo(user.address, ['https://url', 'https://url2']);
      await expect(contract.connect(minter).updateTokenURI(1, 'https://another-url')).to.be.revertedWith("arteQCollection: must be admin");
    });

    it("[updateTokenURI] must fail if the uri is empty", async () => {
      await contract.connect(deployer).batchMintTo(user.address, ['https://url', 'https://url2']);
      await expect(contract.connect(admin2).updateTokenURI(1, '')).to.be.revertedWith("arteQCollection: empty uri");
    });

    it("[updateTokenURI] try to update the uri of a non-existing token", async () => {
      await contract.connect(deployer).batchMintTo(user.address, ['https://url', 'https://url2']);
      await expect(contract.connect(admin2).updateTokenURI(3, 'https://another-url')).to.be.revertedWith("ERC721URIStorage: URI set of nonexistent token");
    });

    it("[updateTokenURI] successful call", async () => {
      await contract.connect(deployer).batchMintTo(user.address, ['https://url', 'https://url2']);
      expect(await contract.connect(user).tokenURI(1)).to.equal('https://url');
      expect(await contract.connect(user).tokenURI(2)).to.equal('https://url2');

      const call = contract.connect(admin2).updateTokenURI(2, 'https://another-url');
      const tx = await call;
      const receipt = await tx.wait();
      expect(receipt.logs.length).to.equal(1);
      await expect(call).to.emit(contract, 'TokenURIChanged').withArgs(2);
      expect(await contract.connect(user).tokenURI(1)).to.equal('https://url');
      expect(await contract.connect(user).tokenURI(2)).to.equal('https://another-url');
    });

    it("[batchUpdateTokenURI] cannot be called by a non-admin account", async () => {
      await contract.connect(deployer).batchMintTo(user.address, ['https://url', 'https://url2', 'https://url3']);
      await expect(contract.connect(minter).batchUpdateTokenURI([3, 2], ['https://another-url', 'https://another-url2'])).to.be.revertedWith("arteQCollection: must be admin");
    });

    it("[batchUpdateTokenURI] must fail if array sizes do not match", async () => {
      await contract.connect(deployer).batchMintTo(user.address, ['https://url', 'https://url2', 'https://url3']);
      await expect(contract.connect(admin2).batchUpdateTokenURI([3, 2], ['https://another-url', 'https://another-url2', 'https://another-url3']))
        .to.be.revertedWith("arteQCollection: lengths do not match");
    });

    it("[ubatchUpdateTokenURI] must fail if the uri is empty", async () => {
      await contract.connect(deployer).batchMintTo(user.address, ['https://url', 'https://url2', 'https://url3']);
      await expect(contract.connect(admin2).batchUpdateTokenURI([3, 2, 1], ['https://another-url', '', 'https://another-url3']))
        .to.be.revertedWith("arteQCollection: empty uri");
    });

    it("[batchUpdateTokenURI] try to update the uri of a non-existing token", async () => {
      await contract.connect(deployer).batchMintTo(user.address, ['https://url', 'https://url2', 'https://url3']);
      await expect(contract.connect(admin2).batchUpdateTokenURI([3, 5, 1], ['https://another-url', 'https://another-url2', 'https://another-url3']))
    });

    it("[batchUpdateTokenURI] successful call", async () => {
      await contract.connect(deployer).batchMintTo(user.address, ['https://url', 'https://url2', 'https://url3']);
      expect(await contract.connect(user).tokenURI(1)).to.equal('https://url');
      expect(await contract.connect(user).tokenURI(2)).to.equal('https://url2');
      expect(await contract.connect(user).tokenURI(3)).to.equal('https://url3');

      const call = contract.connect(admin2).batchUpdateTokenURI([3, 2], ['https://another-url3', 'https://another-url2']);
      const tx = await call;
      const receipt = await tx.wait();
      expect(receipt.logs.length).to.equal(2);
      await expect(call).to.emit(contract, 'TokenURIChanged').withArgs(2);
      await expect(call).to.emit(contract, 'TokenURIChanged').withArgs(3);
      expect(await contract.connect(user).tokenURI(1)).to.equal('https://url');
      expect(await contract.connect(user).tokenURI(2)).to.equal('https://another-url2');
      expect(await contract.connect(user).tokenURI(3)).to.equal('https://another-url3');
    });

    it("[addTokenToRoyaltyExemptionList] cannot be called by a non-admin account", async () => {
      await expect(contract.connect(minter).addTokenToRoyaltyExemptionList(1)).to.be.revertedWith("arteQCollection: must be admin");
      await expect(contract.connect(user).addTokenToRoyaltyExemptionList(1)).to.be.revertedWith("arteQCollection: must be admin");
    });

    it("[addTokenToRoyaltyExemptionList] cannot be called for a non-existing token", async () => {
      await expect(contract.connect(deployer).addTokenToRoyaltyExemptionList(1)).to.be.revertedWith("arteQCollection: non-existing token");
    });

    it("[addTokenToRoyaltyExemptionList] successful call", async () => {
      {
        // deployer is minter by default
        await contract.connect(deployer).mint('https://url');
        const call = contract.connect(deployer).addTokenToRoyaltyExemptionList(1);
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(1);
        await expect(call).to.emit(contract, 'TokenAddedToExemptionList').withArgs(1);
      }
      // adding it again must fail
      {
        await expect(contract.connect(deployer).addTokenToRoyaltyExemptionList(1)).to.be.revertedWith("arteQCollection: already exempt");
      }
    });

    it("[removeTokenFromRoyaltyExemptionList] cannot be called by a non-admin account", async () => {
      await expect(contract.connect(minter).removeTokenFromRoyaltyExemptionList(1)).to.be.revertedWith("arteQCollection: must be admin");
      await expect(contract.connect(user).removeTokenFromRoyaltyExemptionList(1)).to.be.revertedWith("arteQCollection: must be admin");
    });

    it("[removeTokenFromRoyaltyExemptionList] cannot be called for a non-existing token", async () => {
      await expect(contract.connect(deployer).removeTokenFromRoyaltyExemptionList(1)).to.be.revertedWith("arteQCollection: non-existing token");
    });

    it("[removeTokenFromRoyaltyExemptionList] successful call", async () => {
      // deployer is minter by default
      await contract.connect(deployer).mint('https://url');
      // must fail for a non-exempted token
      {
        await expect(contract.connect(deployer).removeTokenFromRoyaltyExemptionList(1)).to.be.revertedWith("arteQCollection: not in exemption list");
      }
      // adding the token to exemption list
      {
        await contract.connect(deployer).addTokenToRoyaltyExemptionList(1);
      }
      // must succeed
      {
        const call = contract.connect(deployer).removeTokenFromRoyaltyExemptionList(1);
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(1);
        await expect(call).to.emit(contract, 'TokenRemovedFromExemptionList').withArgs(1);
      }
      // must fail for a non-exempted token
      {
        await expect(contract.connect(deployer).removeTokenFromRoyaltyExemptionList(1)).to.be.revertedWith("arteQCollection: not in exemption list");
      }
    });

    it("[setTokenRoyaltyInfo] cannot be called by a non-admin account", async () => {
      await expect(contract.connect(minter).setTokenRoyaltyInfo(1, royalty.address, 12)).to.be.revertedWith("arteQCollection: must be admin");
      await expect(contract.connect(user).setTokenRoyaltyInfo(1, royalty.address, 12)).to.be.revertedWith("arteQCollection: must be admin");
    });

    it("[setTokenRoyaltyInfo] cannot be called for a non-existing token", async () => {
      await expect(contract.connect(deployer).setTokenRoyaltyInfo(1, royalty.address, 12)).to.be.revertedWith("arteQCollection: non-existing token");
    });

    it("[royaltyInfo] must fail when token does not exist", async () => {
      await expect(contract.connect(user).royaltyInfo(1, 1000)).to.be.revertedWith("arteQCollection: non-existing token");
    });

    it("[royaltyInfo] success scenarios", async () => {
      // deployer is minter by default
      await contract.connect(deployer).mint('https://url');
      await contract.connect(deployer).mint('https://url2');
      // when there is no default royalty settings
      {
        const [ royaltyW, royaltyP ] = await contract.connect(user).royaltyInfo(1, 1000);
        expect(royaltyW).to.equal(zeroAddress);
        expect(royaltyP).to.equal(0);
      }
      // set default settings
      {
        await contract.connect(deployer).setDefaultRoyaltyWallet(royalty.address);
        await contract.connect(deployer).setDefaultRoyaltyPercentage(6);
      }
      // read the royalty info again
      {
        // token #1
        {
          const [ royaltyW, royaltyP ] = await contract.connect(user).royaltyInfo(1, 1000);
          expect(royaltyW).to.equal(royalty.address);
          expect(royaltyP).to.equal(60);
        }
        // token #2
        {
          const [ royaltyW, royaltyP ] = await contract.connect(user).royaltyInfo(2, 1000);
          expect(royaltyW).to.equal(royalty.address);
          expect(royaltyP).to.equal(60);
        }
      }
      // set different settings for token #2
      {
        await contract.connect(deployer).setTokenRoyaltyInfo(2, royalty2.address, 8);
      }
      // read the royalty info again
      {
        // token #1
        {
          const [ royaltyW, royaltyP ] = await contract.connect(user).royaltyInfo(1, 1000);
          expect(royaltyW).to.equal(royalty.address);
          expect(royaltyP).to.equal(60);
        }
        // token #2
        {
          const [ royaltyW, royaltyP ] = await contract.connect(user).royaltyInfo(2, 1000);
          expect(royaltyW).to.equal(royalty2.address);
          expect(royaltyP).to.equal(80);
        }
      }
      // exempt token #1
      {
        await contract.connect(deployer).addTokenToRoyaltyExemptionList(1);
      }
      // read the royalty info again
      {
        // token #1
        {
          const [ royaltyW, royaltyP ] = await contract.connect(user).royaltyInfo(1, 1000);
          expect(royaltyW).to.equal(zeroAddress);
          expect(royaltyP).to.equal(0);
        }
        // token #2
        {
          const [ royaltyW, royaltyP ] = await contract.connect(user).royaltyInfo(2, 1000);
          expect(royaltyW).to.equal(royalty2.address);
          expect(royaltyP).to.equal(80);
        }
      }
      // clear token #2's royalty settings (falls back to default settings)
      {
        const r = Math.random();
        // setting either wallet or percentage to zero disables the per-token settings
        if (r <= 0.33) {
          console.log('setting royalty wallet to zero address ...');
          await contract.connect(deployer).setTokenRoyaltyInfo(2, zeroAddress, 8);
        } else if (r > 0.33 && r <= 0.66) {
          console.log('setting royalty percentage to zero ...');
          await contract.connect(deployer).setTokenRoyaltyInfo(2, royalty.address, 0);
        } else {
          console.log('setting both royalty wallet and percentage to zero ...');
          await contract.connect(deployer).setTokenRoyaltyInfo(2, zeroAddress, 0);
        }
      }
      {
        // token #1
        {
          const [ royaltyW, royaltyP ] = await contract.connect(user).royaltyInfo(1, 1000);
          expect(royaltyW).to.equal(zeroAddress);
          expect(royaltyP).to.equal(0);
        }
        // token #2
        {
          const [ royaltyW, royaltyP ] = await contract.connect(user).royaltyInfo(2, 1000);
          expect(royaltyW).to.equal(royalty.address);
          expect(royaltyP).to.equal(60);
        }
      }
      // setting token #1' royalty info (this is ignored as token is royalty exempt)
      {
        await contract.connect(deployer).setTokenRoyaltyInfo(1, royalty2.address, 9);
      }
      {
        // token #1
        {
          const [ royaltyW, royaltyP ] = await contract.connect(user).royaltyInfo(1, 1000);
          expect(royaltyW).to.equal(zeroAddress);
          expect(royaltyP).to.equal(0);
        }
        // token #2
        {
          const [ royaltyW, royaltyP ] = await contract.connect(user).royaltyInfo(2, 1000);
          expect(royaltyW).to.equal(royalty.address);
          expect(royaltyP).to.equal(60);
        }
      }
      // remove token #1 from exemption list (this revives token #1' royalty settings);
      {
        await contract.connect(deployer).removeTokenFromRoyaltyExemptionList(1);
      }
      {
        // token #1
        {
          const [ royaltyW, royaltyP ] = await contract.connect(user).royaltyInfo(1, 1000);
          expect(royaltyW).to.equal(royalty2.address);
          expect(royaltyP).to.equal(90);
        }
        // token #2
        {
          const [ royaltyW, royaltyP ] = await contract.connect(user).royaltyInfo(2, 1000);
          expect(royaltyW).to.equal(royalty.address);
          expect(royaltyP).to.equal(60);
        }
      }
      // clear token #1's royalty settings (falls back to default settings)
      {
        const r = Math.random();
        // setting either wallet or percentage to zero disables the per-token settings
        if (r <= 0.33) {
          console.log('setting royalty wallet to zero address ...');
          await contract.connect(deployer).setTokenRoyaltyInfo(1, zeroAddress, 8);
        } else if (r > 0.33 && r <= 0.66) {
          console.log('setting royalty percentage to zero ...');
          await contract.connect(deployer).setTokenRoyaltyInfo(1, royalty.address, 0);
        } else {
          console.log('setting both royalty wallet and percentage to zero ...');
          await contract.connect(deployer).setTokenRoyaltyInfo(1, zeroAddress, 0);
        }
      }
      {
        // token #1
        {
          const [ royaltyW, royaltyP ] = await contract.connect(user).royaltyInfo(1, 1000);
          expect(royaltyW).to.equal(royalty.address);
          expect(royaltyP).to.equal(60);
        }
        // token #2
        {
          const [ royaltyW, royaltyP ] = await contract.connect(user).royaltyInfo(2, 1000);
          expect(royaltyW).to.equal(royalty.address);
          expect(royaltyP).to.equal(60);
        }
      }
      // clearing default royalty settings
      {
        const r = Math.random();
        // setting either wallet or percentage to zero disables the per-token settings
        if (r <= 0.33) {
          console.log('setting default royalty wallet to zero address ...');
          await contract.connect(deployer).setDefaultRoyaltyWallet(zeroAddress);
        } else if (r > 0.33 && r <= 0.66) {
          console.log('setting default royalty percentage to zero ...');
          await contract.connect(deployer).setDefaultRoyaltyPercentage(0);
        } else {
          console.log('setting both default royalty wallet and percentage to zero ...');
          await contract.connect(deployer).setDefaultRoyaltyWallet(zeroAddress);
          await contract.connect(deployer).setDefaultRoyaltyPercentage(0);
        }
      }
      {
        // token #1
        {
          const [ royaltyW, royaltyP ] = await contract.connect(user).royaltyInfo(1, 1000);
          expect(royaltyW).to.equal(zeroAddress);
          expect(royaltyP).to.equal(0);
        }
        // token #2
        {
          const [ royaltyW, royaltyP ] = await contract.connect(user).royaltyInfo(2, 1000);
          expect(royaltyW).to.equal(zeroAddress);
          expect(royaltyP).to.equal(0);
        }
      }
    });
});
