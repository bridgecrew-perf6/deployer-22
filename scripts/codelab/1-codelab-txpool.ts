import { UniswapV2Router02 } from '../../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { formatEther } from 'ethers/lib/utils';
import { BigNumber, ContractReceipt, ContractTransaction } from 'ethers';
const { ethers } = require('hardhat');
const { sleep } = require('../utils/util');
const log = console.log.bind(console);
const unit: BigNumber = ethers.constants.WeiPerEther;

let router: UniswapV2Router02, operator: SignerWithAddress;
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

type Address = string;

const handleSwapTx = (tx: ContractTransaction) => {
    const pancakeRouter = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
    if (tx.to !== pancakeRouter) {
        return;
    }
    const signHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(
            'enableTrading()'
        )
    );
    const funcSig = signHash.slice(0, 10);
    if (!tx.data.startsWith(funcSig)) {
        return
    }


}

const handlePendingTx = async (tx: ContractTransaction) => {
    log(`pending tx: ${tx.hash} from ${tx.from}`);

    const calldata = tx.data;
    const signHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(
            'enableTrading()'
        )
    );
    const funcSig = signHash.slice(0, 10);
    if (calldata.startsWith(funcSig) && tx.to === '0x3881AA2782A2CA3D845B91e6fC57739D9bE54AA1') {
        log('!!!!!!check enableTrading success', tx.hash);
    }

}

const main = async () => {
    log(await ethers.provider.getBlockNumber())

    ethers.provider.on('pending', handlePendingTx);

    while (true) {
        log(await ethers.provider.getBlockNumber())
        log(`${ (new Date()).toLocaleTimeString() } waiting for pending tx`);
        await sleep(3);
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
