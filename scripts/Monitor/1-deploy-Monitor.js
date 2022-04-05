const fs = require('fs');
const { ethers, upgrades } = require('hardhat');
const { BSC_TOKENS, unit } = require('../utils/constants');
const { toHuman, dateFormat, log } = require('../utils/util');

const operation = 'deploy';
const contractName = 'BevBot';
const pancakeRouter = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const whiteMap = [BSC_TOKENS.wbnb, BSC_TOKENS.busd, BSC_TOKENS.usdt];

const contractDeployArgs = [pancakeRouter, whiteMap];

const main = async () => {
    // init
    const [non, operator] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(operator.address);
    log('operator.address: ', operator.address, toHuman(balance));

    const factory = (await ethers.getContractFactory(contractName)).connect(operator);
    const contract = await upgrades.deployProxy(factory, contractDeployArgs);

    let timeStr = new Date().toLocaleString();
    const deployments = {
        ContractName: contractName,
        ContractAddress: contract.address,
        ContractDeployArgs: contractDeployArgs,
        Deployer: operator.address,
        DeployTime: timeStr,
    };
    log(`deployments`, JSON.stringify(deployments, null, 2));

    await recordOperation(deployments);
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
    if (fs.existsSync(mainnetDir)) {
        fs.renameSync(mainnetDir, __dirname + '/backup_' + timeStrFmt);
    }

    if (!fs.existsSync(mainnetDir)) {
        fs.mkdirSync(mainnetDir, { recursive: true });
    }

    fs.writeFileSync(
        mainnetDir + `/bsc-${chainId}-${operation}-${contractName}.json`,
        JSON.stringify(deployments, null, 2)
    );
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
