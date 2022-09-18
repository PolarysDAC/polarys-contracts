import { ethers } from 'hardhat';
import { formatUnits } from "ethers/lib/utils";
import { providers } from 'ethers';
import { PolarToken } from "../../typechain-types";

import 'dotenv/config';
import { load } from "../utils"
import {
  getBigNumber,
} from '../../test/utils'

import { Signer } from 'ethers';

const PRIVATE_SALE_PRICE = 0.02;
const PUBLIC_SALE_PRICE = 0.04;
const DECIMALS = 6;

async function main () {
  let polarTokenContract: PolarToken

  const owner = process.env.POLAR_TOKEN_OWNER!
  const polarTokenAddress = (await load('PolarToken')).address
  
  //testnet
  const provider = await new providers.JsonRpcProvider("https://stardust.metis.io/?owner=588");

  //mainnet
  // const provider = await new providers.JsonRpcProvider("https://andromeda.metis.io/?owner=1088");

  polarTokenContract = (await ethers.getContractAt("PolarToken", polarTokenAddress)) as PolarToken;
  let signer: Signer = new ethers.Wallet(String(owner), provider)
  
  const transaction1 = await polarTokenContract
    .connect(signer).setPrivateSalePrice(getBigNumber(PRIVATE_SALE_PRICE, DECIMALS));
  await transaction1.wait();
  
  const transaction2 = await polarTokenContract
    .connect(signer).setPublicSalePrice(getBigNumber(PUBLIC_SALE_PRICE, DECIMALS));
  await transaction2.wait();
  
  const salePrice = formatUnits(await polarTokenContract.getSalePrice(), DECIMALS);
  console.log("Sale Price: ", salePrice);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });