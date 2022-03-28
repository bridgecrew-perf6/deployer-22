const lodash = require('lodash');
const fs = require('fs');
const { ethers, upgrades } = require('hardhat');
const { getETHBalances } = require('../utils/dex');
const { sign } = require('crypto');
const { getDeadline, sleep } = require('../utils/util');
const log = console.log.bind(console);

// BSC contracts
const BSC_TOKENS = {
    busd: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    usdt: '0x55d398326f99059fF775485246999027B3197955',
    wrappedNative: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    stableCoin: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    eth: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    wbnb: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    cake: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
    gm: '0xe2604C9561D490624AA35e156e65e590eB749519',
};
const unit = ethers.constants.WeiPerEther;

const main = async () => {
    const signers = await ethers.getSigners();
    if (
        signers[0].address.toLowerCase() !==
        '0xFa513364C3427fF00b68f1f224B51d65Fb08b40F'.toLowerCase()
    ) {
        log('!!!!!!!!!!!!error hardhat network!!!!!!!!!!!!');
        log('!!!!!!!!!!!!error hardhat network!!!!!!!!!!!!');
        log('!!!!!!!!!!!!error hardhat network!!!!!!!!!!!!');
        return;
    }

    // const receiver = '0x10027e4b723480e2DED6F1191704dB8fd51b7838'
    // const receiver = '0x59A3b07e80C5bD951e8a1df35af659e799839a8b'
    // const receiver = '0xccFb75367C54baea004afe3F3B6DB52a047B57EA'
    // const receiver = '0x17BF15365C3d6B0c509efa9a19b108602c1e1750'
    // const receiver = '0xc2346933325849bc64d3Ab00493f9Ddf314B5664'
    // const receiver = '0x0050f0019680D8C79e1dd612321550CFa9F0F040'
    const receiver = '0xEDE59796Ff4ecd90C9fB758098b2cEC3b451F1ed';
    const remainAmount = unit.mul(5).div(1000);
    // for (let i = 0; i < signers.length; i++) {

    const users = signers.map((item) => item.address);
    log(users.length, users);
    let { balancesETH, sumETH } = await getETHBalances(users);

    log('sumETH', sumETH / 1e18, 'user.length', users.length);
    log(balancesETH.map((balance) => (balance / 1e18).toFixed(2)));

    const promises = [];
    // for (let i = 0; i < signers.length; i++) {
    for (let i = 30; i < 70; i++) {
        const signer = signers[i];
        const balance = balancesETH[i];
        const amount = balance.gt(remainAmount) ? balance.sub(remainAmount) : 0;
        if (!amount) {
            continue;
        }

        const promise = signer.sendTransaction({
            from: signer.address,
            to: receiver,
            value: amount,
            gasPrice: 6 * 1e9,
            gasLimit: 250000,
        });

        promises.push(promise);
        log(`${i} ${signer.address} transferred ${(amount / 1e18).toString()}`);
    }

    Promise.all(promises).then(() => {
        log('done');
    });

    await sleep(1000);
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
