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

let provider: any

// -----------------------------------------------------------------------------
// TODO !!!!
// const targetToken = '0x74C71c2A0F22600F82c94cdc680065169949aedC'  // Orange
const targetToken = '0xD53184f5f8B64F319A3E3F2561bC85c0dFf9F62f'  // SpaceMan
let DEVAddress: string
const approveMethodID       = "0x095ea7b3"
const transferMethodID      = "0xa9059cbb"
const transferFromMethodID  = "0x23b872dd"

// TODO
const sendAccCounts = 10
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
    if (!txParam) {
        return
    }

    let tx: any
    if (txParam.from && txParam.to) {
        tx = txParam
    } else {
        tx = await provider.getTransaction(txParam)
    }

    if (!tx) {
        return
    }

    // TODO
    if (tx.data.startsWith(approveMethodID) || tx.data.startsWith(transferMethodID) || tx.data.startsWith(transferFromMethodID)) {
        log(`approve/transfer tx from owner: ${tx.hash}`)
        return
    }

    if (equalAddress(tx.from, DEVAddress) && equalAddress(tx.to, targetToken)) {
    // if (tx.to === targetToken && tx.data.startsWith('0x7de84e10')) {
        log(`---------------------------dev address !!!!!!!`);
        log(`---------------------------dev address !!!!!!!`);
        log(`https://bscscan.com/tx/${tx.hash}`);
        log(`---------------------------dev address !!!!!!!`);
        log(`---------------------------dev address !!!!!!!`);


        let cnt = 0
        while (true) {
            signers.slice(7, sendAccCounts + 7).map(async (signer: SignerWithAddress) => {
                monitor.connect(signer).BuyTokenByToken(path, {
                    gasPrice: tx.gasPrice,
                    gasLimit: 4990000,
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

    const urls = [
        'http://13.231.5.254:29745',
        'http://13.214.187.73:29745',
        'http://16.163.109.87:29745',
        'http://54.183.168.47:29745',
        'http://35.176.215.186:29745',
        'http://3.248.190.219:29745',
        'http://18.192.116.191:29745',
        'http://34.241.153.229:29745',
        'http://52.49.152.79:29745',
        'https://bsc-dataseed.nariox.org/',
        'https://bsc.mytokenpocket.vip',
        'https://bsc.maiziqianbao.net',
        'https://binance.ankr.com',
        'https://bsc-dataseed1.binance.org/',
        'https://bsc-dataseed2.binance.org/',
        'https://bsc-dataseed3.binance.org/',
        'https://bsc-dataseed4.binance.org/',
        'https://bsc-dataseed1.defibit.io/',
        'https://bsc-dataseed2.defibit.io/',
        'https://bsc-dataseed3.defibit.io/',
        'https://bsc-dataseed4.defibit.io/',
        'https://bsc-dataseed1.ninicoin.io/',
        'https://bsc-dataseed2.ninicoin.io/',
        'https://bsc-dataseed3.ninicoin.io/',
        'https://bsc-dataseed4.ninicoin.io/',
        'https://bscrpc.com',
        'https://binance.nodereal.io',
    ]
    let signer = signers[0]

    const provider = new ethers.providers.JsonRpcProvider(urls[0]);
    const wsprovider = new ethers.providers.WebSocketProvider(
        "ws://localhost:8546"
    );

    const instances = []
    for (const url of urls) {
        for (const signer of signers) {
            const provider = new ethers.providers.JsonRpcProvider(url)
            instances.push(monitor.connect(signer).connect(provider))
        }
    }

    const instance = monitor.connect(signer).connect(provider)
    log('websocket', await instance.BuyTokenByToken([
        BSC_TOKENS.wbnb,
        BSC_TOKENS.usdt,
    ], {
        gasPrice: ethers.utils.parseUnits('1', 'gwei'),
        gasLimit: 4990000,
    }))


    for (let i = 0; i < instances.length; i++) {
        const instance = instances[i]
        log(await instance.targetToken())
    }
    // log(await signer.connect(provider))

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
