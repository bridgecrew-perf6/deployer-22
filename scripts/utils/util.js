const { ecsign, toRpcSig } = require('ethereumjs-util');
const { ethers } = require('hardhat');
const fs = require('fs');

const getAddressFromBytes32 = (bytes32Str) => {
    return bytes32Str.replace('0x000000000000000000000000', '0x');
};

const sleep = async (seconds) => {
    // console.log(`waiting for block confirmations, about ${seconds}s`)
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

const deployContract = async (factoryPath, ...args) => {
    const factory = await ethers.getContractFactory(factoryPath);
    const contract = await factory.deploy(...args);
    await contract.deployTransaction.wait(1);
    return contract;
};

const deployContractByWallet = async (wallet, factoryPath, ...args) => {
    const factory = await ethers.getContractFactory(factoryPath, wallet);
    const contract = await factory.deploy(...args);
    await contract.deployTransaction.wait(1);
    return contract;
};

const deployUpgradableContractFirstTime = async (
    factoryPathStorage,
    factoryPathLogic,
    _proxy_admin,
    ...storageArgs
) => {
    storageArgs.push(_proxy_admin);
    const storageContract = await deployContract(factoryPathStorage, ...storageArgs);
    const logicContract = await deployContract(factoryPathLogic);

    const txRes = await storageContract.sysAddDelegates([logicContract.address], {
        from: _proxy_admin,
    });
    await txRes.wait(1);

    const instance = await ethers.getContractAt(factoryPathLogic, storageContract.address);

    log(`${instance.address}`);

    return instance;
};

const deployUpgradableContractFirstTimeByWallet = async (
    wallet,
    factoryPathStorage,
    factoryPathLogic,
    _proxy_admin,
    ...storageArgs
) => {
    storageArgs.push(_proxy_admin);
    const storageContract = await deployContractByWallet(
        wallet,
        factoryPathStorage,
        ...storageArgs
    );
    const logicContract = await deployContractByWallet(wallet, factoryPathLogic);

    const txRes = await storageContract.sysAddDelegates([logicContract.address], {
        from: _proxy_admin,
        gasLimit: 1000000,
    });
    await txRes.wait(1);

    const instance = await ethers.getContractAt(factoryPathLogic, storageContract.address, wallet);

    log(`${instance.address}`);

    return instance;
};

const deployAll = async (contractPaths) => {
    const contracts = [];
    const promises = [];
    for (const path of contractPaths) {
        const factory = await ethers.getContractFactory(path);
        const contract = await factory.deploy();
        contracts.push(contract);
        promises.push(contract.deployTransaction.wait(1));
        // because nonce should increase in sequence
        await sleep(1);
    }

    await Promise.all(promises);
    return contracts;
};

const generateWallets = (size) => {
    const wallets = [];
    for (let i = 0; i < size; i++) {
        const wallet = ethers.Wallet.createRandom();
        wallets.push(wallet);
    }
    return wallets;
};

const generateSignatures = (msgHash, wallets) => {
    let signatures = '0x';
    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        const { v, r, s } = ecsign(
            Buffer.from(msgHash.slice(2), 'hex'),
            Buffer.from(wallet.privateKey.slice(2), 'hex')
        );
        const sigHex = toRpcSig(v, r, s);
        signatures += sigHex.slice(2);
    }
    return signatures;
};

const runErrorCase = async (txPromise, expectErrorMsg) => {
    try {
        await txPromise;
    } catch (e) {
        const error = e.error ? e.error.toString() : e.toString();
        //expect(error.indexOf(expectErrorMsg) > -1).to.eq(true);
        expect(error).to.have.string(expectErrorMsg);
    }
};

const retryPromise = async (txPromise, times) => {
    let res = null;
    for (let i = 0; i < times; i++) {
        try {
            res = await txPromise;
            return res;
        } catch (e) {
            log(`send tx failed, retry ${i}`, e);
            await sleep(2);
        }
    }
    return res;
};

/*
 * @param
 * dateFormat("YYYY-mm-dd HH:MM:SS", date)
 * */
function dateFormat(fmt, date) {
    let ret;
    const opt = {
        'Y+': date.getFullYear().toString(), // year
        'm+': (date.getMonth() + 1).toString(), // month
        'd+': date.getDate().toString(), // day
        'H+': date.getHours().toString(), // hour
        'M+': date.getMinutes().toString(), // minute
        'S+': date.getSeconds().toString(), // second
    };
    for (let k in opt) {
        ret = new RegExp('(' + k + ')').exec(fmt);
        if (ret) {
            fmt = fmt.replace(
                ret[1],
                ret[1].length == 1 ? opt[k] : opt[k].padStart(ret[1].length, '0')
            );
        }
    }
    return fmt;
}

const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
};

const getDeadline = () => {
    return Math.floor(new Date().getTime() / 1000) + 1800;
};

const toHuman = (x, fractionDigits = 2) => {
    return (x / 1e18).toFixed(fractionDigits);
};

const { log } = console;

const addOperations = (deployments, operation, ...args) => {
    let timeStr = new Date().toLocaleString();

    if (!deployments.operations) {
        deployments.operations = [];
    }
    deployments.operations.push({
        time: timeStr,
        operation: operation,
        args: [...args],
    });

    return deployments;
};

const recordOperation = async (deployments, contractName, operation, rootPath) => {
    const { chainId } = await ethers.provider.getNetwork();
    const timeStrFmt = dateFormat('mm-dd_HH-MM-SS', new Date());

    const backupDir = rootPath + '/backup';
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const recordFileName = `bsc-${chainId}-${timeStrFmt}-${operation}-${contractName}.json`;

    fs.writeFileSync(backupDir + `/` + recordFileName, JSON.stringify(deployments, null, 2));

    const mainnetDir = rootPath + '/mainnet';
    if (!fs.existsSync(mainnetDir)) {
        fs.mkdirSync(mainnetDir, { recursive: true });
    }

    fs.writeFileSync(mainnetDir + `/` + recordFileName, JSON.stringify(deployments, null, 2));
};

module.exports = {
    dateFormat,
    sleep,
    log,
    deployContract,
    deployAll,
    deployContractByWallet,
    deployUpgradableContractFirstTime,
    deployUpgradableContractFirstTimeByWallet,
    generateWallets,
    generateSignatures,
    runErrorCase,
    retryPromise,
    getRandomInt,
    getAddressFromBytes32,
    getDeadline,
    toHuman,
    addOperations,
    recordOperation,
};
