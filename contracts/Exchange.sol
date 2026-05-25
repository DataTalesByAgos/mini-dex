// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Exchange is Ownable {
    IERC20 public immutable tokenA;
    IERC20 public immutable tokenB;

    uint256 public constant RATE = 2;
    uint256 public constant FEE_NOMINATOR = 3;
    uint256 public constant FEE_DENOMINATOR = 1000;

    event Swap(address indexed user, uint256 amountA, uint256 amountB);
    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB);
    event LiquidityWithdrawn(address indexed owner, uint256 amountA, uint256 amountB);

    constructor(address _tokenA, address _tokenB) Ownable(msg.sender) {
        require(_tokenA != address(0) && _tokenB != address(0), "Invalid token addresses");
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    function getAmountOut(uint256 amountIn, bool isAForB) public pure returns (uint256 amountOut, uint256 fee) {
        require(amountIn > 0, "Amount must be greater than 0");
        fee = (amountIn * FEE_NOMINATOR) / FEE_DENOMINATOR;
        uint256 netAmountIn = amountIn - fee;
        
        if (isAForB) {
            amountOut = netAmountIn * RATE;
        } else {
            amountOut = netAmountIn / RATE;
        }
    }

    function swapAForB(uint256 amountA) external {
        require(amountA > 0, "Amount must be greater than 0");
        
        (uint256 amountB, ) = getAmountOut(amountA, true);
        require(amountB > 0, "Output amount too small");
        require(tokenB.balanceOf(address(this)) >= amountB, "Insufficient Exchange liquidity");
        
        require(tokenA.transferFrom(msg.sender, address(this), amountA), "Token A transfer failed");
        require(tokenB.transfer(msg.sender, amountB), "Token B transfer failed");
        
        emit Swap(msg.sender, amountA, amountB);
    }

    function swapBForA(uint256 amountB) external {
        require(amountB > 0, "Amount must be greater than 0");
        
        (uint256 amountA, ) = getAmountOut(amountB, false);
        require(amountA > 0, "Output amount too small");
        require(tokenA.balanceOf(address(this)) >= amountA, "Insufficient Exchange liquidity");
        
        require(tokenB.transferFrom(msg.sender, address(this), amountB), "Token B transfer failed");
        require(tokenA.transfer(msg.sender, amountA), "Token A transfer failed");
        
        emit Swap(msg.sender, amountA, amountB);
    }

    function withdrawToken(address tokenAddress, uint256 amount) external onlyOwner {
        require(tokenAddress == address(tokenA) || tokenAddress == address(tokenB), "Invalid token");
        IERC20(tokenAddress).transfer(msg.sender, amount);
        emit LiquidityWithdrawn(msg.sender, tokenAddress == address(tokenA) ? amount : 0, tokenAddress == address(tokenB) ? amount : 0);
    }
}
