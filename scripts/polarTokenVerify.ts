import hre from "hardhat";
import { ethers } from 'hardhat'
import { load } from "./utils"
import { getBigNumber } from '../test/utils';

import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const polarTokenTreasury = String(process.env.POLAR_TOKEN_TREASURY!);
    const polarTokenOwner = String(process.env.POLAR_TOKEN_OWNER!);
    const totalSupply = getBigNumber("1000000000");
    const contractAddress = (await load('PolarToken')).address;
    console.log(contractAddress)
    await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
            "POLAR Token",
            "POLAR",
            polarTokenOwner,
            polarTokenTreasury,
            totalSupply
        ],
    });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});