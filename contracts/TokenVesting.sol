// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// cannot create vesting schedule because not sufficient tokens
error InsufficientTokens();
/// duration must be > 0
error DurationInvalid();
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
/// When create vesting schedule, in case of start time should be future
error StartTimeInvalid();

contract TokenVesting is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    event CreatedVestingSchedule(address user, bytes32 scheduleId);

    /// <=============== STATE VARIABLES ===============>

    /// Polarys TOKEN
    IERC20 public immutable polarysToken;

    struct VestingSchedule {
        // beneficiary of tokens after they are released
        address beneficiary;
        // start time of the vesting period
        uint256 start;
        // cliffStart time in seconds
        uint256 cliffStart;
        // duration of the vesting period in seconds
        uint256 duration;
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
    mapping(address => uint256) private holdersVestingCount;

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

    /// @notice Creates a new vesting schedule for a beneficiary
    function createVestingSchedule(
        address _beneficiary,
        uint256 _start,
        uint256 _cliffDuration,
        uint256 _duration,
        uint256 _immediateReleaseAmount,
        uint256 _amountTotal,
        bool _revocable
    ) external onlyRole(VESTING_ROLE) {
        if (_beneficiary == address(0)) revert ZeroAddress();
        if (getWithdrawableAmount() < (_amountTotal + _immediateReleaseAmount)) revert InsufficientTokens();
        if (_duration == 0) revert DurationInvalid();
        if (_amountTotal == 0) revert AmountInvalid();
        if (_start <= block.timestamp) revert StartTimeInvalid();
        if (_cliffDuration > _duration) revert DurationInvalid();
        if (_cliffDuration > 365 days) revert DurationInvalid();

        bytes32 vestingScheduleId = computeNextVestingScheduleIdForHolder(
            _beneficiary
        );
        uint256 cliff = _start + _cliffDuration;
        vestingSchedules[vestingScheduleId] = VestingSchedule({
            beneficiary: _beneficiary,
            start: _start,
            cliffStart: cliff,
            duration: _duration,
            immediateVestedAmount: _immediateReleaseAmount,
            amountTotal: _amountTotal,
            released: 0,
            revocable: _revocable,
            revoked: false
        });
        vestingSchedulesTotalAmount = vestingSchedulesTotalAmount + _amountTotal + _immediateReleaseAmount;
        vestingSchedulesIds.push(vestingScheduleId);
        uint256 currentVestingCount = holdersVestingCount[_beneficiary];
        holdersVestingCount[_beneficiary] = currentVestingCount + 1;

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
        uint256 unreleased = vestingSchedule.amountTotal -
            vestingSchedule.released;
        vestingSchedulesTotalAmount = vestingSchedulesTotalAmount - unreleased;
        vestingSchedule.revoked = true;
        polarysToken.safeTransfer(treasury, unreleased);
        
        emit Revoked(vestingScheduleId, block.timestamp);
    }

    /// @notice Release vested amount of tokens.
    function release(bytes32 vestingScheduleId, uint256 amount)
        public
        nonReentrant
    {
        VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
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
    function computeNextVestingScheduleIdForHolder(address holder)
        public
        view
        returns (bytes32)
    {
        return
            computeVestingScheduleIdForAddressAndIndex(
                holder,
                holdersVestingCount[holder]
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
     * @notice Computes the vested amount of tokens for the given vesting schedule identifier.
     * @return the vested amount
     */
    function computeReleasableAmount(bytes32 vestingScheduleId)
        external
        view
        returns (uint256)
    {
        if (vestingSchedules[vestingScheduleId].revoked)
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
        uint256 currentTime = block.timestamp;
        if (currentTime < vestingSchedule.cliffStart) {
            return vestingSchedule.immediateVestedAmount - vestingSchedule.released;
        } else if (
            currentTime >= vestingSchedule.cliffStart + vestingSchedule.duration
        ) {
            return
                vestingSchedule.amountTotal +
                vestingSchedule.immediateVestedAmount -
                vestingSchedule.released;
        } else {
            uint256 timeFromStart = currentTime - vestingSchedule.cliffStart;
            uint256 vestedAmount = vestingSchedule.amountTotal * timeFromStart / vestingSchedule.duration;
            vestedAmount = vestedAmount + vestingSchedule.immediateVestedAmount - vestingSchedule.released;
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
}
