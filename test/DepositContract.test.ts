import { expect } from 'chai';
import { ethers, network, upgrades } from 'hardhat';
const hre = require("hardhat");
import { parseUnits, formatUnits } from "ethers/lib/utils";
import { DepositContract, TestToken } from "../typechain-types";

import {
  getBigNumber
} from './utils'
import { BigNumber, Contract, Signer } from 'ethers';

describe('DepositContract-Test', () => {
  let depositContract: DepositContract
  let testToken: TestToken
  let owner: Signer
  let user1: Signer
  let user2: Signer
  let admin: Signer
  let recipient: Signer
  let testTokenSigner: Signer
  let ownerAddress: string
  let user1Address: string
  let user2Address: string
  let adminAddress: string
  let recipientAddress: string
  const depositRoleAccount = "0x5065d88Af25A41502dcBa6d70AB3ac140b9AF162"
  const decimal = 6
  before(async () => {
    [
      owner, 
      user1, 
      user2,
      admin, 
      recipient,
    ] = await ethers.getSigners()
    ownerAddress = await owner.getAddress()
    user1Address = await user1.getAddress()
    user2Address = await user2.getAddress()
    adminAddress = await admin.getAddress()
    recipientAddress = await recipient.getAddress()
    
    console.log('===================Deploying Contract=====================')

    const tokenFactory = await ethers.getContractFactory("TestToken")
    testToken = (await tokenFactory.deploy("TestCoin", "TTC", 18)) as TestToken
    await testToken.deployed()
    console.log('TestToken deployed: ', testToken.address)

    const contractFactory = await ethers.getContractFactory("DepositContract")
    depositContract = (await contractFactory.deploy(testToken.address)) as DepositContract
    await depositContract.deployed()
    console.log('DepositContract deployed: ', depositContract.address)

    await testToken.mint(user1Address, getBigNumber(1000));
    await testToken.mint(user2Address, getBigNumber(1000));

    console.log(user1Address, user2Address);
    // testContract.receiveEther({value: ethers.utils.parseEther("10")});
    // testTokenSigner = await ethers.getSigner(testContract.address);

    // console.log("testToken balance is: ", formatUnits(await testTokenSigner.getBalance()));
    await depositContract.setupAdminRole(adminAddress);
    await depositContract.setupDepositRole(depositRoleAccount);

  })

  describe('DepositToken() test', async () => {
    const quantity = 3
    const amount = getBigNumber(661.5, decimal)
    const deadline = 1658168651
    const sign = "0xa0365d2b4330800151302672f03b9cd9ccc7f33baf2748de59665581d14cc8665d1aad283dccb73bb45bf50e987b609fcdae51890bb29255611630e283cda86d1c"
    it('Deadline expired', async () => {
      await expect(
        depositContract
        .connect(user2)
        .depositToken(
          quantity, 
          amount, 
          deadline-2000, 
          sign
        )
      ).to.be.revertedWith("Invalid expiration in deposit");
    })

    it('Wrong quantity variable', async () => {
      await expect(
        depositContract
        .connect(user2)
        .depositToken(
          quantity+1, 
          amount, 
          deadline, 
          sign
        )
      ).to.be.reverted;
    })

    it('Wrong amount variable', async () => {
      await expect(
        depositContract
        .connect(user2)
        .depositToken(
          quantity, 
          getBigNumber(500, decimal), 
          deadline, 
          sign
        )
      ).to.be.reverted;
    })

    it('Wrong deadline variable', async () => {
      await expect(
        depositContract
        .connect(user2)
        .depositToken(
          quantity, 
          amount, 
          deadline + 2000, 
          sign
        )
      ).to.be.reverted;
    })

    it('Wrong signature', async () => {
      await expect(
        depositContract
        .connect(user2)
        .depositToken(
          quantity, 
          amount, 
          deadline, 
          "0x523af0195ae6f4999d337cc2961ebc8185942185ba2b75af945f3afd714c185b49df4cd587ad8cf7bd6a2ae9a3350effcea86ef2d36ed01c6f6e107e7ec779361b"
        )
      ).to.be.reverted;
    })

    it('User didnt approve token amount before transfer', async () => {
      await expect(
        depositContract
        .connect(user2)
        .depositToken(
          quantity, 
          amount, 
          deadline, 
          sign
        )
      ).to.be.reverted;
    })

    it('Finally depositToken successed', async () => {
      await testToken.connect(user2).approve(depositContract.address, amount);
      await expect(
        depositContract
        .connect(user2)
        .depositToken(
          quantity, 
          amount, 
          deadline, 
          sign
        )
      ).to.emit(depositContract, "DepositedToken")
      .withArgs(testToken.address, user2Address, quantity, amount, 1);
    })
  })

  describe('withdrawToken() test', async () => {
    it('only admin can execute withdrawToken()', async () => {
      await expect(depositContract
        .connect(user1)
        .withdrawToken(user1Address, getBigNumber(50, decimal))
      ).to.be.reverted;
    })
    
    it('not allowed to withdraw insufficient amount', async () => {
      await expect(depositContract
        .connect(admin)
        .withdrawToken(user1Address, getBigNumber(5000, decimal))
      ).to.be.reverted;
    })

    it('admin withdraws 50 tokens to user1', async () => {
      await expect(depositContract
        .connect(admin)
        .withdrawToken(user1Address, getBigNumber(50, decimal))
      ).to.emit(depositContract, "WithdrawedToken")
      .withArgs(testToken.address, user1Address, getBigNumber(50, decimal));
    })

    it('admin withdraws 50 tokens to user2', async () => {
      await expect(depositContract
        .connect(admin)
        .withdrawToken(user2Address, getBigNumber(50, decimal))
      ).to.emit(depositContract, "WithdrawedToken")
      .withArgs(testToken.address, user2Address, getBigNumber(50, decimal));
    })

  })
});
