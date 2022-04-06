// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./v2-periphery/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";


// Follow by addLiquidity from txpool pending
contract BevBot is OwnableUpgradeable {
    // 1. constants
    uint256 public constant SLIPPAGE_SCALE = 100;

    /* ------------------- storage ------------------- */
    // 2. global config
    IUniswapV2Router02 router;
    uint256 testAmountIn;
    uint256 public canAcceptMaxSlippage;

    // 3. target config
    // target config for quick bot
    address public targetToken;
    // token => buy token config
    mapping(address => Config) public targetConfigMap;
    // history sell token set
    address[] public allSellTokens;
    address[] public receivers;

    uint256 public sendIntervalMS;
    /* ------------------- storage ------------------- */

    struct Config {
        // before swap
        uint256 serviceStartAt;
        uint256 serviceEndAt;
        uint256 amountInByWBNB;
        uint256 canAcceptTargetAmountOut;

        // swap config
        uint256 gasLimit;
        uint256 sendCountsPerAccount;
        uint256 sendTxAccCounts;

        // after swap
        uint256 boughtAmount;

        uint256 lpBNBAmountThreshold;
    }

    receive() external payable {}

    function initialize(address _router, address[] memory _whitelistSet)
    public
    initializer
    {
        __Ownable_init();
        router = IUniswapV2Router02(_router);
        for (uint256 i = 0; i < _whitelistSet.length; i++) {
            IERC20Upgradeable(_whitelistSet[i]).approve(_router, ~uint256(0));
        }
        testAmountIn = 1e13;
        canAcceptMaxSlippage = 50;
    }

/*  ------------------------ 1. onlyOwner ------------------------ */
    function setSlippage(uint256 _canAcceptMaxSlippage) external onlyOwner {
        canAcceptMaxSlippage = _canAcceptMaxSlippage;
    }

    function setTestAmountIn(uint256 _testAmountIn) external onlyOwner {
        require(_testAmountIn < 1e18, 'MultiBevBot: test amount should less than 1 WBNB');
        testAmountIn = _testAmountIn;
    }

    function transferToken(address tokenAddress, address to)
    external
    onlyOwner
    {
        // transfer BNB
        if (tokenAddress == address(0)) {
            _safeTransferETH(to, address(this).balance);
            return;
        }

        // transfer token
        IERC20Upgradeable(tokenAddress).transfer(
            to,
            IERC20Upgradeable(tokenAddress).balanceOf(address(this))
        );
    }

    function setTargetToken(
        address _target,
        address[] calldata _receivers,

        uint256 _amountInByWBNB,
        uint256 _canAcceptTargetAmountOut,

        uint256 _gasLimit,
        uint256 _sendCountsPerAccount,
        uint256 _sendTxAccCounts,

        uint256 _lpBNBAmountThreshold,

        uint256 _sendIntervalMS
    )
    external
    onlyOwner
    {
        if (targetConfigMap[_target].amountInByWBNB == 0) {
            // buy at first time
            allSellTokens.push(_target);
        }

        {
            targetToken = _target;
            require(_receivers.length > 0, "Empty receivers");
            receivers = _receivers;
        }

        targetConfigMap[_target].amountInByWBNB = _amountInByWBNB;
        targetConfigMap[_target].canAcceptTargetAmountOut = _canAcceptTargetAmountOut;

        targetConfigMap[_target].gasLimit = _gasLimit;
        targetConfigMap[_target].sendCountsPerAccount = _sendCountsPerAccount;
        targetConfigMap[_target].sendTxAccCounts = _sendTxAccCounts;

        targetConfigMap[_target].lpBNBAmountThreshold = _lpBNBAmountThreshold;

        sendIntervalMS = _sendIntervalMS;
    }



/*  ------------------------ 2. external ------------------------ */
    function BuyTokenByToken(address[] calldata path)
    external
    returns (uint256[] memory amounts)
    {
        address _target = path[path.length - 1];
        Config storage config = targetConfigMap[_target];
        require(config.boughtAmount == 0, "targetToken already bought");
        require(receivers.length > 0, "empty receivers");
        require(
            path[0] == IUniswapV2Router02(router).WETH(),
            "path[0] is not WETH token"
        );

        // 1. test check
        _testSwapTokenForToken(path);

        // 2. real buy
        uint256 beforeTargetBalance = IERC20Upgradeable(_target).balanceOf(owner());

        uint256 _amountIn = config.amountInByWBNB;
        amounts = router.getAmountsOut(_amountIn, path);
        address _receiver = receivers[0];
        (bool buySuccess,) = address(router).call(
            abi.encodeWithSelector(
                0x5c11d795,
                _amountIn,
                config.canAcceptTargetAmountOut,
                path,
                _receiver,
                block.timestamp
            )
        );
        require(buySuccess, "failed to buy");

        // 3. update config
        config.boughtAmount = IERC20Upgradeable(_target).balanceOf(owner()) - beforeTargetBalance;
    }

/*  ------------------------ 3. internal ------------------------ */
    function _testSwapTokenForToken(address[] calldata path) internal {
        address to = address(this);
        address _source = path[0];
        address _target = path[path.length - 1];

        uint256 beforeBuy = IERC20Upgradeable(_target).balanceOf(to);
        uint256[] memory amounts = router.getAmountsOut(testAmountIn, path);
        (bool buySuccess, ) = address(router).call(
            abi.encodeWithSelector(
                0x5c11d795,
                testAmountIn,
                0,
                path,
                to,
                block.timestamp
            )
        );
        uint256 actualBuyAmount = IERC20Upgradeable(_target).balanceOf(to) - beforeBuy;
        require(buySuccess && actualBuyAmount > 0, "Test buy failed");

        address[] memory sellPath = new address[](path.length);
        for (uint256 i = 0; i < path.length; i++) {
            sellPath[i] = path[path.length - 1 - i];
        }

        uint256 beforeSell = IERC20Upgradeable(_source).balanceOf(to);
        IERC20Upgradeable(sellPath[0]).approve(address(router), ~uint256(0));

        (bool sellSuccess, ) = address(router).call(
            abi.encodeWithSelector(
                0x5c11d795,
                actualBuyAmount * 8 / 10,
                0,
                sellPath,
                to,
                block.timestamp
            )
        );
        require(sellSuccess, "Test sell failed");
        uint256 actualSellAmount = IERC20Upgradeable(_source).balanceOf(to) - beforeSell;

        require(
            actualSellAmount >= testAmountIn * (SLIPPAGE_SCALE - canAcceptMaxSlippage) / SLIPPAGE_SCALE,
            "Sell amount is too low"
        );
    }

    function _safeTransferETH(address to, uint256 value) internal {
        (bool success,) = to.call{gas : 2300, value : value}("");
        require(success, "transfer eth failed");
    }

    /*  ------------------------ 4. view ------------------------ */
    function getTarget()
    external
    view
    returns(
        address targetTokenAddress,
        uint256 gasLimit,
        uint256 sendCountsPerAccount,
        uint256 sendTxAccCounts,
        uint256 lpBNBAmountThreshold,
        uint256 sendIntervalMS
    ) {
        Config memory config = targetConfigMap[targetToken];
        return (
            targetToken,
            config.gasLimit,
            config.sendCountsPerAccount,
            config.sendTxAccCounts,
            config.lpBNBAmountThreshold,
            sendIntervalMS
        );
    }
}
