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
const operation = 'BuyTokenByToken';
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

    // 2. change start time
    const path = [BSC_TOKENS.wbnb, '0x6686aFd0ec7049337F36289a72dE3cC4CFAb77Aa'];
    args = [path];
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
