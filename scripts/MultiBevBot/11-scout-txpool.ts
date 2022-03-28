import {KOBE, Monitor, MultiBevBot, UniswapV2Router02} from '../../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { formatEther } from 'ethers/lib/utils';
import {BigNumber, BigNumberish, ContractReceipt, ContractTransaction} from 'ethers';
const { ethers } = require('hardhat');
const { sleep } = require('../utils/util');
const { BSC_TOKENS } = require('../utils/constants');
const log = console.log.bind(console);
const unit: BigNumber = ethers.constants.WeiPerEther;
const pancakeRouter = '0x10ED43C718714eb63d5aA57B78B54704E256024E'

let deploymentsObj = require('./mainnet/bsc-56-deploy-MultiBevBot.json');
let args = [];
const fs = require('fs');
const { ContractName: contractName, ContractAddress: contractAddress } = deploymentsObj;


let monitor: MultiBevBot, operator: SignerWithAddress;
/*
{
  hash: '0xba06c835ecaa090a8cfab529fb78611d0b420ec4eb96796c74a96dbe243adad3',
  type: 0,
  accessList: null,
  blockHash: null,
  blockNumber: null,
  transactionIndex: null,
  confirmations: 0,
  from: '0x4e84E02b811D67C5D3Aa865b96642e1b5F820B50',
  gasPrice: BigNumber { value: "5000000000" },
  gasLimit: BigNumber { value: "321807" },
  to: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  value: BigNumber { value: "1400000000000000000" },
  nonce: 13379,
  data: '0xb6f9de950000000000000000000000000000000000000000000003beb0f73e6400f5aeb500000000000000000000000000000000000000000000000000000000000000800000000000000000000000004e84e02b811d67c5d3aa865b96642e1b5f820b5000000000000000000000000000000000000000000000000000000000623d8c850000000000000000000000000000000000000000000000000000000000000003000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c000000000000000000000000e9e7cea3dedca5984780bafc599bd69add087d560000000000000000000000003e63e9c8f2297e3c027f8444b4591e2583d8780b',
  r: '0xce85146077c93c6c2fb6e27bce25b518ae906418e5c89a7d85e2b5784f9e71ff',
  s: '0x0e5e325aad81ca4ec5be1a70e34f49e935a18f70d201ed4cad731f69e23a5788',
  v: 148,
  creates: null,
  chainId: 56,
  wait: [Function (anonymous)]
}
* */


const handlePendingTx = async (tx: ContractTransaction ) => {
    if (tx.from === '0xee51A5DaddbF029A6b6552D587481b2aBb5a012A' &&
        tx.to === '0xBA6607F4b475396c239982cB5A81312231fAc111') {
        log(`dev address !!!!!!!: ${tx.hash}`);


        const path = [
            BSC_TOKENS.wbnb,
            BSC_TOKENS.usdt,
            '0xBA6607F4b475396c239982cB5A81312231fAc111',
        ]
        const newTx = await monitor.MultiBuyExactTargetFromTokens(path, {
            gasPrice: tx.gasPrice,
            gasLimit: 6000000,
        })
        newTx.wait().then()
    }
}

const main = async () => {
    const signers = await ethers.getSigners();
    const kobe = await ethers.getContractAt(
        'KOBE',
        // TODO !
        '0xBA6607F4b475396c239982cB5A81312231fAc111'
    ) as KOBE

    monitor = await ethers.getContractAt(
        contractName,
        contractAddress
    ) as MultiBevBot


    ethers.provider.on('pending', handlePendingTx);


    while (true) {
        const now = new Date().getTime();
        log(`now: ${new Date(now).toLocaleTimeString()}`);
        await sleep(1);
    }
};


export const toHuman = (x: BigNumber, fractionDigits = 2) => {
    return formatEther(x);
};

export async function waitTx(txRequest: Promise<ContractTransaction>): Promise<ContractReceipt> {
    const txResponse = await txRequest;
    return await txResponse.wait(1);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });