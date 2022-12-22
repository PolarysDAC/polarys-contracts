// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

/// cannot create vesting schedule because not sufficient tokens
error InsufficientTokens();
/// amount must be > 0
error AmountInvalid();
/// only beneficiary and owner can release vested tokens
error BeneficiaryOrOwner();
/// cannot release tokens, not enough vested tokens
error NotEnoughTokens();
/// Reverts if the vesting schedule has been revoked
error ScheduleRevoked();
/// Vesting is not revocable
error NotRevocable();
/// In case the address is zero
error ZeroAddress();
/// Vesting groupId is not set
error InvalidVestingGroupId();
/// Cannot set vesting StartTimestamp less than the current timestamp
error InvalidStartTimestamp();

contract TokenVesting is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    event CreatedVestingSchedule(address user, bytes32 scheduleId);

    event SetUnlockMonthSchedule(uint256 vestingGroupIndex, uint256[] monthUnlockPercentList);

    /// <=============== STATE VARIABLES ===============>

    /// Polarys TOKEN
    IERC20 public immutable polarysToken;

    struct VestingSchedule {
        // beneficiary of tokens after they are released
        address beneficiary;
        // vesting start timestamp
        uint256 startTimestamp;
        // vesting group id
        uint256 vestingGroupId;
        // the amount that is immediately vested at grant
        uint256 immediateVestedAmount;
        // total amount of tokens to be released at the end of the vesting EXCLUDING immediateVestedAmount
        uint256 amountTotal;
        // amount of tokens released
        uint256 released;
        // whether or not the vesting is revocable
        bool revocable;
        // whether or not the vesting has been revoked
        bool revoked;
    }

    bytes32 public constant VESTING_ROLE = keccak256("VESTING_ROLE");

    bytes32[] private vestingSchedulesIds;
    mapping(bytes32 => VestingSchedule) private vestingSchedules;
    uint256 private vestingSchedulesTotalAmount;
    mapping(address => uint256) private holdersVestingScheduleCount;
    mapping(uint256 => uint256[]) private _monthUnlockPercentSchedules;

    address private immutable treasury;

    event Released(
        address beneficiary,
        bytes32 vestingScheduleId,
        uint256 amount,
        uint256 releaseTimestamp
    );
    event Revoked(bytes32 vestingScheduleId, uint256 revokeTimestamp);

    constructor(IERC20 _polarysToken, address _treasury, address _owner) {
        require(_treasury != address(0), "Treasury can't be zero address");
        polarysToken = _polarysToken;
        treasury = _treasury;
        _setupRole(DEFAULT_ADMIN_ROLE, _owner);
    }

    /// @notice Setup vesting role 
    function setupVestingRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(VESTING_ROLE, account);
    }

    /// @notice Setup revoke role 
    function revokeVestingRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(VESTING_ROLE, account);
    }

    /**
     * @notice Set month unlock percents to vestingGroupId, this is performed by vestingRole account
     * @param vestingGroupIndex vesting group id, starts from 0
     * @param monthUnlockPercentList month unlock percents(%), has 2 decimals
     */
    function setUnlockMonthSchedule(uint256 vestingGroupIndex, uint256[] calldata monthUnlockPercentList) external onlyRole(VESTING_ROLE) {
        uint256[] memory monthPercentList = monthUnlockPercentList;
        uint256 monthCount = monthPercentList.length;
        uint256 totalPercents;
        for(uint256 i; i < monthCount; i = _unsafe_inc(i)) {
            unchecked {
                totalPercents = totalPercents + monthPercentList[i];
            }
            require(totalPercents <= 10000, "TotalPercent is limited to 100%");
        }
        _monthUnlockPercentSchedules[vestingGroupIndex] = monthPercentList;
        emit SetUnlockMonthSchedule(vestingGroupIndex, monthPercentList);
    }

    /** @notice Creates a new vesting schedule for a beneficiary
      * @param _beneficiary token recipient address 
      * @param _startTimestamp vesting start timestamp
      * @param _vestingGroupId vesting group id
      * @param _immediateReleaseAmount initial release amount for _beneficiary
      * @param _amountTotal total vesting amount exclude _immediateReleaseAmount
      * @param _revocable check whether revocable
    */ 
    function createVestingSchedule(
        address _beneficiary,
        uint256 _startTimestamp,
        uint256 _vestingGroupId,
        uint256 _immediateReleaseAmount,
        uint256 _amountTotal,
        bool _revocable
    ) external onlyRole(VESTING_ROLE) {
        if (_beneficiary == address(0)) revert ZeroAddress();
        if (_startTimestamp < block.timestamp) revert InvalidStartTimestamp();
        if (_monthUnlockPercentSchedules[_vestingGroupId].length == 0) revert InvalidVestingGroupId();
        if (getWithdrawableAmount() < (_amountTotal + _immediateReleaseAmount)) revert InsufficientTokens();
        if (_amountTotal == 0) revert AmountInvalid();

        bytes32 vestingScheduleId = _computeNextVestingScheduleIdForHolder(
            _beneficiary
        );
        vestingSchedules[vestingScheduleId] = VestingSchedule({
            beneficiary: _beneficiary,
            startTimestamp: _startTimestamp,
            vestingGroupId: _vestingGroupId,
            immediateVestedAmount: _immediateReleaseAmount,
            amountTotal: _amountTotal,
            released: 0,
            revocable: _revocable,
            revoked: false
        });
        vestingSchedulesTotalAmount = vestingSchedulesTotalAmount + _amountTotal + _immediateReleaseAmount;
        vestingSchedulesIds.push(vestingScheduleId);
        uint256 currentVestingCount = holdersVestingScheduleCount[_beneficiary];
        holdersVestingScheduleCount[_beneficiary] = currentVestingCount + 1;

        emit CreatedVestingSchedule(_beneficiary, vestingScheduleId);
    }

    /**
     * @notice Revokes the vesting schedule for given identifier.
     * @param vestingScheduleId the vesting schedule identifier
     */
    function revoke(bytes32 vestingScheduleId) external onlyRole(VESTING_ROLE) {
        VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
        if (vestingSchedule.revoked)
            revert ScheduleRevoked();
        if (!vestingSchedule.revocable) revert NotRevocable();
        uint256 releasableAmount = _computeReleasableAmount(vestingSchedule);
        if (releasableAmount > 0) {
            release(vestingScheduleId, releasableAmount);
        }
        unchecked {
            uint256 unreleased = vestingSchedule.amountTotal 
            + vestingSchedule.immediateVestedAmount
            - vestingSchedule.released;
            vestingSchedulesTotalAmount = vestingSchedulesTotalAmount - unreleased;
            vestingSchedule.revoked = true;
            polarysToken.safeTransfer(treasury, unreleased);
        }
        
        emit Revoked(vestingScheduleId, block.timestamp);
    }

    /// @notice Release vested amount of tokens.
    function release(bytes32 vestingScheduleId, uint256 amount)
        public
        nonReentrant
    {
        VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
        require(vestingSchedule.beneficiary != address(0), "Invalid vestingScheduleId");
        if (vestingSchedule.revoked)
            revert ScheduleRevoked();
        address beneficiary = vestingSchedule.beneficiary;
        bool isBeneficiary = msg.sender == beneficiary;
        bool isOwner = hasRole(VESTING_ROLE, msg.sender);
        if (!isBeneficiary && !isOwner) revert BeneficiaryOrOwner();
        uint256 releasableAmount = _computeReleasableAmount(vestingSchedule);
        if (releasableAmount < amount) revert NotEnoughTokens();
        vestingSchedule.released = vestingSchedule.released + amount;
        vestingSchedulesTotalAmount = vestingSchedulesTotalAmount - amount;
        polarysToken.safeTransfer(beneficiary, amount);
        emit Released(msg.sender, vestingScheduleId, amount, block.timestamp);
    }

    /// <=============== VIEWS ===============>

    /**
     * @dev Returns the amount of tokens that can be withdrawn by the owner.
     * @return the amount of tokens
     */
    function getWithdrawableAmount() public view returns (uint256) {
        return
            polarysToken.balanceOf(address(this)) - vestingSchedulesTotalAmount;
    }

    /**
     * @dev Computes the next vesting schedule identifier for a given holder address.
     */
    function _computeNextVestingScheduleIdForHolder(address holder)
        internal
        view
        returns (bytes32)
    {
        return
            computeVestingScheduleIdForAddressAndIndex(
                holder,
                holdersVestingScheduleCount[holder]
            );
    }

    /**
     * @dev Computes the vesting schedule identifier for an address and an index.
     */
    function computeVestingScheduleIdForAddressAndIndex(
        address holder,
        uint256 index
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(holder, index));
    }

    /**
     * @dev Computes all vesting schedule ids of vesting holders
     * @return vestingScheduleIds return all vesting schedule ids
     */
    function computeAllVestingScheduleIdsForAddress(
        address holder
    ) public view returns (bytes32[] memory vestingScheduleIds) {
        uint256 vestingScheduleCount = holdersVestingScheduleCount[holder];
        vestingScheduleIds = new bytes32[](vestingScheduleCount);
        for (uint256 index; index < vestingScheduleCount; index = _unsafe_inc(index)) {
            vestingScheduleIds[index] = keccak256(abi.encodePacked(holder, index));
        }
    }

    /**
     * @notice Computes the vested amount of tokens for the given vesting schedule identifier.
     * @return the vested amount
     */
    function computeReleasableAmount(bytes32 vestingScheduleId)
        external
        view
        returns (uint256)
    {   
        VestingSchedule memory memoryVestingSchedule = vestingSchedules[
            vestingScheduleId
        ];
        require(memoryVestingSchedule.beneficiary != address(0), "Invalid vestingScheduleId");
        if (memoryVestingSchedule.revoked)
            revert ScheduleRevoked();
        VestingSchedule storage vestingSchedule = vestingSchedules[
            vestingScheduleId
        ];
        return _computeReleasableAmount(vestingSchedule);
    }

    /**
     * @dev Computes the releasable amount of tokens for a vesting schedule.
     * @return the amount of releasable tokens
     */
    function _computeReleasableAmount(VestingSchedule memory vestingSchedule)
        internal
        view
        returns (uint256)
    {
        unchecked {
            uint256 currentTime = block.timestamp;
            uint256 vestedAmountByDefault = vestingSchedule.immediateVestedAmount - vestingSchedule.released;
            if (vestingSchedule.startTimestamp > currentTime) { // vesting is not started yet
                return vestedAmountByDefault;
            }
            uint256 monthCount = ((currentTime - vestingSchedule.startTimestamp) / 30 days) + 1;
            uint256[] memory monthUnlockPercentList = _monthUnlockPercentSchedules[vestingSchedule.vestingGroupId];
            if (monthCount > monthUnlockPercentList.length) {   // vesting period is ended
                return vestingSchedule.amountTotal + vestedAmountByDefault;
            }

            uint256 unlockPercent = monthUnlockPercentList[monthCount-1];
            if (unlockPercent == 0) {   // cliff period
                return vestedAmountByDefault;
            }
            
            // vesting period
            uint256 totalPercents;
            for (uint256 index; index < monthCount; ++ index) {
                totalPercents = totalPercents + monthUnlockPercentList[index];
            }
            uint256 vestedAmount = vestingSchedule.amountTotal * totalPercents / 10000;
            vestedAmount = vestedAmount + vestedAmountByDefault;
            return vestedAmount;
        }
    }

    /**
     * @notice Returns the vesting schedule information for a given identifier.
     * @return the vesting schedule structure information
     */
    function getVestingSchedule(bytes32 vestingScheduleId)
        public
        view
        returns (VestingSchedule memory)
    {
        return vestingSchedules[vestingScheduleId];
    }

    /**
     * @notice Returns the vesting schedule information for a given holder and index.
     * @return the vesting schedule structure information
     */
    function getVestingScheduleByAddressAndIndex(address holder, uint256 index)
        external
        view
        returns (VestingSchedule memory)
    {
        return
            getVestingSchedule(
                computeVestingScheduleIdForAddressAndIndex(holder, index)
            );
    }

    function _unsafe_inc(uint256 i) internal pure returns (uint256) {
        unchecked {
            return ++ i;
        }
    }
}
