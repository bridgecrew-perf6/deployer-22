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
const operation = 'approve';
let deploymentsObj = require('./mainnet/bsc-56-deploy-MultiBevBot.json');
let args = [];
const fs = require('fs');
const { ContractName: contractName, ContractAddress: contractAddress } = deploymentsObj;

const main = async () => {
    // init
    const signers = await ethers.getSigners();
    const operator = signers[1];
    const balance = await ethers.provider.getBalance(operator.address);
    log(contractName, contractAddress);
    log('operator.address: ', operator.address, toHuman(balance));

    // 1. get instances
    const targetTokenAddress = '0x873A5DFD10aF54e54DF6E2d646190aC6B5F62736';
    const contract = (await ethers.getContractAt('TargetToken', targetTokenAddress)).connect(
        operator
    );

    // 2.
    const promises = [];
    const args = [contractAddress, ethers.constants.MaxUint256];
    // for (let i = 0; i < signers.length; i++) {
    for (let i = 2; i < 34; i++) {
        const signer = signers[i];
        const promise = contract.connect(signer).approve(...args);
        promises.push(promise);
        log(`${i} ${signer.address} approve to ${contractName} ${contractAddress}`);
    }
    await Promise.all(promises);
    log(`approved success`);

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
