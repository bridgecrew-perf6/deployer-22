import '@typechain/hardhat';
import 'hardhat-watcher'
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import '@openzeppelin/hardhat-upgrades';
import "@nomiclabs/hardhat-etherscan";
import 'dotenv/config';

module.exports = {
    solidity: {
        compilers: [
            {
                version: "0.5.16",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    }
                }
            },
            {
                version: "0.5.0",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    }
                }
            },
            {
                version: "0.6.6",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    }
                }
            },
            {
                version: "0.6.12",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    }
                }
            },
            {
                version: "0.7.0",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    }
                }
            },
            {
                version: "0.7.4",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    }
                }
            },
            {
                version: "0.8.1",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    }
                }
            },
            {
                version: "0.8.7",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    }
                }
            },
            {
                version: "0.8.9",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    }
                }
            },
            {
                version: "0.8.11",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    }
                }
            },
            {
                version: "0.8.0",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    }
                }
            },
            {
                version: "0.4.24",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200
                    }
                }
            }
        ]
    },
    networks: {
        'monitor': {
            // url: process.env.BSC_API || "",
            url: process.env.BSC_ENHANCED_API || "",
            // url: "https://bsc-dataseed1.defibit.io/",
            // url:"https://bsc-dataseed1.ninicoin.io",
            accounts: {
                mnemonic: process.env.TEST_MN_KOBE || "",
                count: 20,
            }
        },
        'test': {
            // url: process.env.BSC_API || "",
            url: process.env.BSC_ENHANCED_API || "",
            // url: "https://bsc-dataseed1.defibit.io/",
            // url:"https://bsc-dataseed1.ninicoin.io",
            accounts: {
                mnemonic: process.env.BSC_TEST_MN || "",
                count: 100,
            }
        },
        'archive': {
            url: process.env.BSC_ARCHIVE_API || "",
            // url: process.env.BSC_ENHANCED_API || "",
            accounts: {
                mnemonic: process.env.BSC_TEST_MN || "",
                count: 100,
            }
        },
        'jp': {
            url: 'http://127.0.0.1:8545',
            accounts: {
                mnemonic: process.env.TEST_MN_KOBE || "",
                count: 100,
            }
        },
        'msi-1': {
            url: 'http://192.168.31.114:8545',
            accounts: {
                mnemonic: process.env.BSC_TEST_MN || "",
                count: 100,
            }
        },
        'triggers': {
            url: 'http://127.0.0.1:8545',
            accounts: {
                mnemonic: process.env.TEST_TRIGGER_MN || "",
                count: 100,
            }
        }
    },
    watcher: {
        compilation: {
            tasks: ["compile"],
            files: ["./contracts"],
            verbose: true,
        }
    },
    mocha: {
        timeout: 2000000
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    },
    etherscan: {
      // Your API key for Etherscan
      // Obtain one at https://etherscan.io/
      apiKey: process.env.BSC_LEI_ETHERSCAN
    },
};

