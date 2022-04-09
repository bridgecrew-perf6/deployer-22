import {BABYCAKE, BevBot, TargetToken} from '../../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { formatEther } from 'ethers/lib/utils';
import { BigNumber, ContractReceipt, ContractTransaction } from 'ethers';
import { TransactionDescription } from '@ethersproject/abi/src.ts/interface';
import { Transaction } from '@ethersproject/transactions';
import { WebSocketProvider } from '@ethersproject/providers';
import { TransactionResponse } from '@ethersproject/abstract-provider';

const _ = require('lodash');
const { ethers } = require('hardhat');
const { sleep, sleepMS, log, dateFormat } = require('../utils/util');
const { BSC_TOKENS } = require('../utils/constants');
const unit: BigNumber = ethers.constants.WeiPerEther;
const pancakeRouter = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

let deploymentsObj = require('./mainnet/bsc-56-deploy-BevBot.json');
const fs = require('fs');

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

let websocketProvider: WebSocketProvider;

// -----------------------------------------------------------------------------
// TODO !!!!
const WEBSOCKET_URL = 'ws://localhost:8546';
// const WEBSOCKET_URL = 'ws://192.168.31.114:8546';
const LOAD_CONFIG_INTERVAL_SECONDS = 1000 * 60; // 3 minutes

let DEVAddress :string;
// const sendAccCounts = 20;
// const Tx_Limit_Per_Account = 5;
// const path = [BSC_TOKENS.wbnb, targetToken];

let targetConfig: TargetConfig;

// FOR BABYCAKE DEV
const iFace = new ethers.utils.Interface([
    'function updateTrading(bool _tradingEnabled) external',
]);
// -----------------------------------------------------------------------------

let bevBot: BevBot;
let signers: SignerWithAddress[];
const contractName = deploymentsObj.ContractName;
const contractAddress = deploymentsObj.ContractAddress;

const parseTx = (tx: Transaction): TransactionDescription | null => {
    try {
        return iFace.parseTransaction(tx);
    } catch (e) {
        return null;
    }
};

const handlePendingTx = async (txObject: any) => {
    let tx: TransactionResponse =
        txObject.from && txObject.to
            ? (txObject as TransactionResponse)
            : ((await websocketProvider.getTransaction(txObject)) as TransactionResponse);

    const txDesc = parseTx(tx);
    if (!txDesc) {
        log(`not target txHash: ${tx.hash}`);
        return null;
    }

    log(
        JSON.stringify(
            {
                sighash: txDesc.sighash,
                signature: txDesc.signature,
                args: txDesc.args,
                value: txDesc.value,
                url: `https://bscscan.com/tx/${tx.hash}`,
            },
            null,
            2
        )
    );

    log(`############################## find monitor tx !!!!!!!!!!!!!!!`);
    // check dev TODO TODO
    // if (tx.from !== DEVAddress) return null;

    // check to contract address
    if (tx.to !== targetConfig.targetTokenAddress) return null;

    // check fee
    let totalFee = unit.mul(0)
    for (let i = 0; i < txDesc.args.length; i++) {
        totalFee = totalFee.add(txDesc.args[i]);
    }

    log(`totalFee: ${totalFee.toString()}`);
    const TotalFeeLimit = BigNumber.from(50)
    if (totalFee.gt(TotalFeeLimit)) {
        log(`############################## exceed totalFee limit ${totalFee.toString()}`);
        return null;
    }


    // multi send tx
    let cnt = 0;
    const sendAccCounts = targetConfig.sendTxAccCounts;
    const path = [BSC_TOKENS.wbnb, targetConfig.targetTokenAddress];
    while (true) {
        signers.slice(0, sendAccCounts).map(async (signer) => {
            const newTx = await bevBot.connect(signer).BuyTokenByToken(path, {
                gasPrice: tx.gasPrice,
                gasLimit: targetConfig.gasLimit,
            });
            const receipt = await newTx.wait();
            log(`-------------------------------sent!!!!------------------------------`);
            log(receipt.transactionHash);
            log(`-------------------------------sent!!!!------------------------------`);
        });

        log(`send ${sendAccCounts} tx!!!!!!!!!!!!!!!!!!`);
        cnt++;
        if (cnt >= targetConfig.sendCountsPerAccount) {
            break;
        }
        await sleepMS(targetConfig.sendIntervalMS);
    }

};

const main = async () => {
    signers = await ethers.getSigners();
    bevBot = (await ethers.getContractAt(contractName, contractAddress)) as BevBot;
    await loadConfig(bevBot);
    const Target = await ethers.getContractAt(
        'BABYCAKE',
        targetConfig.targetTokenAddress
    ) as BABYCAKE
    DEVAddress = await Target.owner();

    websocketProvider = new ethers.providers.WebSocketProvider(WEBSOCKET_URL);
    websocketProvider.on('pending', handlePendingTx);

    while (true) {
        await loadConfig(bevBot);
        log('DEVAddress', DEVAddress)
        await sleep(LOAD_CONFIG_INTERVAL_SECONDS);
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
    fs.writeFileSync(
        mainnetDir + `/Config-${timeStrFmt}-${symbol}-${targetTokenAddress}.json`,
        JSON.stringify(targetConfig, null, 2)
    );
    return targetConfig;
};

export const toHuman = (x: BigNumber, fractionDigits = 2) => {
    return formatEther(x);
};

export async function waitTx(txRequest: Promise<ContractTransaction>): Promise<ContractReceipt> {
    const txResponse = await txRequest;
    return await txResponse.wait(1);
}

/*
// Receipt

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
