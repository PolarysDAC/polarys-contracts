import { ethers } from 'hardhat';
import { formatUnits } from "ethers/lib/utils";
import { providers } from 'ethers';
import { PolarToken } from "../../typechain-types";

import 'dotenv/config';
import { load } from "../utils"

import { Signer } from 'ethers';

async function main () {
  let polarTokenContract: PolarToken

  const ownerPK = process.env.POLAR_TOKEN_OWNER_PK!
  const polarTokenAddress = (await load('PolarToken')).address
  
  //testnet
  const provider = await new providers.JsonRpcProvider("https://goerli.gateway.metisdevops.link");

  //mainnet
  // const provider = await new providers.JsonRpcProvider("https://andromeda.metis.io/?owner=1088");

  polarTokenContract = (await ethers.getContractAt("PolarToken", polarTokenAddress)) as PolarToken;
  let signer: Signer = new ethers.Wallet(String(ownerPK), provider)
  
  await (
    await (
      polarTokenContract.connect(signer)
      .startPrivateSale()
    )
  ).wait();

  const saleStatus = await polarTokenContract.getSaleStatus()
  console.log("SaleStatus is: ", saleStatus)

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });