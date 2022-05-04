require("@nomiclabs/hardhat-waffle");
require('solidity-coverage');

module.exports = {
  solidity: {
    version: "0.8.1",
    settings: {
      optimizer: {
        enabled: true,
        runs: 2000
      }
    }
  }
};
