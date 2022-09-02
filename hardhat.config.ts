import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-ethers";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import "solidity-coverage";

import * as dotenv from "dotenv";
dotenv.config();

const chainIds = {
  // ethereum
  mainnet: 1,
  rinkeby: 4,
  ropsten: 3,
  // polygon
  mumbai: 80001,
  polygon: 137,
  // bsc
  bsc: 56,
  bscTestnet: 97,
  // avalanche
  avalanche: 43114,
  fuji: 43113,
  // fantom
  opera: 250,
  ftmTestnet: 4002,
};

const ALCHEMY_KEY = process.env.ALCHEMY_KEY || "";

const PRIVATE_KEY = process.env.PK || "";

const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY || "";
const POLYGONSCAN_KEY = process.env.POLYGONSCAN_KEY || "";
const BSCSCAN_KEY = process.env.BSCSCAN_KEY || "";
const AVALANCHESCAN_KEY = process.env.AVALANCHESCAN_KEY || "";
const FANTOM_KEY = process.env.FANTOMSCAN_KEY || "";


const ETH_RPC_URL = process.env.ETH_RPC_URL
const BSC_RPC_URL = process.env.BSC_RPC_URL
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL
const AVAX_RPC_URL = process.env.AVAX_RPC_URL
const FANTOM_RPC_URL = process.env.FANTOM_RPC_URL

const config = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 1337
    },
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${ALCHEMY_KEY}`,
      chainId: chainIds.rinkeby,
      accounts: [PRIVATE_KEY],
      gasMultiplier: 1.25
    },
    mainnet: {
      url: ETH_RPC_URL,
      chainId: chainIds.mainnet,
      accounts: [PRIVATE_KEY],
      gasMultiplier: 1.25
    },
    polygon: {
      url: POLYGON_RPC_URL,
      chainId: chainIds.polygon,
      accounts: [PRIVATE_KEY],
      gasMultiplier: 1.25
    },
    polygonMumbai: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/${ALCHEMY_KEY}`,
      chainId: chainIds.mumbai,
      accounts: [PRIVATE_KEY],
      gasMultiplier: 1.25
    },
    bsc: {
      url: BSC_RPC_URL,
      chainId: chainIds.bsc,
      accounts: [PRIVATE_KEY],
      gasMultiplier: 1.25
    },
    avalanche: {
      url: AVAX_RPC_URL,
      chainId: chainIds.avalanche,
      accounts: [PRIVATE_KEY],
      gasMultiplier: 1.25
    },
    opera: {
      url: FANTOM_RPC_URL,
      chainId: chainIds.opera,
      accounts: [PRIVATE_KEY],
      gasMultiplier: 1.25
    },
  },
  etherscan: {
    apiKey: {
      // ethereum
      mainnet: ETHERSCAN_KEY,
      rinkeby: ETHERSCAN_KEY,
      // polygon
      polygon: POLYGONSCAN_KEY,
      polygonMumbai: POLYGONSCAN_KEY,
      // binance smart chain
      bsc: BSCSCAN_KEY,
      bscTestnet: BSCSCAN_KEY,
      // avalanche
      avalanche: AVALANCHESCAN_KEY,
      avalancheFujiTestnet: AVALANCHESCAN_KEY,
      // fantom
      opera: FANTOM_KEY,
      ftmTestnet: FANTOM_KEY,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.15",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  mocha: {
    timeout: 30000,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  }
};

export default config;
