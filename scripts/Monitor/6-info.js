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
    const target = await contract.targetToken();
    log('target: ', target);

    const config = await contract.getTarget();
    log('config: ', config);

    let signHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(
            'swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256,uint256,address[],address,uint256)'
        )
    );
    log(`swapExactTokensForTokensSupportingFeeOnTransferTokens sigHash`, signHash.slice(0, 10));

    signHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(
            'swapTokensForExactTokens(uint256,uint256,address[],address,uint256)'
        )
    );
    log(`swapTokensForExactTokens sigHash`, signHash.slice(0, 10));
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
