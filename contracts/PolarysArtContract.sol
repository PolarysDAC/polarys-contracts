// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import '@openzeppelin/contracts/utils/Strings.sol';
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract PolarysArtContract is ERC721Enumerable, ERC2981, AccessControl, ReentrancyGuard {

    using Counters for Counters.Counter;
    Counters.Counter private currentTokenId;
    
    event SetRoyaltyFee(uint96 fee);
    event SetBaseURI(string baseURI);

    string private baseURI;
    uint256 private constant MAX_SUPPLY = 1000;
    uint96 private _royaltyFee;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(
        string memory name_, 
        string memory symbol_,
        string memory baseURI_,
        address owner,
        address minter
    ) ERC721(name_, symbol_) {
        baseURI = baseURI_;
        _setupRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(MINTER_ROLE, minter);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Enumerable, AccessControl, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
    @dev Setup minter role
     */
    function setupMinterRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, account);
    }

    function setRoyaltyFee(uint96 fee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(fee < 100 * 1e2, "Incorrect royalty fee");
        _royaltyFee = fee;
        emit SetRoyaltyFee(fee);
    }

    function getRoyaltyFee() view external returns(uint96) {
        return _royaltyFee;
    }
    
    /**
     * Set base URI of NFT
     */
    function setBaseURI(string calldata uri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        baseURI = uri;
        emit SetBaseURI(uri);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function getBaseURI() external view returns (string memory) {
        return _baseURI();
    }

    /**
     * @dev Mint NFT
     * Only MINTER_ROLE account can execute mint function
     * @param to recipient address
     */
    function mint(address to) external onlyRole(MINTER_ROLE) nonReentrant {
        require(to.code.length == 0, "Can not mint NFT to contract address");
        uint256 totalSupply = totalSupply();
        require(totalSupply + 1 <= MAX_SUPPLY, "Can not mint NFT more than MAX_SUPPLY");
        
        currentTokenId.increment();
        uint256 newItemId = currentTokenId.current();
        _mint(to, newItemId);
        _setTokenRoyalty(newItemId, to, _royaltyFee);
    }
}