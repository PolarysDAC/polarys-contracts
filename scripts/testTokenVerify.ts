import hre from "hardhat";
import { ethers } from 'hardhat'
import { load } from "./utils"

import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const decimal = 6;
    const contractAddress = (await load('TestTokenContract')).address
    console.log(contractAddress)
    await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
            "TestToken", 
            "TTT", 
            decimal
        ],
    });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});