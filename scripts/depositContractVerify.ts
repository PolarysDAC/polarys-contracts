import hre from "hardhat";
import { ethers } from 'hardhat'
import { load } from "./utils"

import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const tokenAddress = "0x58c87F2bA36E527861559b10A02F5786d5369e73";    //testnet
    // const tokenAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";  //ethereum
    // const tokenAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";  //polygon
    // const tokenAddress = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";  //avax
    // const tokenAddress = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";  //bsc
    // const tokenAddress = "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75";  //fantom
    // const tokenAddress = "0xEA32A96608495e54156Ae48931A7c20f0dcc1a21";  //metis
    // const tokenAddress = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";  //arbitrum

    // const priceAggregator = "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e";   // goerli
    const priceAggregator = "0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada";   // mumbai

    const owner = String(process.env.DEPOSIT_CONTRACT_OWNER!);
    const DEPOSIT_ROLE_ACCOUNT = String(process.env.DEPOSIT_ROLE_ACCOUNT!);

    const contractAddress = (await load('PolarDepositContract')).address
    console.log(contractAddress)
    await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
            tokenAddress,
            owner,
            priceAggregator,
            DEPOSIT_ROLE_ACCOUNT
        ],
    });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});