import { ethers } from 'hardhat';
import { formatUnits } from "ethers/lib/utils";
import { PolarysNFTContract } from "../typechain-types";

import 'dotenv/config';
import { load } from "./utils"
import {
  getBigNumber,
} from '../test/utils'

import { Signer } from 'ethers';

async function main () {
  let signer: Signer
  let nftContract: PolarysNFTContract

  const DECIMALS = 6;
  const PRIVATE_SALE_PRICE = 250;
  const PUBLIC_SALE_PRICE = 300;
  const ROYALTY_FEE = 250;   // 2.5% royalty fee

  const minterWalletAddress = String(process.env.MINTER_WALLET)
  const baseURI = String(process.env.BASE_URI)
  const nftContractAddress = (await load('PolarysNFTContract')).address

  nftContract = (await ethers.getContractAt("PolarysNFTContract", nftContractAddress)) as PolarysNFTContract;
  [signer] = await ethers.getSigners()
  
  const transaction1 = await nftContract
    .connect(signer).setPrivateSalePrice(getBigNumber(PRIVATE_SALE_PRICE, DECIMALS));
  await transaction1.wait();
  
  const transaction2 = await nftContract
    .connect(signer).setPublicSalePrice(getBigNumber(PUBLIC_SALE_PRICE, DECIMALS));
  await transaction2.wait();
  
  const salePrice = formatUnits(await nftContract.getSalePrice(), DECIMALS);
  console.log("Sale Price: ", salePrice);

  
  await (
    await nftContract
    .connect(signer)
    .setupMinterRole(minterWalletAddress)
  ).wait();
  console.log("Setup minter role");

  await (
    await nftContract
    .connect(signer)
    .setRoyaltyFee(ROYALTY_FEE)
  ).wait();
  
  await (
    await nftContract
    .connect(signer)
    .setBaseURI(baseURI)
  ).wait();

  const newRoyaltyFee = formatUnits(await nftContract.getRoyaltyFee(), 0);
  console.log("royalty fee: ", newRoyaltyFee);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });