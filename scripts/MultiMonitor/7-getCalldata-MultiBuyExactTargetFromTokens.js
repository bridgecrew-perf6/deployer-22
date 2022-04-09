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
const operation = 'MultiBuyExactTargetFromTokens';
let deploymentsObj = require('./mainnet/bsc-56-deploy-MultiBevBot.json');
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
    const targetAddress = await contract.targetToken();

    // 2. change start time
    const path = [
        BSC_TOKENS.wbnb,
        // BSC_TOKENS.busd,
        '0x873A5DFD10aF54e54DF6E2d646190aC6B5F62736',
    ];
    args = [path];


};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
