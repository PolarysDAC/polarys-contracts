import { ethers } from 'hardhat';
import { formatUnits } from "ethers/lib/utils";
import { PolarDepositContract } from "../../typechain-types";

import 'dotenv/config';
import { load } from "../utils"

import { Signer } from 'ethers';

const DEPOSIT_ROLE_ACCOUNT = process.env.DEPOSIT_ROLE_ACCOUNT
const ADMIN_ROLE_ACCOUNT = process.env.ADMIN_ROLE_ACCOUNT

async function main () {
  let signer: Signer
  let depositContract: PolarDepositContract

  const depositContractAddress = (await load('PolarDepositContract')).address

  depositContract = (await ethers.getContractAt("PolarDepositContract", depositContractAddress)) as PolarDepositContract;
  [signer] = await ethers.getSigners()
  
  await (
    await depositContract
    .connect(signer)
    .setupDepositRole(String(DEPOSIT_ROLE_ACCOUNT))
  ).wait();

  await (
    await depositContract
    .connect(signer)
    .setupAdminRole(String(ADMIN_ROLE_ACCOUNT))
  ).wait();

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });