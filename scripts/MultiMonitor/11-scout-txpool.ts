import {KOBE, MultiBevBot, UniswapV2Router02} from '../../typechain-types';
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

let provider: any

// -----------------------------------------------------------------------------
// TODO !!!!
const targetToken = '0x74C71c2A0F22600F82c94cdc680065169949aedC'  // Orange
let DEVAddress: string
let SwitchMethodId = '0x7de84e10'

// TODO
const sendAccCounts = 5
const Tx_Limit_Per_Account = 1
const path = [
    BSC_TOKENS.wbnb,
    targetToken,
]
// -----------------------------------------------------------------------------

let monitor: MultiBevBot, operator: SignerWithAddress;
let signers: SignerWithAddress[];
const contractName = 'MultiBevBot'
const contractAddress = '0x4Dd8304B292c3892360c5C24c81C75EdC6C2693f'

const equalAddress = (a: string, b: string) => {
    return a.toLowerCase() === b.toLowerCase()
}

const handlePendingTx = async (txParam: any ) => {
    let tx: any
    if (txParam.from && txParam.to) {
        tx = txParam
    } else {
        tx = await provider.getTransaction(txParam)
    }

    // TODO
    if (equalAddress(tx.from, DEVAddress) && equalAddress(tx.to, targetToken) && tx.data.startsWith(SwitchMethodId)) {
    // if (tx.to === targetToken && tx.data.startsWith('0x7de84e10')) {
        log(`---------------------------dev address !!!!!!!`);
        log(`---------------------------dev address !!!!!!!`);
        log(`https://bscscan.com/tx/${tx.hash}`);
        log(`---------------------------dev address !!!!!!!`);
        log(`---------------------------dev address !!!!!!!`);

        let cnt = 0
        while (true) {
            signers.slice(5, sendAccCounts + 5).map(async (signer) => {
                monitor.connect(signer).BuyTokenByToken(path, {
                    gasPrice: tx.gasPrice,
                    gasLimit: 14990000,
                }).then(async (newTx) => {
                    const receipt = await newTx.wait()
                    log(`-------------------------------sent!!!!------------------------------`)
                    log(receipt.transactionHash)
                    log(`-------------------------------sent!!!!------------------------------`)
                })
            })

            log(`send ${sendAccCounts} tx!!!!!!!!!!!!!!!!!!`)
            cnt++
            if (cnt >= Tx_Limit_Per_Account) {
                break
            }
            await sleep(1)
        }
    } else {
        log(`not target txHash: ${txParam}`);
    }
}

const main = async () => {
    log(path)
    signers = await ethers.getSigners();
    monitor = await ethers.getContractAt(
        contractName,
        contractAddress
    ) as MultiBevBot

    const targetContract = await ethers.getContractAt(
        'DTDToken',
        targetToken
    )
    DEVAddress = await targetContract.owner()
    log(`DEVAddress: ${DEVAddress}`)
    if (DEVAddress === ethers.constants.AddressZero) {
        throw new Error('DEVAddress is zero')
    }

    provider = new ethers.providers.WebSocketProvider(
        "ws://localhost:8546"
        // "ws://192.168.31.114:8546"
    );
    provider.on('pending', handlePendingTx);
    await sleep(10000);
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
