import { ethers } from 'hardhat';
import { formatUnits, parseUnits } from "ethers/lib/utils";
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
    .depositToken(
      parseUnits('733.333', 6),
      parseUnits('10.999995', 6),
      1666612111,
      1,
      true,
      '0x4770fee61a0ea6916de3cfb05b857f27368173a86ac11a7437c63faa077fe45773191935778da117cec102b0651344652ddaba76bbff6e0d3227bfed79a1bb0d1b'
    )
  ).wait();

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });