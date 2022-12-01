import hre from "hardhat";
import { ethers } from 'hardhat'
import { load } from "./utils"

import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const contractAddress = (await load('PolarysArtContract')).address
    const NFT_OWNER_ACCOUNT = String(process.env.NFT_OWNER_ACCOUNT!);
    const NFT_MINTER_ACCOUNT = String(process.env.NFT_MINTER_ACCOUNT!);
    const NFT_BASE_URI = String(process.env.NFT_BASE_URI!);
    await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
          "Damien Bogaerts NFT", 
          "NFT",
          NFT_BASE_URI,
          NFT_OWNER_ACCOUNT,
          NFT_MINTER_ACCOUNT
        ],
    });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});