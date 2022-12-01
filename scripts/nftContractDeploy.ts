import { ethers, upgrades } from 'hardhat'
import { save } from "./utils"

import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const factory = await ethers.getContractFactory("PolarysArtContract");
    const NFT_OWNER_ACCOUNT = String(process.env.NFT_OWNER_ACCOUNT!);
    const NFT_MINTER_ACCOUNT = String(process.env.NFT_MINTER_ACCOUNT!);
    const NFT_BASE_URI = String(process.env.NFT_BASE_URI!);
    let contract = await factory.deploy(
        "Damien Bogaerts NFT", 
        "NFT",
        NFT_BASE_URI,
        NFT_OWNER_ACCOUNT,
        NFT_MINTER_ACCOUNT
    );
    await contract.deployed();
    console.log("PolarysArtContract deployed to:", contract.address);
    await save('PolarysArtContract', {
        address: contract.address
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});