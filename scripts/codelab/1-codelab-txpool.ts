import {UniswapV2Router02} from "../../typechain-types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {formatEther} from "ethers/lib/utils";
import {BigNumber, ContractReceipt, ContractTransaction} from "ethers";
import {TransactionRequest} from "@ethersproject/providers";
const { ethers } = require('hardhat')
const { sleep } = require('../utils/util')
const log = console.log.bind(console)
const unit: BigNumber = ethers.constants.WeiPerEther

let router: UniswapV2Router02, operator: SignerWithAddress

const main = async () => {

    ethers.provider.on('pending', (tx: any) => {
        log(`pending tx: ${tx.hash} from ${tx.from}`)
    })

    while (true) {
        log('waiting for txpool')
        await sleep(1000)
    }
}

export const toHuman = (x: BigNumber, fractionDigits = 2) => {
  return formatEther(x)
}

export async function waitTx(txRequest: Promise<ContractTransaction>): Promise<ContractReceipt> {
  const txResponse = await txRequest
  return await txResponse.wait(1)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
