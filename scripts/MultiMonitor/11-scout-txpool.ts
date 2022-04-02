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

const path = [
    BSC_TOKENS.wbnb,
    // BSC_TOKENS.usdt,
    '0x7C61DA1242580D7BA195c01A935624b04468f0bC',
]
let monitor: MultiBevBot, operator: SignerWithAddress;
let signers: SignerWithAddress[];
const contractName = 'MultiBevBot'
const contractAddress = '0xbf9f6A075406e15742d904d484eb79F5be08501b'

const handlePendingTx = async (txParam: any ) => {
    let tx: any
    if (txParam.from && txParam.to) {
        tx = txParam
    } else {
        tx = await provider.getTransaction(txParam)
    }

    // if (tx.from === '0x88cbC4c960a818F0E196d9392Ba02293Df478354' &&
    //     tx.to === '0x9E0115E7C2929c1a78E08f6eBD18A07a94071CEc') {
    if (tx.from === '0xf21B4ee02f58b0FD02B8dD24b699DaC14e11b974' &&
        tx.to === '0xec2DFaDCAa9b397aC57cC96De8391C2805709D0F') {
        log(`---------------------------dev address !!!!!!!`);
        log(`---------------------------dev address !!!!!!!`);
        log(`---------------------------dev address !!!!!!!`);

        while (true) {
            signers.slice(0, 5).map(async (signer) => {
                const newTx = await monitor.connect(signer).BuyTokenByToken(path, {
                    gasPrice: tx.gasPrice,
                    gasLimit: 11000000,
                })
                const receipt = await newTx.wait()
                log(receipt.transactionHash)
            })

            log(`send 10 tx!!!!!!!!!!!!!!!!!!`)
            await sleep(3)
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

    provider = new ethers.providers.WebSocketProvider(
        "ws://localhost:8546"
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
