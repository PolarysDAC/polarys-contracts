// SPDX-License-Identifier: MIT

pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract PolarDepositContract is AccessControl, EIP712 {
    using SafeERC20 for IERC20;
    
    event DepositedToken(address indexed tokenAddress, address indexed sender, uint256 quantity, uint256 amount);
    event WithdrawedToken(address indexed tokenAddress, address indexed recipient, uint256 amount);
    
    error InvalidPrivateSaleAddress(address account);

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DEPOSIT_ROLE = keccak256("DEPOSIT_ROLE");
    
    bytes32 constant public DEPOSIT_TYPEHASH = keccak256("DepositToken(address account,uint256 quantity,uint256 amount,uint256 deadline,uint256 status)");

    address private immutable _acceptToken;

    mapping(uint256 => uint256) private _totalSalesByStatus;

    bytes32 public immutable merkleRoot;

    constructor(address acceptToken, bytes32 merkleRoot_) EIP712("PolarDepositContract", "1.0.0") {
        _acceptToken = acceptToken;
        merkleRoot = merkleRoot_;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /**
    @dev Setup multisig admin role
     */
    function setupAdminRole(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ADMIN_ROLE, admin);
    }

    /**
    @dev Setup deposit role
     */
    function setupDepositRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(DEPOSIT_ROLE, account);
    }
    

    function getTotalSales(uint256 status) view external returns(uint256) {
        return _totalSalesByStatus[status];
    }

    /**
    @dev Deposit Token
    @param quantity NFT items quantity
    @param amount deposit token amount
    @param deadline deposit deadline
    @param signature hashed signature
    * Contract can not execute this function
    */
    function depositToken(
        uint256 quantity, 
        uint256 amount, 
        uint256 deadline, 
        uint256 status, 
        bytes calldata signature,
        bytes32[] calldata merkleProof
    ) external {
        require(_msgSender() == tx.origin, "Contract address is not allowed");
        require(block.timestamp <= deadline, "Invalid expiration in deposit");
        require(status > 0, "Sale is not started yet");
        require(_verify(_hash(_msgSender(), quantity, amount, deadline, status), signature), "Invalid signature");

        // if status is private_sale
        if (status == 1) {
            if (merkleProof.length > 0) {
                // Verify the merkle proof.
                require(MerkleProof.verify(merkleProof, merkleRoot, keccak256(abi.encodePacked(_msgSender()))), 'MerkleDistributor: Invalid proof.');
            } else {
                revert InvalidPrivateSaleAddress(_msgSender());
            }
        }
        _totalSalesByStatus[status] += quantity;
        IERC20(_acceptToken).safeTransferFrom(_msgSender(), address(this), amount);
        emit DepositedToken(_acceptToken, _msgSender(), quantity, amount);
    }
    
    function _hash(address account, uint256 quantity, uint256 amount, uint256 deadline, uint256 status)
    internal view returns (bytes32)
    {
        return _hashTypedDataV4(keccak256(abi.encode(
            DEPOSIT_TYPEHASH,
            account,
            quantity,
            amount,
            deadline,
            status
        )));
    }

    function _verify(bytes32 digest, bytes memory signature)
    internal view returns (bool)
    {
        return hasRole(DEPOSIT_ROLE, ECDSA.recover(digest, signature));
    }

    /**
    @dev Withdraw Token
    * only Admin can execute this function
     */
    function withdrawToken(address recipient, uint256 amount) external onlyRole(ADMIN_ROLE) {
        IERC20(_acceptToken).safeTransfer(recipient, amount);
        emit WithdrawedToken(_acceptToken, recipient, amount);
    }
}