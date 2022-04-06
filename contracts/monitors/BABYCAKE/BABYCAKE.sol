// SPDX-License-Identifier: MIT

//
// $BabyCake proposes an innovative feature in its contract.
//
// DIVIDEND YIELD PAID IN BUSD! With the auto-claim feature,
// simply hold$BabyCake and you'll receive BUSD automatically in your wallet.
//
// Hold Baby Cake and get rewarded in BUSD on every transaction!
//
//
// 📱 Telegram: https://t.me/babycakeBSC
// 🌎 Website: https://www.babycake.app/
// 🌐 Twitter: https://twitter.com/BabyCakeBSC
//



pragma solidity 0.6.12;

import "./SafeMath.sol";
import "./Ownable.sol";
import "./IUniswapV2Factory.sol";
import "./IUniswapV2Router.sol";
import "./DividendPayingToken.sol";
import "./IterableMapping.sol";
import "./ERC20.sol";

contract BABYCAKE is ERC20, Ownable {
    using SafeMath for uint256;

    IUniswapV2Router02 public uniswapV2Router;
    address public uniswapV2Pair;

    bool private swapping;

    BABYCAKEDividendTracker public dividendTracker;

    address public deadWallet = 0x000000000000000000000000000000000000dEaD;

    address public immutable BUSD =
    address(0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56); //BUSD

    address public immutable CAKE =
    address(0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82); //CAKE

    bool isRewardBUSD; // true: reward as BUSD, false: reward as CAKE
    uint256 public swapTokensAtAmount = 2000000 * (10**18);

    mapping(address => bool) public _isBlacklisted;

    uint256 public BUSDRewardsFee = 5;
    uint256 public liquidityFee = 1;
    uint256 public marketingFee = 5;
    uint256 public buyBackFee = 1;
    uint256 public totalFees =
    BUSDRewardsFee.add(liquidityFee).add(marketingFee).add(buyBackFee);

    address public _marketingWalletAddress =
    0x24e21EF2C3C9C93B5791d77cF934bF92a91276ba;
    address public _buyBackWalletAddress =
    0x24e21EF2C3C9C93B5791d77cF934bF92a91276ba;
    // use by default 300,000 gas to process auto-claiming dividends
    uint256 public gasForProcessing = 300000;

    // exlcude from fees and max transaction amount
    mapping(address => bool) private _isExcludedFromFees;

    // store addresses that a automatic market maker pairs. Any transfer *to* these addresses
    // could be subject to a maximum transfer amount
    mapping(address => bool) public automatedMarketMakerPairs;

    bool public tradingEnabled = false;

    constructor() public ERC20("BC 2.1", "BC2.1") {
        dividendTracker = new BABYCAKEDividendTracker();

        IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(
            0x10ED43C718714eb63d5aA57B78B54704E256024E
        );
        // Create a uniswap pair for this new token
        address _uniswapV2Pair = IUniswapV2Factory(_uniswapV2Router.factory())
        .createPair(address(this), _uniswapV2Router.WETH());

        uniswapV2Router = _uniswapV2Router;
        uniswapV2Pair = _uniswapV2Pair;

        _setAutomatedMarketMakerPair(_uniswapV2Pair, true);

        // exclude from receiving dividends
        dividendTracker.excludeFromDividends(address(dividendTracker));
        dividendTracker.excludeFromDividends(address(this));
        dividendTracker.excludeFromDividends(owner());
        dividendTracker.excludeFromDividends(deadWallet);
        dividendTracker.excludeFromDividends(address(_uniswapV2Router));

        // exclude from paying fees or having max transaction amount
        excludeFromFees(owner(), true);
        excludeFromFees(_marketingWalletAddress, true);
        excludeFromFees(address(this), true);

        /*
            _mint is an internal function in ERC20.sol that is only called here,
            and CANNOT be called ever again
        */
        _mint(owner(), 100000000000 * (10**18));
    }

    receive() external payable {}

    function setBUSDReward(bool _isBUSDReward) external onlyOwner {
        isRewardBUSD = _isBUSDReward;
        dividendTracker.setBUSDReward(_isBUSDReward);
    }

    function rescueBNB(uint256 amount) external onlyOwner {
        payable(msg.sender).transfer(amount);
    }

    // function updateDividendTracker(address newAddress) public onlyOwner {
    //     require(newAddress != address(dividendTracker), "Same");

    //     BABYCAKEDividendTracker newDividendTracker = BABYCAKEDividendTracker(
    //         payable(newAddress)
    //     );

    //     require(newDividendTracker.owner() == address(this), "Owner");

    //     newDividendTracker.excludeFromDividends(address(newDividendTracker));
    //     newDividendTracker.excludeFromDividends(address(this));
    //     newDividendTracker.excludeFromDividends(owner());
    //     newDividendTracker.excludeFromDividends(address(uniswapV2Router));

    //     dividendTracker = newDividendTracker;
    // }

    function updateUniswapV2Router(address newAddress) public onlyOwner {
        require(newAddress != address(uniswapV2Router), "Same");
        uniswapV2Router = IUniswapV2Router02(newAddress);
        address _uniswapV2Pair = IUniswapV2Factory(uniswapV2Router.factory())
        .createPair(address(this), uniswapV2Router.WETH());
        uniswapV2Pair = _uniswapV2Pair;
    }

    function excludeFromFees(address account, bool excluded) public onlyOwner {
        require(_isExcludedFromFees[account] != excluded, "Excluded");
        _isExcludedFromFees[account] = excluded;
    }

    function setMarketingWallet(address payable wallet) external onlyOwner {
        _marketingWalletAddress = wallet;
    }

    function setBuyBackWallet(address payable wallet) external onlyOwner {
        _buyBackWalletAddress = wallet;
    }

    function setFees(
        uint256 _liquidityFee,
        uint256 _marketingFee,
        uint256 _rewardFee,
        uint256 _buyBackFee
    ) external onlyOwner {
        BUSDRewardsFee = _rewardFee;
        liquidityFee = _liquidityFee;
        marketingFee = _marketingFee;
        buyBackFee = _buyBackFee;
        totalFees = BUSDRewardsFee.add(liquidityFee).add(marketingFee).add(
            buyBackFee
        );
    }

    function setAutomatedMarketMakerPair(address pair, bool value)
    public
    onlyOwner
    {
        require(pair != uniswapV2Pair, "CR");

        _setAutomatedMarketMakerPair(pair, value);
    }

    function blacklistAddress(address account, bool value) external onlyOwner {
        _isBlacklisted[account] = value;
    }

    function _setAutomatedMarketMakerPair(address pair, bool value) private {
        require(automatedMarketMakerPairs[pair] != value, "APS");
        automatedMarketMakerPairs[pair] = value;

        if (value) {
            dividendTracker.excludeFromDividends(pair);
        }
    }

    function updateTrading(bool _tradingEnabled) external onlyOwner {
        tradingEnabled = _tradingEnabled;
    }

    function updateClaimWait(uint256 claimWait) external onlyOwner {
        dividendTracker.updateClaimWait(claimWait);
    }

    function getClaimWait() external view returns (uint256) {
        return dividendTracker.claimWait();
    }

    function getTotalDividendsDistributed() external view returns (uint256) {
        return dividendTracker.totalDividendsDistributed();
    }

    function isExcludedFromFees(address account) public view returns (bool) {
        return _isExcludedFromFees[account];
    }

    function withdrawableDividendOf(address account)
    public
    view
    returns (uint256)
    {
        return dividendTracker.withdrawableDividendOf(account);
    }

    function dividendTokenBalanceOf(address account)
    public
    view
    returns (uint256)
    {
        return dividendTracker.balanceOf(account);
    }

    function excludeFromDividends(address account) external onlyOwner {
        dividendTracker.excludeFromDividends(account);
    }

    function getAccountDividendsInfo(address account)
    external
    view
    returns (
        address,
        int256,
        int256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256
    )
    {
        return dividendTracker.getAccount(account);
    }

    function getAccountDividendsInfoAtIndex(uint256 index)
    external
    view
    returns (
        address,
        int256,
        int256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256
    )
    {
        return dividendTracker.getAccountAtIndex(index);
    }

    function processDividendTracker(uint256 gas) external {
        dividendTracker.process(gas);
    }

    function claim() external {
        dividendTracker.processAccount(payable(msg.sender), false);
    }

    function getLastProcessedIndex() external view returns (uint256) {
        return dividendTracker.getLastProcessedIndex();
    }

    function getNumberOfDividendTokenHolders() external view returns (uint256) {
        return dividendTracker.getNumberOfTokenHolders();
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        require(from != address(0), "");
        require(to != address(0), "");

        // 1. 手动拉黑
        require(!_isBlacklisted[from] && !_isBlacklisted[to], "BA");

        if (
            !(msg.sender == owner() || msg.sender == address(uniswapV2Router))
        ) {
            require(tradingEnabled, "TD");
        }

        if (amount == 0) {
            super._transfer(from, to, 0);
            return;
        }

        uint256 contractTokenBalance = balanceOf(address(this));

        bool canSwap = contractTokenBalance >= swapTokensAtAmount;

        if (
            canSwap &&
            !swapping &&
            !automatedMarketMakerPairs[from] &&
            from != owner() &&
            to != owner()
        ) {
            swapping = true;

            uint256 marketingBuyBackTokens = contractTokenBalance
            .mul(marketingFee.add(buyBackFee))
            .div(totalFees);
            swapAndSendToFee(marketingBuyBackTokens);

            uint256 swapTokens = contractTokenBalance.mul(liquidityFee).div(
                totalFees
            );
            swapAndLiquify(swapTokens);

            uint256 sellTokens = balanceOf(address(this));
            swapAndSendDividends(sellTokens);

            swapping = false;
        }

        bool takeFee = !swapping;

        // if any account belongs to _isExcludedFromFee account then remove the fee
        if (_isExcludedFromFees[from] || _isExcludedFromFees[to]) {
            takeFee = false;
        }

        if (takeFee) {
            uint256 fees = amount.mul(totalFees).div(100);
            if (automatedMarketMakerPairs[to]) {
                fees += amount.mul(1).div(100);
            }
            amount = amount.sub(fees);

            super._transfer(from, address(this), fees);
        }

        super._transfer(from, to, amount);

        try
        dividendTracker.setBalance(payable(from), balanceOf(from))
        {} catch {}
        try dividendTracker.setBalance(payable(to), balanceOf(to)) {} catch {}

        if (!swapping) {
            uint256 gas = gasForProcessing;

            try dividendTracker.process(gas) returns (
                uint256 iterations,
                uint256 claims,
                uint256 lastProcessedIndex
            ) {} catch {}
        }
    }

    function swapAndSendToFee(uint256 tokens) private {
        uint256 initialBUSDBalance = IERC20(BUSD).balanceOf(address(this));

        swapTokensForBUSD(tokens, true);
        uint256 newBalance = (IERC20(BUSD).balanceOf(address(this))).sub(
            initialBUSDBalance
        );

        if (buyBackFee > 0) {
            IERC20(BUSD).transfer(
                _buyBackWalletAddress,
                newBalance.mul(buyBackFee).div(marketingFee.add(buyBackFee))
            );
        }
        if (marketingFee > 0) {
            IERC20(BUSD).transfer(
                _marketingWalletAddress,
                newBalance.mul(marketingFee).div(marketingFee.add(buyBackFee))
            );
        }
    }

    function swapAndLiquify(uint256 tokens) private {
        // split the contract balance into halves
        uint256 half = tokens.div(2);
        uint256 otherHalf = tokens.sub(half);
        uint256 initialBalance = address(this).balance;

        // swap tokens for ETH
        swapTokensForEth(half); // <- this breaks the ETH -> HATE swap when swap+liquify is triggered

        // how much ETH did we just swap into?
        uint256 newBalance = address(this).balance.sub(initialBalance);

        // add liquidity to uniswap
        addLiquidity(otherHalf, newBalance);
    }

    function swapTokensForEth(uint256 tokenAmount) private {
        // generate the uniswap pair path of token -> weth
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = uniswapV2Router.WETH();

        _approve(address(this), address(uniswapV2Router), tokenAmount);

        // make the swap
        uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // accept any amount of ETH
            path,
            address(this),
            block.timestamp
        );
    }

    function swapTokensForBUSD(uint256 tokenAmount, bool _isBUSD) private {
        address[] memory path = new address[](3);
        path[0] = address(this);
        path[1] = uniswapV2Router.WETH();
        path[2] = _isBUSD ? BUSD : CAKE;

        _approve(address(this), address(uniswapV2Router), tokenAmount);

        // make the swap
        uniswapV2Router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            tokenAmount,
            0,
            path,
            address(this),
            block.timestamp
        );
    }

    function addLiquidity(uint256 tokenAmount, uint256 ethAmount) private {
        // approve token transfer to cover all possible scenarios
        _approve(address(this), address(uniswapV2Router), tokenAmount);

        // add the liquidity
        uniswapV2Router.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
            address(0),
            block.timestamp
        );
    }

    function swapAndSendDividends(uint256 tokens) private {
        swapTokensForBUSD(tokens, isRewardBUSD);
        address processingToken = isRewardBUSD ? BUSD : CAKE;
        uint256 dividends = IERC20(processingToken).balanceOf(address(this));
        bool success = IERC20(processingToken).transfer(
            address(dividendTracker),
            dividends
        );

        if (success) {
            dividendTracker.distributeBUSDDividends(dividends);
        }
    }
}

