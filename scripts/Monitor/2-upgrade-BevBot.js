const { ethers, upgrades } = require('hardhat');
const { BSC_TOKENS, unit } = require('../utils/constants');
const { toHuman, dateFormat, log } = require('../utils/util');

// ! important
const operation = 'upgrade';
const deploymentsObj = require('./mainnet/bsc-56-deploy-Monitor.json');
const fs = require('fs');
const { ContractName: contractName, ContractAddress: contractAddress } = deploymentsObj;

const main = async () => {
    // init
    const [non, operator] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(operator.address);
    log('operator.address: ', operator.address, toHuman(balance));
    log(contractName, contractAddress);

    // 1. upgrade
    const factory = (await ethers.getContractFactory(contractName)).connect(operator);
    log(`upgrade contract`, contractAddress, 'operator', operator.address);
    const upgraded = await upgrades.upgradeProxy(contractAddress, factory);
    log(`upgrade success!`, upgraded.address);

    // 2. recordOperation
    await recordOperation(deploymentsObj);
};

const recordOperation = async (deployments) => {
    const { chainId } = await ethers.provider.getNetwork();
    const timeStrFmt = dateFormat('mm-dd_HH-MM-SS', new Date());

    const backupDir = __dirname + '/backup';
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    fs.writeFileSync(
        backupDir + `/bsc-${chainId}-${operation}-${contractName}-${timeStrFmt}.json`,
        JSON.stringify(deployments, null, 2)
    );

    const mainnetDir = __dirname + '/mainnet';
    if (!fs.existsSync(mainnetDir)) {
        fs.mkdirSync(mainnetDir, { recursive: true });
    }

    fs.writeFileSync(
        mainnetDir + `/bsc-${chainId}-${operation}-${contractName}-${timeStrFmt}.json`,
        JSON.stringify(deployments, null, 2)
    );
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
