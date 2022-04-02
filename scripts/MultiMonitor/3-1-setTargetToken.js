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
let deploymentsObj = require('./mainnet/bsc-56-deploy-MultiBevBot.json');
let args = [];
const fs = require('fs');
const { ContractName: contractName, ContractAddress: contractAddress } = deploymentsObj;

const main = async () => {
    // init
    let tx;
    const signers = await ethers.getSigners();
    const operator = signers[1];

    const balance = await ethers.provider.getBalance(operator.address);
    log(contractName, contractAddress);
    log('operator.address: ', operator.address, toHuman(balance));

    // 1. get instance
    const contract = (await ethers.getContractAt(contractName, contractAddress)).connect(operator);

    // 2. change start time
    // const _targetToken = '0x6686aFd0ec7049337F36289a72dE3cC4CFAb77Aa'  // DTD
    // const _targetToken = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'; // BUSD
    // const _targetToken = '0xBB3f92ef6e541e6e1FD27D297fd188f1b105037e'; // BUSD

    // 记得打 WBNB 给合约
    // const _targetToken = '0x873A5DFD10aF54e54DF6E2d646190aC6B5F62736'; // BUSD
    // TODO
    const _targetToken = '0xBA6607F4b475396c239982cB5A81312231fAc111'; //  SPS
    const _symbol = 'SPS';// DTD

    const _receivers = signers.slice(2, 32).map((s) => s.address);

    const startTimeStr = 'Sun Mar 23 2022 13:00:00 UTC+8';
    const _serviceStartAt = new Date(startTimeStr).getTime() / 1000;

    const endTimeStr = 'Sun Mar 25 2024 19:00:00 UTC+8';
    const _serviceEndAt = new Date(endTimeStr).getTime() / 1000;

    // TODO
    const _amountOutPerReceiverByTarget = unit.mul(200);
    // TODO
    const _canAcceptMaxWBNBAmountIn = unit.mul(6);

    const _sellSlippage = 20;
    args = [
        _targetToken,
        _symbol,
        _receivers,

        _serviceStartAt,
        _serviceEndAt,
        _amountOutPerReceiverByTarget,
        _canAcceptMaxWBNBAmountIn,
        _sellSlippage,
    ];
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