contract BABYCAKEDividendTracker is Ownable, DividendPayingToken {
    using SafeMath for uint256;
    using SafeMathInt for int256;
    using IterableMapping for IterableMapping.Map;

    IterableMapping.Map private tokenHoldersMap;
    uint256 public lastProcessedIndex;

    mapping(address => bool) public excludedFromDividends;

    mapping(address => uint256) public lastClaimTimes;

    uint256 public claimWait;
    uint256 public immutable minimumTokenBalanceForDividends;

    constructor()
    public
    DividendPayingToken("BC2.1_Dividen_Tracker", "BC2.1_Dividend_Tracker")
    {
        claimWait = 3600;
        minimumTokenBalanceForDividends = 200000 * (10**18); //must hold 200000+ tokens
    }

    function _transfer(
        address,
        address,
        uint256
    ) internal override {
        require(false);
    }

    function withdrawDividend() public override {
        require(false);
    }

    function excludeFromDividends(address account) external onlyOwner {
        require(!excludedFromDividends[account]);
        excludedFromDividends[account] = true;

        _setBalance(account, 0);
        tokenHoldersMap.remove(account);
    }

    function updateClaimWait(uint256 newClaimWait) external onlyOwner {
        require(newClaimWait >= 3600 && newClaimWait <= 86400, "1-24hr");
        require(newClaimWait != claimWait, "Same");
        claimWait = newClaimWait;
    }

    function getLastProcessedIndex() external view returns (uint256) {
        return lastProcessedIndex;
    }

    function getNumberOfTokenHolders() external view returns (uint256) {
        return tokenHoldersMap.keys.length;
    }

    function getAccount(address _account)
    public
    view
    returns (
        address account,
        int256 index,
        int256 iterationsUntilProcessed,
        uint256 withdrawableDividends,
        uint256 totalDividends,
        uint256 lastClaimTime,
        uint256 nextClaimTime,
        uint256 secondsUntilAutoClaimAvailable
    )
    {
        account = _account;

        index = tokenHoldersMap.getIndexOfKey(account);

        iterationsUntilProcessed = -1;

        if (index >= 0) {
            if (uint256(index) > lastProcessedIndex) {
                iterationsUntilProcessed = index.sub(
                    int256(lastProcessedIndex)
                );
            } else {
                uint256 processesUntilEndOfArray = tokenHoldersMap.keys.length >
                lastProcessedIndex
                ? tokenHoldersMap.keys.length.sub(lastProcessedIndex)
                : 0;

                iterationsUntilProcessed = index.add(
                    int256(processesUntilEndOfArray)
                );
            }
        }

        withdrawableDividends = withdrawableDividendOf(account);
        totalDividends = accumulativeDividendOf(account);

        lastClaimTime = lastClaimTimes[account];

        nextClaimTime = lastClaimTime > 0 ? lastClaimTime.add(claimWait) : 0;

        secondsUntilAutoClaimAvailable = nextClaimTime > block.timestamp
        ? nextClaimTime.sub(block.timestamp)
        : 0;
    }

    function getAccountAtIndex(uint256 index)
    public
    view
    returns (
        address,
        int256,
        int256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256
    )
    {
        if (index >= tokenHoldersMap.size()) {
            return (
            0x0000000000000000000000000000000000000000,
            -1,
            -1,
            0,
            0,
            0,
            0,
            0
            );
        }

        address account = tokenHoldersMap.getKeyAtIndex(index);

        return getAccount(account);
    }

    function canAutoClaim(uint256 lastClaimTime) private view returns (bool) {
        if (lastClaimTime > block.timestamp) {
            return false;
        }

        return block.timestamp.sub(lastClaimTime) >= claimWait;
    }

    function setBalance(address payable account, uint256 newBalance)
    external
    onlyOwner
    {
        if (excludedFromDividends[account]) {
            return;
        }

        if (newBalance >= minimumTokenBalanceForDividends) {
            _setBalance(account, newBalance);
            tokenHoldersMap.set(account, newBalance);
        } else {
            _setBalance(account, 0);
            tokenHoldersMap.remove(account);
        }

        processAccount(account, true);
    }

    function process(uint256 gas)
    public
    returns (
        uint256,
        uint256,
        uint256
    )
    {
        uint256 numberOfTokenHolders = tokenHoldersMap.keys.length;

        if (numberOfTokenHolders == 0) {
            return (0, 0, lastProcessedIndex);
        }

        uint256 _lastProcessedIndex = lastProcessedIndex;

        uint256 gasUsed = 0;

        uint256 gasLeft = gasleft();

        uint256 iterations = 0;
        uint256 claims = 0;

        while (gasUsed < gas && iterations < numberOfTokenHolders) {
            _lastProcessedIndex++;

            if (_lastProcessedIndex >= tokenHoldersMap.keys.length) {
                _lastProcessedIndex = 0;
            }

            address account = tokenHoldersMap.keys[_lastProcessedIndex];

            if (canAutoClaim(lastClaimTimes[account])) {
                if (processAccount(payable(account), true)) {
                    claims++;
                }
            }

            iterations++;

            uint256 newGasLeft = gasleft();

            if (gasLeft > newGasLeft) {
                gasUsed = gasUsed.add(gasLeft.sub(newGasLeft));
            }

            gasLeft = newGasLeft;
        }

        lastProcessedIndex = _lastProcessedIndex;

        return (iterations, claims, lastProcessedIndex);
    }

    function processAccount(address payable account, bool automatic)
    public
    onlyOwner
    returns (bool)
    {
        uint256 amount = _withdrawDividendOfUser(account);

        if (amount > 0) {
            lastClaimTimes[account] = block.timestamp;
            return true;
        }

        return false;
    }
}
