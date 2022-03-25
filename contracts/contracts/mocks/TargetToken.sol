pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TargetToken is ERC20 {
    constructor() ERC20("TargetToken", "TargetToken") {
        _mint(msg.sender, 1e8 * 1e18);
    }

    function mint(address user, uint256 amount) public {
        _mint(user, amount);
    }

    function burn(uint256 amount) public  {
        _burn(msg.sender, amount);
    }
}
