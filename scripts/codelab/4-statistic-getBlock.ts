import { ethers } from 'hardhat';
const log = console.log;
let websocketProvider;
const WEBSOCKET_URL = 'ws://127.0.0.1:8546';

const main = async () => {
    websocketProvider = new ethers.providers.WebSocketProvider(WEBSOCKET_URL);

    const monitors = [
        '0xd67dee15148f8fe037402e120327b72374930152',
        '0xea3301956cbfdaba0de0579e1b8a530752b449b9',
    ];
    const countMap: any = {};

    let cnt = 0;
    for (let i = 17880630; i <= 17880640; i++) {
        const block = await websocketProvider.getBlock(i);
        console.log(block.number, block.hash);
        log(cnt);
        const txs = block.transactions;
        for (const txId of txs) {
            const tx = await websocketProvider.getTransaction(txId);

            let account: string = tx.to || '';
            if (monitors.includes(account)) {
                cnt++;
                countMap[account] = countMap[account] ? countMap[account] + 1 : 1;
                const gasPrice = tx.gasPrice ? tx.gasPrice.toNumber() : 0;
                countMap[gasPrice] = countMap[gasPrice] ? countMap[gasPrice] + 1 : 1;
            }
        }

        log('blockNumber', i)
        log('countMap', JSON.stringify(countMap, null, 2))
    }

    log(JSON.stringify(countMap, null, 2));
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
