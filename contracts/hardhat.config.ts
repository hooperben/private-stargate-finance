import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.21",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.27",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: true,
      mining: {
        auto: true,
        interval: 0,
      },
    },
  },
  mocha: {
    timeout: 40000,
  },
};

export default config;
