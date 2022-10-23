import hre from "hardhat";
import { ethers } from 'hardhat'
import { load } from "./utils"
import { parseUnits } from 'ethers/lib/utils'

import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const adminAccount = process.env.ADMIN_ROLE_ACCOUNT!
    const polarTokenAddress = (await load('PolarToken')).address
    const contractAddress = (await load('TokenVestingContract')).address
    console.log(contractAddress)
    await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
            polarTokenAddress,
            adminAccount,
            adminAccount
        ],
    });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});