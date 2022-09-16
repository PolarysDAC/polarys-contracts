import { ethers, upgrades } from 'hardhat'
import { save } from "./utils"
import { parseUnits } from 'ethers/lib/utils'

import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const polarTokenTreasury = process.env.POLAR_TOKEN_TREASURY!
    const polarTokenOwner = process.env.POLAR_TOKEN_OWNER!
    const factory = await ethers.getContractFactory("PolarToken");
    const polarToken = await factory.deploy(
        "POLAR Token",
        "POLAR",
        polarTokenOwner,
        polarTokenTreasury,
        parseUnits("1000000000", 18)
    );
    await polarToken.deployed();
    console.log("polarToken deployed to:", polarToken.address);
    await save('PolarToken', {
        address: polarToken.address
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});