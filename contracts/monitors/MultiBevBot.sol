// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./v2-periphery/interfaces/IUniswapV2Router02.sol";
import "./v2-periphery/interfaces/IUniswapV2Pair.sol";
import "./v2-periphery/libraries/UniswapV2Library.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "hardhat/console.sol";


contract MultiBevBot is OwnableUpgradeable {
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
    string public targetSymbol;
    address[] receivers;
    // token => buy token config
    mapping(address => Config) public targetConfigMap;
    // history sell token set
    address[] public allSellTokens;

    uint256 public sendIntervalMS;
    /* ------------------- storage ------------------- */

    struct Config {
        // before swap
        uint256 serviceStartAt;
        uint256 serviceEndAt;
        uint256 amountOutPerReceiverByTarget;
        uint256 canAcceptMaxWBNBAmountIn;

        // swap config
        uint256 gasLimit;
        uint256 sendCountsPerAccount;
        uint256 sendTxAccCounts;

        // after swap
        uint256 boughtAmount;
        uint256 sellSlippage;
        uint256 soldWBNBAmount;

        uint256 lpBNBAmountThreshold;  //
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
        IERC20Upgradeable(tokenAddress).transfer(
            to,
            IERC20Upgradeable(tokenAddress).balanceOf(address(this))
        );
    }


    function setTargetToken(
        address _target,
        address[] calldata _receivers,

        uint256 _amountOutPerReceiverByTarget,
        uint256 _canAcceptMaxWBNBAmountIn,
        uint256 _sellSlippage,

        uint256 _gasLimit,
        uint256 _sendTxAccCounts,
        uint256 _sendCountsPerAccount,

        uint256 _lpBNBAmountThreshold,

        uint256 _sendIntervalMS
    )
    external
    onlyOwner
    {
        {
            targetToken = _target;
            require(_receivers.length > 0, "Empty receivers");
            receivers = _receivers;
        }

        {
            targetConfigMap[targetToken].amountOutPerReceiverByTarget = _amountOutPerReceiverByTarget;
            targetConfigMap[targetToken].canAcceptMaxWBNBAmountIn = _canAcceptMaxWBNBAmountIn;
            targetConfigMap[targetToken].sellSlippage = _sellSlippage;

        }

        {
            targetConfigMap[targetToken].gasLimit = _gasLimit;
            targetConfigMap[targetToken].sendCountsPerAccount = _sendCountsPerAccount;
            targetConfigMap[targetToken].sendTxAccCounts = _sendTxAccCounts;
            targetConfigMap[targetToken].lpBNBAmountThreshold = _lpBNBAmountThreshold;
        }

        sendIntervalMS = _sendIntervalMS;
    }


    function restartCurrentTarget()
    external
    onlyOwner
    {
        targetConfigMap[targetToken].boughtAmount = 0;
    }

/*  ------------------------ 2. external ------------------------ */
    function BuyTokenByToken(address[] calldata path)
    external
    {
        address _target = path[path.length - 1];
        Config storage config = targetConfigMap[_target];
        require(config.boughtAmount == 0, "targetToken already bought");
        require(
            path[0] == IUniswapV2Router02(router).WETH(),
            "path[0] is not WETH token"
        );

        // 1. test check
        _testSwapTokenForToken(path);

        // 2. real buy
        uint256 _amountOut = config.amountOutPerReceiverByTarget;
        uint256 _canAcceptMinAmountOut = _amountOut * (SLIPPAGE_SCALE - canAcceptMaxSlippage) / SLIPPAGE_SCALE;
        address _receiver;
        uint256 beforeTargetBalance;
        uint256 _boughtAmount;
        for (uint256 i = 0; i < receivers.length; i++) {
            _receiver = receivers[i];
            beforeTargetBalance = IERC20Upgradeable(_target).balanceOf(_receiver);

            (bool buySuccess,) = address(router).call(
                abi.encodeWithSelector(
                    0x8803dbee,  //  swapTokensForExactTokens
                    _amountOut,
                    config.canAcceptMaxWBNBAmountIn,
                    path,
                    _receiver,   // multi receivers
                    block.timestamp
                )
            );

            _boughtAmount = IERC20Upgradeable(_target).balanceOf(_receiver) - beforeTargetBalance;
            if (_boughtAmount > 0) {
                config.boughtAmount += _boughtAmount;
            }

            if (!buySuccess || _boughtAmount < _canAcceptMinAmountOut) {
                // buy failed
                break;
            }
        }
        require(config.boughtAmount > 0, "MultiBuyExactTokensFromTokens failed");
    }

    // !!! Important
    // !!! Important
    // !!! Important
    // should approve Target before call this function
    function MultiSellExactTargetTokensToWBNB()
    external
    {
        address WBNB = router.WETH();
        Config storage config = targetConfigMap[targetToken];
        address[] memory sellPath = new address[](2);
        sellPath[0] = targetToken;
        sellPath[1] = WBNB;
        address to = owner();
        address LP = UniswapV2Library.pairFor(router.factory(), targetToken, WBNB);

        address _receiver;
        uint256 _amount;
        uint256 sum;
        for (uint256 i = 0; i < receivers.length; i++) {
            _receiver = receivers[i];
            _amount = IERC20Upgradeable(targetToken).balanceOf(_receiver);
            if (_amount == 0) continue;
            IERC20Upgradeable(targetToken).transferFrom(_receiver, LP, _amount);
            sum += _amount;
        }

        uint256 _beforeWBNB = IERC20Upgradeable(WBNB).balanceOf(to);
        IERC20Upgradeable(targetToken).approve(address(router), ~uint256(0));

        uint256[] memory amounts = router.getAmountsOut(sum, sellPath);
        uint256 _amountOutMin = amounts[1] * (SLIPPAGE_SCALE - config.sellSlippage) / 100;

        _swapSupportingFeeOnTransferTokens(sellPath, to);

        uint256 actualSoldWBNB = IERC20Upgradeable(WBNB).balanceOf(to) - _beforeWBNB;

        console.log(actualSoldWBNB, _amountOutMin, sum, _beforeWBNB);

        require(
            actualSoldWBNB >= _amountOutMin,
            'Sell Failed, since actualSoldWBNB < _amountOutMin'
        );

        config.soldWBNBAmount += actualSoldWBNB;
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
                0x5c11d795,  // swapExactTokensForTokensSupportingFeeOnTransferTokens
                testAmountIn,
                0,
                path,
                to,
                block.timestamp
            )
        );
        uint256 actualBuyAmount = IERC20Upgradeable(_target).balanceOf(to) - beforeBuy;
        require(actualBuyAmount > 0, "Test buy failed");

        address[] memory sellPath = new address[](path.length);
        for (uint256 i = 0; i < path.length; i++) {
            sellPath[i] = path[path.length - 1 - i];
        }

        uint256 beforeSell = IERC20Upgradeable(_source).balanceOf(to);
        IERC20Upgradeable(sellPath[0]).approve(address(router), ~uint256(0));

        (bool sellSuccess, ) = address(router).call(
            abi.encodeWithSelector(
                0x5c11d795,  // swapExactTokensForTokensSupportingFeeOnTransferTokens
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

    // **** SWAP (supporting fee-on-transfer tokens) ****
    // requires the initial amount to have already been sent to the first pair
    function _swapSupportingFeeOnTransferTokens(address[] memory path, address _to) internal {
        address factory = router.factory();

        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = UniswapV2Library.sortTokens(input, output);
            IUniswapV2Pair pair = IUniswapV2Pair(UniswapV2Library.pairFor(factory, input, output));
            uint amountInput;
            uint amountOutput;
            { // scope to avoid stack too deep errors
                (uint reserve0, uint reserve1,) = pair.getReserves();
                (uint reserveInput, uint reserveOutput) = input == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
                amountInput = IERC20Upgradeable(input).balanceOf(address(pair)) - reserveInput;
                amountOutput = UniswapV2Library.getAmountOut(amountInput, reserveInput, reserveOutput);
            }
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOutput) : (amountOutput, uint(0));
            address to = i < path.length - 2 ? UniswapV2Library.pairFor(factory, output, path[i + 2]) : _to;
            pair.swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }

    function testBuy(address[] calldata path) external {
        _testSwapTokenForToken(path);
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
