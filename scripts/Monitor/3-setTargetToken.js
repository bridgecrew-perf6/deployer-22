const { ethers, upgrades } = require('hardhat');
const { BSC_TOKENS, unit } = require('../utils/constants');
const {
    toHuman,
    dateFormat,
    log,
    addOperations,
    recordOperation,
    waitTx,
} = require('../utils/util');

// ! important
const operation = 'setTargetToken';
let deploymentsObj = require('./mainnet/bsc-56-deploy-Monitor.json');
let args = [];
const fs = require('fs');
const { ContractName: contractName, ContractAddress: contractAddress } = deploymentsObj;

const main = async () => {
    // init
    let tx;
    const [non, operator] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(operator.address);
    log(contractName, contractAddress);
    log('operator.address: ', operator.address, toHuman(balance));

    // 1. get instance
    const contract = (await ethers.getContractAt(contractName, contractAddress)).connect(operator);
    const WBNB = await ethers.getContractAt('TargetToken', BSC_TOKENS.wbnb);
    const WBNBBalance = await WBNB.balanceOf(contractAddress);

    // 2. change start time
    // const targetToken = '0x6686aFd0ec7049337F36289a72dE3cC4CFAb77Aa'; // DTD
    // const targetToken = '0x973174d06F5ed739Dc721a30FDAb9158eB1030C7'; // test TargetToken
    // const targetToken = '0x414c353451Ff085AD4283FF5809AA710bD6F2c07'; // test TargetToken

    // TODO 1 finished
    const targetToken = '0x090e1612015518e406fd8CF4E17423Cdf47e5327'; // KOBE!

    const startTimeStr = 'Sun Mar 22 2022 19:00:00 UTC+8';
    const startTime = new Date(startTimeStr).getTime() / 1000;

    const endTimeStr = 'Sun Mar 29 2023 19:00:00 UTC+8';
    const endTime = new Date(endTimeStr).getTime() / 1000;

    // TODO 2 finished
    const _amountInByWBNB = unit.mul(15);

    if (WBNBBalance.lt(_amountInByWBNB)) {
        throw new Error('WBNB balance is not enough');
    }

    // TODO 3 finished
    const _canAcceptTargetAmountOut = unit.mul(200);

    const _gasLimit = 600000;
    const _sendCountsPerAccount = 7; //  2022-03-25 22:40:05 UTC+8
    const _sendTxAccAccCounts = 50;
    const _lpWBNBThreshold = unit.mul(18).div(1000000); //
    args = [
        targetToken,
        startTime,
        endTime,
        _amountInByWBNB,
        _canAcceptTargetAmountOut,

        _gasLimit,
        _sendCountsPerAccount,
        _sendTxAccAccCounts,

        _lpWBNBThreshold,
    ];

    log('args: ', args);

    await waitTx(
        contract[operation](...args, {
            // gasLimit: 1000000,
        })
    );

    // 4. recordOperation
    deploymentsObj = addOperations(deploymentsObj, operation, ...args);
    await recordOperation(deploymentsObj, contractName, operation, __dirname);
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
