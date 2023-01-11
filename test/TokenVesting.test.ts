import { expect } from 'chai';
import { ethers, network, upgrades } from 'hardhat';
const hre = require("hardhat");
import { parseUnits, formatUnits } from "ethers/lib/utils";
import { TokenVesting, PolarToken } from "../typechain-types";
import * as helpers from "@nomicfoundation/hardhat-network-helpers";

import {
  getBigNumber
} from './utils'
import { BigNumber, BigNumberish, Contract, Signer } from 'ethers';

type VestingAmounts = {
  amountTotal: BigNumber,
};
const vestingGroupMonthUnlockPercents = [
  // airdrops for NFT genesis holders
  [
    0, 250, 500, 500, 500, 500, 750, 750, 750, 1000, 1000, 1500, 2000
  ],
  // private sale
  [
    0, 0, 0, 0, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 409 
  ],
  // public sale
  [
    0, 0, 0, 0, 200, 200, 350, 500, 750, 750, 750, 1000, 1000, 1500, 1500, 1500 
  ],
]
const invalidVestingGroupMonthUnlockPercents1 = [
  [
    0, 0, 0, 0, 300, 200, 350, 500, 750, 750, 750, 1000, 1000, 1500, 1500, 1500 
  ],
  [
    0, 0, 0, 50000, 200, 200, 350, 500, 750, 750, 750, 1000, 1000, 1500, 1500, 1500 
  ],
  [
    0, 0, 0, 1000
  ],
]

const invalidVestingGroupMonthUnlockPercents2 = [
  [
    0, 0, 0, 500, 0, 0, 350
  ],
  [
    500, 350, 500, 750, 1000, 1000, 1500, 1500, 1500, 0
  ]
]

let aliceVestingScheduleIds: any[];
let bobVestingScheduleIds: any[];
const VESTING_TOKEN_AMOUNT = getBigNumber(500000);
const VESTING_TIME_DELAY = 60 * 5;  // 5 mins
const ONE_MONTH = 60 * 60 * 24 * 30;
let currentTimestamp: number;
const aliceVestingAmounts: VestingAmounts[] = [
  { // airdrops
    amountTotal: getBigNumber(100000)
  },
  { // private sale
    amountTotal: getBigNumber(100000)
  }
];

const bobVestingAmounts: VestingAmounts[] = [
  { // public sale
    amountTotal: getBigNumber(150000)
  }
];

