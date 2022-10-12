import { ethers, upgrades } from 'hardhat'
import { save } from "./utils"
import { getBigNumber } from '../test/utils';

import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const polarTokenTreasury = String(process.env.POLAR_TOKEN_TREASURY!);
    const polarTokenOwner = String(process.env.POLAR_TOKEN_OWNER!);
    const totalSupply = getBigNumber("1000000000");
    const factory = await ethers.getContractFactory("PolarToken");
    const polarToken = await factory.deploy(
        "POLAR Token",
        "POLAR",
        polarTokenOwner,
        polarTokenTreasury,
        totalSupply
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