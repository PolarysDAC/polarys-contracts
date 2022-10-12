import { ethers, upgrades } from 'hardhat'
import { save, load } from "./utils"
import { parseUnits } from 'ethers/lib/utils'

import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const polarTokenAddress = (await load('PolarToken')).address
    const factory = await ethers.getContractFactory("TokenVesting");
    const tokenVestingContract = await factory.deploy(
        polarTokenAddress
    );
    await tokenVestingContract.deployed();
    console.log("TokenVesting deployed to:", tokenVestingContract.address);
    await save('TokenVestingContract', {
        address: tokenVestingContract.address
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});