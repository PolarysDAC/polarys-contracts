import { expect } from 'chai';
import { ethers, network, upgrades } from 'hardhat';
const hre = require("hardhat");
import { parseUnits, formatUnits } from "ethers/lib/utils";
import { PolarDepositContract, TestToken } from "../typechain-types";

import {
  getBigNumber
} from './utils'
import { BigNumber, Contract, Signer } from 'ethers';

describe('PolarDepositContract-Test', () => {
  let depositContract: PolarDepositContract
  let testToken: TestToken
  let owner: Signer
  let depositContractOwner: Signer
  let ownerAddress: string
  let depositContractOwnerAddress: string
  before(async () => {
    [
      owner, 
      depositContractOwner 
    ] = await ethers.getSigners()
    ownerAddress = await owner.getAddress()
    const priceAggregator = "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e";   // goerli
    depositContractOwnerAddress = await depositContractOwner.getAddress()
    console.log('===================Deploying Contract=====================')

    const tokenFactory = await ethers.getContractFactory("TestToken")
    testToken = (await tokenFactory.deploy("TestCoin", "TTC", 18)) as TestToken
    await testToken.deployed()
    console.log('TestToken deployed: ', testToken.address)

    const contractFactory = await ethers.getContractFactory("PolarDepositContract")
    depositContract = (await contractFactory.deploy(
      testToken.address,
      depositContractOwnerAddress,
      priceAggregator
    )) as PolarDepositContract
    await depositContract.deployed()
    console.log('PolarDepositContract deployed: ', depositContract.address)

  })

  describe('depositNativeToken() test', async () => {
    it('deposit native token', async () => {
      await expect(
        depositContract
        .depositNativeToken({value: ethers.utils.parseEther('1')})
      );
    })
  })
});
