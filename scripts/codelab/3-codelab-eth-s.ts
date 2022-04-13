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
const operation = 'transferToken';
// let deploymentsObj = require('./mainnet/bsc-56-deploy-MultiBevBot.json');
let args = [];
const fs = require('fs');
// const { ContractName: contractName, ContractAddress: contractAddress } = deploymentsObj;

const main = async () => {
    // init
    let tx;
    const [operator] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(operator.address);
    log('operator.address: ', operator.address, toHuman(balance));

    tx = {
        from: operator.address,
        to: operator.address,
        nonce: 0,
        value: 0,
        gasPrice: 100 * 1e9
    }

    log('tx: ', tx)
    return null

    tx = await operator.sendTransaction(tx)
    await tx.wait()
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
