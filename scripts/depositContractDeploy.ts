import { ethers, upgrades } from 'hardhat'
import { save } from "./utils"

import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const constructorArguments = {
        ethereum: {
            usdcAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            nativeTokenPriceAggregator: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"
        },
        polygon: {
            usdcAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
            nativeTokenPriceAggregator: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
        },
        avax: {
            usdcAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
            nativeTokenPriceAggregator: "0x0A77230d17318075983913bC2145DB16C7366156"
        },
        bsc: {
            usdcAddress: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
            nativeTokenPriceAggregator: "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE"
        },
        fantom: {
            usdcAddress: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75",
            nativeTokenPriceAggregator: "0xf4766552D15AE4d256Ad41B6cf2933482B0680dc"
        },
        metis: {
            usdcAddress: "0xEA32A96608495e54156Ae48931A7c20f0dcc1a21",
            nativeTokenPriceAggregator: "0xD4a5Bb03B5D66d9bf81507379302Ac2C2DFDFa6D"
        },
        arbitrum: {
            usdcAddress: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
            nativeTokenPriceAggregator: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612"
        },
        goerli: {
            usdcAddress: "0x58c87F2bA36E527861559b10A02F5786d5369e73",
            nativeTokenPriceAggregator: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e"
        },
        mumbai: {
            usdcAddress: "0x58c87F2bA36E527861559b10A02F5786d5369e73",
            nativeTokenPriceAggregator: "0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada"
        }
    };
    // const usdcAddress = "0x58c87F2bA36E527861559b10A02F5786d5369e73";    //testnet
    // const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";  //ethereum
    // const usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";  //polygon
    // const usdcAddress = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";  //avax
    // const usdcAddress = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";  //bsc
    // const usdcAddress = "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75";  //fantom
    // const usdcAddress = "0xEA32A96608495e54156Ae48931A7c20f0dcc1a21";  //metis
    // const usdcAddress = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";  //arbitrum

    // const priceAggregator = "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e";   // goerli
    // const priceAggregator = "0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada";   // mumbai
    const owner = String(process.env.DEPOSIT_CONTRACT_OWNER!);
    const DEPOSIT_ROLE_ACCOUNT = String(process.env.DEPOSIT_ROLE_ACCOUNT!);

    const factory = await ethers.getContractFactory("PolarDepositContract");
    const depositContract = await factory.deploy(
        constructorArguments['arbitrum'].usdcAddress,
        owner,
        constructorArguments['arbitrum'].nativeTokenPriceAggregator,
        DEPOSIT_ROLE_ACCOUNT
    );
    await depositContract.deployed();
    console.log("PolarDepositContract deployed to:", depositContract.address);
    await save('PolarDepositContract', {
        address: depositContract.address
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});