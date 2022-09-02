import { ethers, upgrades } from 'hardhat'
import { save } from "./utils"

import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const decimal = 6;
    const factory = await ethers.getContractFactory("TestToken");
    const contract = await factory.deploy("TestToken", "TTT", decimal);
    await contract.deployed();
    console.log("TestToken deployed to:", contract.address);
    await save('TestTokenContract', {
        address: contract.address
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});