describe('TokenVesting-Test', () => {
  let vestingContract: TokenVesting
  let polarTokenContract: PolarToken
  let owner: Signer
  let newOwner: Signer
  let treasury: Signer
  let alice: Signer
  let bob: Signer
  let vestingRole: Signer
  let ownerAddress: string
  let newOwnerAddress: string
  let treasuryAddress: string
  let aliceAddress: string
  let bobAddress: string
  let vestingRoleAddress: string

  before(async () => {
    [
      owner, 
      newOwner,
      treasury,
      alice,
      bob,
      vestingRole
    ] = await ethers.getSigners()
    ownerAddress = await owner.getAddress()
    newOwnerAddress = await newOwner.getAddress()
    treasuryAddress = await treasury.getAddress()
    aliceAddress = await alice.getAddress()
    bobAddress = await bob.getAddress()
    vestingRoleAddress = await vestingRole.getAddress()

    console.log('===================Deploying Contract=====================')

    const tokenFactory = await ethers.getContractFactory("PolarToken")
    polarTokenContract = (await tokenFactory.deploy(
      "POLAR Token", 
      "POLAR", 
      newOwnerAddress, 
      treasuryAddress, 
      getBigNumber("1000000000")
    )) as PolarToken
    await polarTokenContract.deployed()
    console.log('PolarToken deployed: ', polarTokenContract.address)

    const contractFactory = await ethers.getContractFactory("TokenVesting")
    vestingContract = (await contractFactory.deploy(
      polarTokenContract.address,
      treasuryAddress,
      newOwnerAddress
    )) as TokenVesting
    await vestingContract.deployed()
    console.log('VestingContract deployed: ', vestingContract.address)
    currentTimestamp = await helpers.time.latest();
  })

  describe('Set vesting role', async () => {
    it('Old owner cannot set vestingRole', async () => {
      await expect(
        vestingContract
        .setupVestingRole(vestingRoleAddress)
      ).to.be.revertedWith(
        `AccessControl: account ${ownerAddress.toLocaleLowerCase()} is missing role ${ethers.constants.HashZero}`
      );
    })
    it('Set vestingRole using new owner', async () => {
      await expect(
        vestingContract
        .connect(newOwner)
        .setupVestingRole(vestingRoleAddress)
      ).to.be.not.reverted;
    })
  });

  describe('Set unlock month schedule', async () => {
    it('Only vestingRole account can execute setUnlockMonthSchedule()', async () => {
      const vestingRoleHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VESTING_ROLE"));
      await expect(
        vestingContract
        .connect(newOwner)
        .setUnlockMonthSchedule(0, vestingGroupMonthUnlockPercents[0])
      ).to.be.revertedWith(
        `AccessControl: account ${newOwnerAddress.toLocaleLowerCase()} is missing role ${vestingRoleHash}`
      );
    })
    it('Invalid month unlock percents are given', async () => {
      for (let i = 0; i < invalidVestingGroupMonthUnlockPercents1.length; i ++) {
        await expect(
          vestingContract
          .connect(vestingRole)
          .setUnlockMonthSchedule(i, invalidVestingGroupMonthUnlockPercents1[i])
        ).to.be.revertedWith("TotalPercent is limited to 100%");
      }
    })
    it('Invalid month schedules', async () => {
      for (let i = 0; i < invalidVestingGroupMonthUnlockPercents2.length; i ++) {
        await expect(
          vestingContract
          .connect(vestingRole)
          .setUnlockMonthSchedule(i, invalidVestingGroupMonthUnlockPercents2[i])
        ).to.be.revertedWith("Invalid month schedules");
      }
    })
    it('Set setUnlockMonthSchedule()', async () => {
      for (let i = 0; i < vestingGroupMonthUnlockPercents.length; i ++) {
        await expect(
          vestingContract
          .connect(vestingRole)
          .setUnlockMonthSchedule(i, vestingGroupMonthUnlockPercents[i])
        ).to.emit(vestingContract, "SetUnlockMonthSchedule")
        .withArgs(i, vestingGroupMonthUnlockPercents[i]);
      }
    })
    it('Month schedule has already set', async () => {
      for (let i = 0; i < vestingGroupMonthUnlockPercents.length; i ++) {
        await expect(
          vestingContract
          .connect(vestingRole)
          .setUnlockMonthSchedule(i, vestingGroupMonthUnlockPercents[i])
        ).to.be.revertedWith("Month schedule has already set");
      }
    })
  });

  describe('Create Vesting Schedule', async () => {
    it('Only vestingRole account can execute createVestingSchedule()', async () => {
      const vestingRoleHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VESTING_ROLE"));
      await expect(
        vestingContract
        .connect(newOwner)
        .createVestingSchedule(
          aliceAddress, 
          currentTimestamp + 100,
          0,
          aliceVestingAmounts[0].amountTotal,
          true
        )
      ).to.be.revertedWith(
        `AccessControl: account ${newOwnerAddress.toLocaleLowerCase()} is missing role ${vestingRoleHash}`
      );
    })
    it('InvalidStartTimestamp', async () => {
      await expect(
        vestingContract
        .connect(vestingRole)
        .createVestingSchedule(
          aliceAddress, 
          currentTimestamp - 100,
          0,
          aliceVestingAmounts[0].amountTotal,
          true
        )
      ).to.be.revertedWith("InvalidStartTimestamp");
    })
    it('InvalidVestingGroupId', async () => {
      await expect(
        vestingContract
        .connect(vestingRole)
        .createVestingSchedule(
          aliceAddress, 
          currentTimestamp + 100,
          vestingGroupMonthUnlockPercents.length,
          aliceVestingAmounts[0].amountTotal,
          true
        )
      ).to.be.revertedWith("InvalidVestingGroupId");
    })
    it('InsufficientTokens', async () => {
      await expect(
        vestingContract
        .connect(vestingRole)
        .createVestingSchedule(
          aliceAddress, 
          currentTimestamp + 100,
          0,
          aliceVestingAmounts[0].amountTotal,
          true
        )
      ).to.be.revertedWith("InsufficientTokens");
    })
    it('Send POLAR tokens from treasury to vesting contract', async () => {
      await expect(
        polarTokenContract
        .connect(treasury)
        .transfer(vestingContract.address, VESTING_TOKEN_AMOUNT)
      ).to.be.not.reverted;
      expect(
        await polarTokenContract.balanceOf(vestingContract.address)
      ).to.equal(VESTING_TOKEN_AMOUNT);
    })
    it('InsufficientTokens despite vesting contract has POLAR tokens', async () => {
      await expect(
        vestingContract
        .connect(vestingRole)
        .createVestingSchedule(
          aliceAddress, 
          currentTimestamp + 100,
          0,
          getBigNumber('10000000'),
          true
        )
      ).to.be.revertedWith("InsufficientTokens");
    })
    it('AmountInvalid', async () => {
      await expect(
        vestingContract
        .connect(vestingRole)
        .createVestingSchedule(
          aliceAddress, 
          currentTimestamp + 100,
          0,
          0,
          true
        )
      ).to.be.revertedWith("AmountInvalid");
    })
    it('Create vesting schedules for Alice and Bob', async () => {
      await expect(
        vestingContract
        .connect(vestingRole)
        .createVestingSchedule(
          aliceAddress, 
          currentTimestamp + VESTING_TIME_DELAY,
          0,
          aliceVestingAmounts[0].amountTotal,
          true
        )
      ).to.be.not.reverted;

      await expect(
        vestingContract
        .connect(vestingRole)
        .createVestingSchedule(
          aliceAddress, 
          currentTimestamp + VESTING_TIME_DELAY,
          1,
          aliceVestingAmounts[1].amountTotal,
          false
        )
      ).to.be.not.reverted;
      
      await expect(
        vestingContract
        .connect(vestingRole)
        .createVestingSchedule(
          bobAddress, 
          currentTimestamp + VESTING_TIME_DELAY,
          2,
          bobVestingAmounts[0].amountTotal,
          true
        )
      ).to.be.not.reverted;
    })
  });
  describe('Get withdrawable amount', async () => {
    it('Check getWithdrawableAmount', async () => {
      const expectedAmount = VESTING_TOKEN_AMOUNT
        .sub(aliceVestingAmounts[0].amountTotal)
        .sub(aliceVestingAmounts[1].amountTotal)
        .sub(bobVestingAmounts[0].amountTotal)
      expect(await vestingContract.getWithdrawableAmount())
        .to.equal(expectedAmount);
      console.log("Withdrawal amount is: ", formatUnits(expectedAmount));
    })
  });

  describe('Compute all vesting scheduleIds for address', async () => {
    it('ComputeAllVestingScheduleIdsForAddress using alice and bob addresses', async () => {
      aliceVestingScheduleIds = await vestingContract
        .computeAllVestingScheduleIdsForAddress(aliceAddress)
      bobVestingScheduleIds = await vestingContract
        .computeAllVestingScheduleIdsForAddress(bobAddress)
      expect(
        aliceVestingScheduleIds
      ).to.be.length(2)
      expect(
        bobVestingScheduleIds
      ).to.be.length(1)
    })
    it('ComputeAllVestingScheduleIds using non-vesting scheduled address', async () => {
      expect(
        await vestingContract
        .computeAllVestingScheduleIdsForAddress(ownerAddress)
      ).to.be.length(0)
    })
  });

  describe('Compute releasable amount', async () => {
    let snapshot: any;
    before(async () => {
      snapshot = await helpers.takeSnapshot();
    })
    it('Invalid vestingScheduleId', async () => {
      await expect(
        vestingContract
        .computeReleasableAmount(ethers.constants.HashZero)
      ).to.be.revertedWith("Invalid vestingScheduleId");
    })
    it('ComputeReleasableAmount before vesting', async () => {
      expect(await vestingContract.computeReleasableAmount(aliceVestingScheduleIds[0]))
        .to.equal(0);
      expect(await vestingContract.computeReleasableAmount(aliceVestingScheduleIds[1]))
        .to.equal(0);
      expect(await vestingContract.computeReleasableAmount(bobVestingScheduleIds[0]))
        .to.equal(0);
    })
    it('ComputeReleasableAmount in the first month(Cliff period)', async () => {
      await helpers.time.increase(VESTING_TIME_DELAY + ONE_MONTH * 0.5);
      expect(await vestingContract.computeReleasableAmount(aliceVestingScheduleIds[0]))
        .to.equal(0);
      expect(await vestingContract.computeReleasableAmount(aliceVestingScheduleIds[1]))
        .to.equal(0);
      expect(await vestingContract.computeReleasableAmount(bobVestingScheduleIds[0]))
        .to.equal(0);
    })
    it('ComputeReleasableAmount in the 6th month(Vesting period)', async () => {
      await helpers.time.increase(VESTING_TIME_DELAY + ONE_MONTH * 5);

      const computedAmountForAlice1 = await vestingContract.computeReleasableAmount(aliceVestingScheduleIds[0]);
      const computedAmountForAlice2 = await vestingContract.computeReleasableAmount(aliceVestingScheduleIds[1]);
      const computedAmountForBob1 = await vestingContract.computeReleasableAmount(bobVestingScheduleIds[0]);
      const totalPercents: number[] = [0, 0, 0];
      for (let i = 0; i < 6; i ++) {
        totalPercents[0] += vestingGroupMonthUnlockPercents[0][i];
        totalPercents[1] += vestingGroupMonthUnlockPercents[1][i];
        totalPercents[2] += vestingGroupMonthUnlockPercents[2][i];
      }
      let expectedAmountForAlice1 = aliceVestingAmounts[0].amountTotal.mul(totalPercents[0]).div(10000);
      let expectedAmountForAlice2 = aliceVestingAmounts[1].amountTotal.mul(totalPercents[1]).div(10000);
      let expectedAmountForBob1 = bobVestingAmounts[0].amountTotal.mul(totalPercents[2]).div(10000);
      
      console.log("computedAmountForAlice1: ", formatUnits(computedAmountForAlice1));
      console.log("expectedAmountForAlice1: ", formatUnits(expectedAmountForAlice1));
      
      expect(computedAmountForAlice1)
        .to.equal(expectedAmountForAlice1);
      expect(computedAmountForAlice2)
        .to.equal(expectedAmountForAlice2);
      expect(computedAmountForBob1)
        .to.equal(expectedAmountForBob1);
    })
    it('ComputeReleasableAmount in the 40th month(Vesting ended)', async () => {
      await helpers.time.increase(VESTING_TIME_DELAY + ONE_MONTH * 40);

      const computedAmountForAlice1 = await vestingContract.computeReleasableAmount(aliceVestingScheduleIds[0]);
      const computedAmountForAlice2 = await vestingContract.computeReleasableAmount(aliceVestingScheduleIds[1]);
      const computedAmountForBob1 = await vestingContract.computeReleasableAmount(bobVestingScheduleIds[0]);
      let expectedAmountForAlice1 = aliceVestingAmounts[0].amountTotal;
      let expectedAmountForAlice2 = aliceVestingAmounts[1].amountTotal; 
      let expectedAmountForBob1 = bobVestingAmounts[0].amountTotal;

      console.log("computedAmountForAlice1: ", formatUnits(computedAmountForAlice1));
      console.log("expectedAmountForAlice1: ", formatUnits(expectedAmountForAlice1));
      
      expect(computedAmountForAlice1)
        .to.equal(expectedAmountForAlice1);
      expect(computedAmountForAlice2)
        .to.equal(expectedAmountForAlice2);
      expect(computedAmountForBob1)
        .to.equal(expectedAmountForBob1);
    })
    after(async () => {
      await snapshot.restore();
    })
  });

  describe('Release vested POLAR tokens', async () => {
    let snapshot: any;
    before(async () => {
      snapshot = await helpers.takeSnapshot();
    })
    it('Invalid vestingScheduleId', async () => {
      await expect(
        vestingContract
        .connect(alice)
        .release(ethers.constants.HashZero, getBigNumber(100000))
      ).to.be.revertedWith("Invalid vestingScheduleId");
    })
    it('Invalid BeneficiaryOrOwner', async () => {
      await expect(
        vestingContract
        .connect(alice)
        .release(bobVestingScheduleIds[0], getBigNumber(100000))
      ).to.be.revertedWith("BeneficiaryOrOwner");

      await expect(
        vestingContract
        .connect(owner)
        .release(bobVestingScheduleIds[0], getBigNumber(100000))
      ).to.be.revertedWith("BeneficiaryOrOwner");
    })
    it('Not enough tokens', async () => {
      await expect(
        vestingContract
        .connect(alice)
        .release(
          aliceVestingScheduleIds[0], 
          getBigNumber("10")
        )
      ).to.be.revertedWith("NotEnoughTokens");

      await expect(
        vestingContract
        .connect(alice)
        .release(
          aliceVestingScheduleIds[0], 
          aliceVestingAmounts[0].amountTotal
          .add("100")
        )
      ).to.be.revertedWith("NotEnoughTokens");
    })
    it('Release full test', async () => {
      let alicePolarTokenAmounts: any;
      let bobPolarTokenAmounts: any;
      // alice releases immediateReleaseAmount from start
      let computedAmountForAlice1 = await vestingContract.computeReleasableAmount(aliceVestingScheduleIds[0]);
      await expect(
        vestingContract
        .connect(alice)
        .release(
          aliceVestingScheduleIds[0], 
          computedAmountForAlice1.add("10")
        )
      ).to.be.revertedWith("NotEnoughTokens");

      await expect(
        vestingContract
        .connect(alice)
        .release(
          aliceVestingScheduleIds[0], 
          computedAmountForAlice1
        )
      ).to.be.not.reverted;
      expect(await polarTokenContract.balanceOf(aliceAddress)).to.equal(computedAmountForAlice1);
      alicePolarTokenAmounts = computedAmountForAlice1;
      
      // increase timestamp to 6th month of vesting period
      await helpers.time.increase(VESTING_TIME_DELAY + ONE_MONTH * 5.5);

      computedAmountForAlice1 = await vestingContract.computeReleasableAmount(aliceVestingScheduleIds[0]);
      
      // alice releases vested tokens
      await expect(
        vestingContract
        .connect(alice)
        .release(
          aliceVestingScheduleIds[0],
          computedAmountForAlice1.add("10")
        )
      ).to.be.revertedWith("NotEnoughTokens");

      await expect(
        vestingContract
        .connect(alice)
        .release(
          aliceVestingScheduleIds[0], 
          computedAmountForAlice1
        )
      ).to.be.not.reverted;
      
      expect(await polarTokenContract.balanceOf(aliceAddress)).to.equal(alicePolarTokenAmounts.add(computedAmountForAlice1));
      alicePolarTokenAmounts = alicePolarTokenAmounts.add(computedAmountForAlice1);

      // vestingRole account releases vested tokens for bob
      let computedAmountForBob1 = await vestingContract.computeReleasableAmount(bobVestingScheduleIds[0]);
      await expect(
        vestingContract
        .connect(vestingRole)
        .release(
          bobVestingScheduleIds[0], 
          computedAmountForBob1
          .add("100")
        )
      ).to.be.revertedWith("NotEnoughTokens");

      await expect(
        vestingContract
        .connect(vestingRole)
        .release(
          bobVestingScheduleIds[0], 
          computedAmountForBob1
        )
      ).to.be.not.reverted;
      expect(await polarTokenContract.balanceOf(bobAddress)).to.equal(computedAmountForBob1);
      bobPolarTokenAmounts = computedAmountForBob1;

      // increase timestamp to 7th month of vesting period
      await helpers.time.increase(VESTING_TIME_DELAY + ONE_MONTH * 1.1);
      
      // alice releases vested tokens
      computedAmountForAlice1 = await vestingContract.computeReleasableAmount(aliceVestingScheduleIds[0]);
      await expect(
        vestingContract
        .connect(alice)
        .release(
          aliceVestingScheduleIds[0], 
          computedAmountForAlice1
        )
      ).to.be.not.reverted;
      
      expect(await polarTokenContract.balanceOf(aliceAddress)).to.equal(alicePolarTokenAmounts.add(computedAmountForAlice1));
      alicePolarTokenAmounts = alicePolarTokenAmounts.add(computedAmountForAlice1)

      // vesting role revoke vesting schedule to bob
      let treauryPolarTokenAmounts = await polarTokenContract.balanceOf(treasuryAddress);
      computedAmountForBob1 = await vestingContract.computeReleasableAmount(bobVestingScheduleIds[0]);
      await expect(
        vestingContract
        .connect(vestingRole)
        .revoke(
          bobVestingScheduleIds[0]
        )
      ).to.be.not.reverted;
      expect(await polarTokenContract.balanceOf(bobAddress)).to.equal(bobPolarTokenAmounts.add(computedAmountForBob1));
      bobPolarTokenAmounts = bobPolarTokenAmounts.add(computedAmountForBob1);
      
      // check polar token amounts on treasury wallet after revoked
      expect(await polarTokenContract.balanceOf(treasuryAddress)).to.equal(
        treauryPolarTokenAmounts
        .add(bobVestingAmounts[0].amountTotal)
        .sub(bobPolarTokenAmounts)
      );

      // bob can't release tokens anymore
      await expect(
        vestingContract
        .connect(bob)
        .release(
          bobVestingScheduleIds[0], 
          getBigNumber('10000')
        )
      ).to.be.revertedWith("ScheduleRevoked");

      // increase timestamp to 40th month of vesting period, now vesting is ended
      await helpers.time.increase(VESTING_TIME_DELAY + ONE_MONTH * 40);

      // alice releases all vested tokens
      computedAmountForAlice1 = await vestingContract.computeReleasableAmount(aliceVestingScheduleIds[0]);
      
      await expect(
        vestingContract
        .connect(alice)
        .release(
          aliceVestingScheduleIds[0], 
          computedAmountForAlice1
        )
      ).to.be.not.reverted;
      
      expect(await polarTokenContract.balanceOf(aliceAddress)).to.equal(alicePolarTokenAmounts.add(computedAmountForAlice1));
      alicePolarTokenAmounts = alicePolarTokenAmounts.add(computedAmountForAlice1);
      
      expect(alicePolarTokenAmounts).to.equal(
        aliceVestingAmounts[0].amountTotal
      );
    })
    after(async () => {
      await snapshot.restore();
    })
  });

  describe('Revoke vesting schedules', async () => {
    it('Not revocable', async () => {
      await expect(
        vestingContract
        .connect(vestingRole)
        .revoke(
          ethers.constants.HashZero
        )
      ).to.be.revertedWith("NotRevocable");

      await expect(
        vestingContract
        .connect(vestingRole)
        .revoke(
          aliceVestingScheduleIds[1]
        )
      ).to.be.revertedWith("NotRevocable");
    })
    it('Cannot revoke twice times', async () => {
      await expect(
        vestingContract
        .connect(vestingRole)
        .revoke(
          bobVestingScheduleIds[0]
        )
      ).to.be.not.reverted;
      await expect(
        vestingContract
        .connect(vestingRole)
        .revoke(
          bobVestingScheduleIds[0]
        )
      ).to.be.revertedWith("ScheduleRevoked");
    })
  });
});
