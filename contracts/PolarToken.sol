// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/// @title Polarys Token - $POLAR
/// @dev Based on OpenZeppelin Contracts.
contract PolarToken is ERC20, ERC20Pausable, ERC20Burnable, Ownable {
    
    event StartedPrivateSale(SaleStatus indexed saleStatus, uint256 timestamp);
    event EndedPrivateSale(SaleStatus indexed saleStatus, uint256 timestamp);
    event AddedWhiteAddress(address indexed account);
    event RemovedWhiteAddress(address indexed account);

    enum SaleStatus {
        NOT_STARTED,
        PRIVATE_SALE,
        PUBLIC_SALE
    }
    SaleStatus private _saleStatus;

    mapping(address => bool) private _whitelist;

    /// @notice Token constructor
    /// @dev Creates the token and setup the initial supply and the Admin Role.
    /// @param name Name of the Token
    /// @param symbol Symbol of the token
    /// @param _treasury Treasury address
    /// @param _treasurySupply Treasury supply
    constructor(
        string memory name,
        string memory symbol,
        address _owner,
        address _treasury,
        uint256 _treasurySupply
    ) ERC20(name, symbol) {
        require(_treasury != address(0), "Treasury can't be zero address");
        require(_owner != address(0), "Owner can't be zero address");
        _mint(_treasury, _treasurySupply);
        _transferOwnership(_owner);
    }
    
    function getSaleStatus() view external returns (SaleStatus) {
        return _saleStatus;
    }
    
    function startPrivateSale() external onlyOwner {
        require(_saleStatus == SaleStatus.NOT_STARTED, "Only allowed if status is not started");
        _saleStatus = SaleStatus.PRIVATE_SALE;
        emit StartedPrivateSale(_saleStatus, block.timestamp);
    }

    function endPrivateSale() external onlyOwner {
        require(_saleStatus == SaleStatus.PRIVATE_SALE, "Only allowed if status is private sale");
        _saleStatus = SaleStatus.PUBLIC_SALE;
        emit EndedPrivateSale(_saleStatus, block.timestamp);
    }

    function addWhiteAddress(address account) external onlyOwner {
        _whitelist[account] = true;
        emit AddedWhiteAddress(account);
    }

    function removeWhiteAddress(address account) external onlyOwner {
        _whitelist[account] = false;
        emit RemovedWhiteAddress(account);
    }

    function isWhitelisted(address account) external view returns (bool) {
        return _whitelist[account];
    }

    /// @notice Pauses the contract
    /// @dev It stops transfer from happening. Only Owner can call it.
    function pause() public virtual onlyOwner {
        _pause();
    }

    /// @notice Unpauses the contract
    /// @dev Transfers are possible again. Only Owner can call it.
    function unpause() public virtual onlyOwner {
        _unpause();
    }

    /// @notice Verifications before Token Transfer
    /// @param from Address from
    /// @param from to Address from
    /// @param amount tokens to be transferred
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
