import { MultiBevBot, TargetToken, UniswapV2Router02 } from '../../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { formatEther } from 'ethers/lib/utils';
import { BigNumber, BigNumberish, ContractReceipt, ContractTransaction } from 'ethers';
import {Result} from "@ethersproject/abi";
import {TransactionDescription} from "@ethersproject/abi/src.ts/interface";
const _ = require('lodash');
const { ethers } = require('hardhat');
const { sleep, sleepMS, log, dateFormat } = require('../utils/util');
const { BSC_TOKENS } = require('../utils/constants');
const unit: BigNumber = ethers.constants.WeiPerEther;
const pancakeRouter = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

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

export interface TargetConfig {
    targetTokenAddress: string;
    gasLimit: number;
    sendCountsPerAccount: number;
    sendTxAccCounts: number;
    lpBNBAmountThreshold: BigNumber;
    sendIntervalMS: number;
}

export interface BotContract {
    getTarget: () => Promise<any[]>;
}

let provider: any;

// -----------------------------------------------------------------------------
// TODO !!!!
const WEBSOCKET_URL = 'ws://localhost:8546'
// const WEBSOCKET_URL = 'ws://192.168.31.114:8546';
const LOAD_CONFIG_INTERVAL_SECONDS = 2 * 60; // 3 minutes

const targetToken = '0xaF42b6959b22321523258bB53822a343247273E6'; // LF
const DEVAddress = '0xB397D30111BDA6884445934d37792dD825A0F42e';
const sendAccCounts = 20;
const Tx_Limit_Per_Account = 5;
const path = [BSC_TOKENS.wbnb, targetToken];

let targetConfig: TargetConfig;

const iFace = new ethers.utils.Interface([
    "function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external",
    "function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external payable",
]);
// -----------------------------------------------------------------------------

let multiBevBot: MultiBevBot, operator: SignerWithAddress;
let signers: SignerWithAddress[];
const contractName = 'MultiBevBot';
const contractAddress = '0xbf9f6A075406e15742d904d484eb79F5be08501b';

const parseTx = (tx: ContractTransaction): TransactionDescription | null => {
    try {
        return  iFace.parseTransaction(tx);
    } catch (e) {
        return null;
    }
}


const handlePendingTx = async (txObject: any) => {
    let tx: ContractTransaction = (txObject.from && txObject.to)
        ? txObject as ContractTransaction
        : await provider.getTransaction(txObject) as ContractTransaction;

    const txDesc = parseTx(tx);
    if (txDesc) {
        log(`############################## find monitor tx !!!!!!!!!!!!!!!`);
        log(JSON.stringify({
            sighash: txDesc.sighash,
            signature: txDesc.signature,
            // args: txDesc.args,
            value: txDesc.value,
            url: `https://bscscan.com/tx/${tx.hash}`
        }, null, 2));
        return
/*
        let cnt = 0;
        while (true) {
            signers.slice(0, sendAccCounts).map(async (signer) => {
                const newTx = await multiBevBot.connect(signer).BuyTokenByToken(path, {
                    gasPrice: tx.gasPrice,
                    gasLimit: 8000000,
                });
                const receipt = await newTx.wait();
                log(`-------------------------------sent!!!!------------------------------`);
                log(receipt.transactionHash);
                log(`-------------------------------sent!!!!------------------------------`);
            });

            log(`send ${sendAccCounts} tx!!!!!!!!!!!!!!!!!!`);
            cnt++;
            if (cnt >= Tx_Limit_Per_Account) {
                break;
            }
            await sleep(1);
        }
*/
    }

    // log(`not target txHash: ${tx.hash}`);
};

const main = async () => {
    signers = await ethers.getSigners();
    multiBevBot = (await ethers.getContractAt(contractName, contractAddress)) as MultiBevBot;

    provider = new ethers.providers.WebSocketProvider(WEBSOCKET_URL);
    provider.on('pending', handlePendingTx);

    while (true) {
        await loadConfig(multiBevBot)
        await sleep(LOAD_CONFIG_INTERVAL_SECONDS)
    }
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


const loadConfig = async (bot: BotContract): Promise<TargetConfig> => {
    const configArray = await bot.getTarget();
    const targetTokenAddress = configArray[0];
    const gasLimit = configArray[1].toNumber();
    const sendCountsPerAccount = configArray[2].toNumber();
    const sendTxAccCounts = configArray[3].toNumber();
    const lpBNBAmountThreshold = configArray[4];
    const sendIntervalMS = configArray[5].toNumber();

    const newTargetConfig = {
        targetTokenAddress,
        gasLimit,
        sendCountsPerAccount,
        sendTxAccCounts,
        lpBNBAmountThreshold,
        sendIntervalMS,
    } as TargetConfig;

    if (_.isEqual(newTargetConfig, targetConfig)) {
        log(`config not changed`);
        return targetConfig;
    }
    const target: TargetToken = await ethers.getContractAt('TargetToken', targetTokenAddress);

    // TODO
    const targetDecimals: number = await target.decimals();
    const symbol: string = await target.symbol();

    targetConfig = newTargetConfig;
    log(`----------------- loadConfig success: ${JSON.stringify(targetConfig)}`);


    const mainnetDir = __dirname + '/data';
    if (!fs.existsSync(mainnetDir)) {
        fs.mkdirSync(mainnetDir, { recursive: true });
    }
    const timeStrFmt = dateFormat('mm-dd_HH-MM-SS', new Date());
    fs.writeFileSync(mainnetDir + `/Config-${timeStrFmt}-${symbol}-${targetTokenAddress}.json`, JSON.stringify(targetConfig, null, 2));
    return targetConfig;
};

export const toHuman = (x: BigNumber, fractionDigits = 2) => {
    return formatEther(x);
};

export async function waitTx(txRequest: Promise<ContractTransaction>): Promise<ContractReceipt> {
    const txResponse = await txRequest;
    return await txResponse.wait(1);
}
