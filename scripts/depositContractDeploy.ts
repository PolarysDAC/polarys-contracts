import { ethers, upgrades } from 'hardhat'
import { save } from "./utils"

import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const tokenAddress = "0xe570DAdFA73B221E65Fc8E2A5f5c9b25E92c8e70";    //testnet
    // const tokenAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";  //ethereum
    // const tokenAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";  //polygon
    // const tokenAddress = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";  //avax
    // const tokenAddress = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";  //bsc
    // const tokenAddress = "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75";  //fantom

    const factory = await ethers.getContractFactory("PolarDepositContract");
    const depositContract = await factory.deploy(tokenAddress);
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