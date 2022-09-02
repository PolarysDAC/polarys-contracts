import { ethers } from 'hardhat';
import { formatUnits } from "ethers/lib/utils";
import { providers } from 'ethers';
import { TestToken, DepositContract } from "../../typechain-types";

import 'dotenv/config';
import { load } from "../utils"
import {
  getBigNumber,
} from '../../test/utils'

import { Signer } from 'ethers';

const ALCHEMY_KEY = process.env.ALCHEMY_KEY || "";

async function main () {
  let signer: Signer
  let depositContract: DepositContract
  let testTokenContract: TestToken

  const DECIMAL = 6
  const USER_PK = process.env.USER_PK
  const quantity = 1
  const amount = getBigNumber(250, DECIMAL)
  const deadline = 1659558650
  const proof = ['0x102e237c0c12aa11b575b407a65408c9c30e88c4ba404f7d6bfb39c21bcd5b5a']
  const sign = "0xed32447fad25f7bdc3c1e40a23b7741f3b97814797c5d294c463452490511dc11cfe70e8f93a89397649a5e12ed4ba1459c448561a841c857da95d00d8c560cd1b"
  const saleStatus = 1

  const depositContractAddress = (await load('DepositContract')).address
  const testTokenAddress = (await load('TestTokenContract')).address

  depositContract = (await ethers.getContractAt("DepositContract", depositContractAddress)) as DepositContract;
  testTokenContract = (await ethers.getContractAt("TestToken", testTokenAddress)) as TestToken;
  // [signer] = await ethers.getSigners()
  
  //rinkeby provider
  const provider = await new providers.JsonRpcProvider("https://eth-rinkeby.alchemyapi.io/v2/nKqhgMRUZJSw0baczgK177tpL59bae_j");

  //mumbai provider
  // const provider = await new providers.JsonRpcProvider("https://polygon-mumbai.g.alchemy.com/v2/2nMHQF5YQQybtCijNX-tNWi9qo7PObMx");
  let userSigner: Signer = new ethers.Wallet(String(USER_PK), provider)
  
  await (
    await testTokenContract
    .connect(userSigner)
    .approve(depositContract.address, amount)
  ).wait();

  const tx = await depositContract
    .connect(userSigner)
    .depositToken(
      quantity, 
      amount, 
      deadline, 
      saleStatus,
      sign,
      proof
    )
  await tx.wait();
  console.log(tx)

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });