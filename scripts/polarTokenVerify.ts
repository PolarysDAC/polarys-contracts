import hre from "hardhat";
import { ethers } from 'hardhat'
import { load } from "./utils"
import { parseUnits } from 'ethers/lib/utils'

import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const polarTokenTreasury = process.env.POLAR_TOKEN_TREASURY!
    const polarTokenOwner = process.env.POLAR_TOKEN_OWNER!
    const contractAddress = (await load('PolarToken')).address
    console.log(contractAddress)
    await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
            "POLAR Token",
            "POLAR",
            polarTokenOwner,
            polarTokenTreasury,
            parseUnits("1000000000", 18)
        ],
    });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});