// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../contracts/v2-periphery/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

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
    /* ------------------- storage ------------------- */

    struct Config {
        // before swap
        uint256 serviceStartAt;
        uint256 serviceEndAt;
        uint256 amountOutPerReceiverByTarget;
        uint256 canAcceptMaxWBNBAmountIn;

        // after swap
        uint256 boughtTargetAmount;
        uint256 boughtCostWBNB;
        uint256 sellSlippage;
        uint256 soldWBNBAmount;
    }

    function initialize(address _router, address[] memory _whitelistSet)
    public
    initializer
    {
        __Ownable_init();
        router = IUniswapV2Router02(_router);
        for (uint256 i = 0; i < _whitelistSet.length; i++) {
            IERC20Upgradeable(_whitelistSet[i]).approve(_router, ~uint256(0));
        }
        testAmountIn = 1e4;
        canAcceptMaxSlippage = 50;
    }

/*  ------------------------ 1. onlyOwner ------------------------ */
    function setSlippage(uint256 _canAcceptMaxSlippage) external onlyOwner {
        canAcceptMaxSlippage = _canAcceptMaxSlippage;
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
        string calldata _symbol,
        address[] calldata _receivers,

        uint256 _serviceStartAt,
        uint256 _serviceEndAt,
        uint256 _amountOutPerReceiverByTarget,
        uint256 _canAcceptMaxWBNBAmountIn,
        uint256 _sellSlippage
    )
    external
    onlyOwner
    {
        if (targetConfigMap[_target].amountOutPerReceiverByTarget == 0) {
            // buy at first time
            allSellTokens.push(_target);
        }

        targetToken = _target;
        targetSymbol = _symbol;
        require(_receivers.length > 0, "Empty receivers");
        receivers = _receivers;

        targetConfigMap[_target].serviceStartAt = _serviceStartAt;
        targetConfigMap[_target].serviceEndAt = _serviceEndAt;
        targetConfigMap[_target].amountOutPerReceiverByTarget = _amountOutPerReceiverByTarget;
        targetConfigMap[_target].canAcceptMaxWBNBAmountIn = _canAcceptMaxWBNBAmountIn;
        targetConfigMap[_target].sellSlippage = _sellSlippage;
    }

    function restartCurrentTarget()
    external
    onlyOwner
    {
        targetConfigMap[targetToken].boughtTargetAmount = 0;
    }

/*  ------------------------ 2. external ------------------------ */
    function MultiBuyExactTargetFromTokens(address[] calldata path)
    external
    {
        address _target = path[path.length - 1];
        Config storage config = targetConfigMap[_target];
        require(config.boughtTargetAmount == 0, "targetToken already bought");
        require(
            config.serviceStartAt <= block.timestamp && block.timestamp <= config.serviceEndAt,
            "targetToken not in service time"
        );
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
                config.boughtTargetAmount += _boughtAmount;
            }

            if (!buySuccess || _boughtAmount < _canAcceptMinAmountOut) {
                // buy failed
                break;
            }
        }
        require(config.boughtTargetAmount > 0, "MultiBuyExactTokensFromTokens failed");
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

        address _receiver;
        uint256 _amount;
        for (uint256 i = 0; i < receivers.length; i++) {
            _receiver = receivers[i];
            _amount = IERC20Upgradeable(targetToken).balanceOf(_receiver);
            if (_amount == 0) continue;
            IERC20Upgradeable(targetToken).transferFrom(_receiver, address(this), _amount);
        }

        uint256 _beforeWBNB = IERC20Upgradeable(WBNB).balanceOf(owner());

        uint256 _targetBalance = IERC20Upgradeable(targetToken).balanceOf(address(this));
        require(_targetBalance > 0, "_targetBalance is 0");

        IERC20Upgradeable(targetToken).approve(address(router), ~uint256(0));
        uint256[] memory amounts = router.getAmountsOut(_targetBalance, sellPath);
        uint256 _amountOutMin = amounts[1] * (SLIPPAGE_SCALE - config.sellSlippage) / 100;

        (bool sellSuccess, ) = address(router).call(
            abi.encodeWithSelector(
                0x5c11d795,  // swapExactTokensForTokensSupportingFeeOnTransferTokens
                _targetBalance,
                _amountOutMin,
                sellPath,
                owner(),
                block.timestamp
            )
        );
        uint256 actualSoldWBNB = IERC20Upgradeable(WBNB).balanceOf(owner()) - _beforeWBNB;

        require(actualSoldWBNB > 0, "Sell WBNB is 0");
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
        require(buySuccess && actualBuyAmount > 0, "Test buy failed");

        address[] memory sellPath = new address[](path.length);
        for (uint256 i = 0; i < path.length; i++) {
            sellPath[i] = path[path.length - 1 - i];
        }

        uint256 beforeSell = IERC20Upgradeable(_source).balanceOf(to);
        IERC20Upgradeable(sellPath[0]).approve(address(router), ~uint256(0));

        (bool sellSuccess, ) = address(router).call(
            abi.encodeWithSelector(
                0x5c11d795,  // swapExactTokensForTokensSupportingFeeOnTransferTokens
                actualBuyAmount,
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

/*  ------------------------ 4. view ------------------------ */
    function getTarget() public view returns(address targetToken, string memory targetSymbol) {
        return (targetToken, targetSymbol);
    }
}
