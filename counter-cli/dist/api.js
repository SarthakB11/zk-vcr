// This file is part of midnightntwrk/example-counter.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { Verifier, witnesses } from '@midnight-ntwrk/verifier-contract';
import { nativeToken, Transaction } from '@midnight-ntwrk/ledger';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { createBalancedTx, } from '@midnight-ntwrk/midnight-js-types';
import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { Transaction as ZswapTransaction } from '@midnight-ntwrk/zswap';
import { webcrypto } from 'crypto';
import * as Rx from 'rxjs';
import { WebSocket } from 'ws';
import { contractConfig } from './config';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { getLedgerNetworkId, getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import * as fsAsync from 'node:fs/promises';
import * as fs from 'node:fs';
let logger;
// Instead of setting globalThis.crypto which is read-only, we'll ensure crypto is available
// but won't try to overwrite the global property
// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;
export const getVerifierLedgerState = async (providers, contractAddress) => {
    assertIsContractAddress(contractAddress);
    logger.info('Checking contract ledger state...');
    const state = await providers.publicDataProvider
        .queryContractState(contractAddress)
        .then((contractState) => (contractState != null ? Verifier.ledger(contractState.data).verifier : null));
    logger.info(`Ledger state: ${state}`);
    return state;
};
export const verifierContractInstance = new Verifier.Contract(witnesses);
export const joinContract = async (providers, contractAddress) => {
    const verifierContract = await findDeployedContract(providers, {
        contractAddress,
        contract: verifierContractInstance,
        privateStateId: 'verifierPrivateState',
        initialPrivateState: { secret: 0 },
    });
    logger.info(`Joined contract at address: ${verifierContract.deployTxData.public.contractAddress}`);
    return verifierContract;
};
export const deploy = async (providers, privateState) => {
    logger.info('Deploying verifier contract...');
    const verifierContract = await deployContract(providers, {
        contract: verifierContractInstance,
        privateStateId: 'verifierPrivateState',
        initialPrivateState: privateState,
    });
    logger.info(`Deployed contract at address: ${verifierContract.deployTxData.public.contractAddress}`);
    return verifierContract;
};
export const verify = async (verifierContract, id) => {
    logger.info('Verifying...');
    const finalizedTxData = await verifierContract.callTx.verify(Buffer.from(id, 'hex'));
    logger.info(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
    return finalizedTxData.public;
};
export const displayVerifierState = async (providers, verifierContract) => {
    const contractAddress = verifierContract.deployTxData.public.contractAddress;
    const state = await getVerifierLedgerState(providers, contractAddress);
    if (state === null) {
        logger.info(`There is no verifier contract deployed at ${contractAddress}.`);
    }
    else {
        logger.info(`Current verifier state: ${Number(state)}`);
    }
    return { contractAddress, state };
};
export const createWalletAndMidnightProvider = async (wallet) => {
    const state = await Rx.firstValueFrom(wallet.state());
    return {
        coinPublicKey: state.coinPublicKey,
        encryptionPublicKey: state.encryptionPublicKey,
        balanceTx(tx, newCoins) {
            return wallet
                .balanceTransaction(ZswapTransaction.deserialize(tx.serialize(getLedgerNetworkId()), getZswapNetworkId()), newCoins)
                .then((tx) => wallet.proveTransaction(tx))
                .then((zswapTx) => Transaction.deserialize(zswapTx.serialize(getZswapNetworkId()), getLedgerNetworkId()))
                .then(createBalancedTx);
        },
        submitTx(tx) {
            return wallet.submitTransaction(tx);
        },
    };
};
export const waitForSync = (wallet) => Rx.firstValueFrom(wallet.state().pipe(Rx.throttleTime(5_000), Rx.tap((state) => {
    const applyGap = state.syncProgress?.lag.applyGap ?? 0n;
    const sourceGap = state.syncProgress?.lag.sourceGap ?? 0n;
    logger.info(`Waiting for funds. Backend lag: ${sourceGap}, wallet lag: ${applyGap}, transactions=${state.transactionHistory.length}`);
}), Rx.filter((state) => {
    // Let's allow progress only if wallet is synced fully
    return state.syncProgress !== undefined && state.syncProgress.synced;
})));
export const waitForSyncProgress = async (wallet) => await Rx.firstValueFrom(wallet.state().pipe(Rx.throttleTime(5_000), Rx.tap((state) => {
    const applyGap = state.syncProgress?.lag.applyGap ?? 0n;
    const sourceGap = state.syncProgress?.lag.sourceGap ?? 0n;
    logger.info(`Waiting for funds. Backend lag: ${sourceGap}, wallet lag: ${applyGap}, transactions=${state.transactionHistory.length}`);
}), Rx.filter((state) => {
    // Let's allow progress only if syncProgress is defined
    return state.syncProgress !== undefined;
})));
export const waitForFunds = (wallet) => Rx.firstValueFrom(wallet.state().pipe(Rx.throttleTime(10_000), Rx.tap((state) => {
    const applyGap = state.syncProgress?.lag.applyGap ?? 0n;
    const sourceGap = state.syncProgress?.lag.sourceGap ?? 0n;
    logger.info(`Waiting for funds. Backend lag: ${sourceGap}, wallet lag: ${applyGap}, transactions=${state.transactionHistory.length}`);
}), Rx.filter((state) => {
    // Let's allow progress only if wallet is synced
    return state.syncProgress?.synced === true;
}), Rx.map((s) => s.balances[nativeToken()] ?? 0n), Rx.filter((balance) => balance > 0n)));
export const buildWalletAndWaitForFunds = async ({ indexer, indexerWS, node, proofServer }, seed, filename) => {
    const directoryPath = process.env.SYNC_CACHE;
    let wallet;
    if (directoryPath !== undefined) {
        if (fs.existsSync(`${directoryPath}/${filename}`)) {
            logger.info(`Attempting to restore state from ${directoryPath}/${filename}`);
            try {
                const serializedStream = fs.createReadStream(`${directoryPath}/${filename}`, 'utf-8');
                const serialized = await streamToString(serializedStream);
                serializedStream.on('finish', () => {
                    serializedStream.close();
                });
                wallet = await WalletBuilder.restore(indexer, indexerWS, proofServer, node, seed, serialized, 'info');
                wallet.start();
                const stateObject = JSON.parse(serialized);
                if ((await isAnotherChain(wallet, Number(stateObject.offset))) === true) {
                    logger.warn('The chain was reset, building wallet from scratch');
                    wallet = await WalletBuilder.buildFromSeed(indexer, indexerWS, proofServer, node, seed, getZswapNetworkId(), 'info');
                    wallet.start();
                }
                else {
                    const newState = await waitForSync(wallet);
                    // allow for situations when there's no new index in the network between runs
                    if (newState.syncProgress?.synced) {
                        logger.info('Wallet was able to sync from restored state');
                    }
                    else {
                        logger.info(`Offset: ${stateObject.offset}`);
                        logger.info(`SyncProgress.lag.applyGap: ${newState.syncProgress?.lag.applyGap}`);
                        logger.info(`SyncProgress.lag.sourceGap: ${newState.syncProgress?.lag.sourceGap}`);
                        logger.warn('Wallet was not able to sync from restored state, building wallet from scratch');
                        wallet = await WalletBuilder.buildFromSeed(indexer, indexerWS, proofServer, node, seed, getZswapNetworkId(), 'info');
                        wallet.start();
                    }
                }
            }
            catch (error) {
                if (typeof error === 'string') {
                    logger.error(error);
                }
                else if (error instanceof Error) {
                    logger.error(error.message);
                }
                else {
                    logger.error(error);
                }
                logger.warn('Wallet was not able to restore using the stored state, building wallet from scratch');
                wallet = await WalletBuilder.buildFromSeed(indexer, indexerWS, proofServer, node, seed, getZswapNetworkId(), 'info');
                wallet.start();
            }
        }
        else {
            logger.info('Wallet save file not found, building wallet from scratch');
            wallet = await WalletBuilder.buildFromSeed(indexer, indexerWS, proofServer, node, seed, getZswapNetworkId(), 'info');
            wallet.start();
        }
    }
    else {
        logger.info('File path for save file not found, building wallet from scratch');
        wallet = await WalletBuilder.buildFromSeed(indexer, indexerWS, proofServer, node, seed, getZswapNetworkId(), 'info');
        wallet.start();
    }
    const state = await Rx.firstValueFrom(wallet.state());
    logger.info(`Your wallet seed is: ${seed}`);
    logger.info(`Your wallet address is: ${state.address}`);
    let balance = state.balances[nativeToken()];
    if (balance === undefined || balance === 0n) {
        logger.info(`Your wallet balance is: 0`);
        logger.info(`Waiting to receive tokens...`);
        balance = await waitForFunds(wallet);
    }
    logger.info(`Your wallet balance is: ${balance}`);
    return wallet;
};
export const randomBytes = (length) => {
    const bytes = new Uint8Array(length);
    webcrypto.getRandomValues(bytes);
    return bytes;
};
export const buildFreshWallet = async (config) => await buildWalletAndWaitForFunds(config, toHex(randomBytes(32)), '');
export const configureProviders = async (wallet, config) => {
    const walletAndMidnightProvider = await createWalletAndMidnightProvider(wallet);
    return {
        privateStateProvider: levelPrivateStateProvider({
            privateStateStoreName: contractConfig.privateStateStoreName,
        }),
        publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
        zkConfigProvider: new NodeZkConfigProvider(contractConfig.zkConfigPath),
        proofProvider: httpClientProofProvider(config.proofServer),
        walletProvider: walletAndMidnightProvider,
        midnightProvider: walletAndMidnightProvider,
    };
};
export function setLogger(_logger) {
    logger = _logger;
}
export const streamToString = async (stream) => {
    const chunks = [];
    return await new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk));
        stream.on('error', (err) => {
            reject(err);
        });
        stream.on('end', () => {
            resolve(Buffer.concat(chunks).toString('utf8'));
        });
    });
};
export const isAnotherChain = async (wallet, offset) => {
    await waitForSyncProgress(wallet);
    // Here wallet does not expose the offset block it is synced to, that is why this workaround
    const walletOffset = Number(JSON.parse(await wallet.serializeState()).offset);
    if (walletOffset < offset - 1) {
        logger.info(`Your offset offset is: ${walletOffset} restored offset: ${offset} so it is another chain`);
        return true;
    }
    else {
        logger.info(`Your offset offset is: ${walletOffset} restored offset: ${offset} ok`);
        return false;
    }
};
export const saveState = async (wallet, filename) => {
    const directoryPath = process.env.SYNC_CACHE;
    if (directoryPath !== undefined) {
        logger.info(`Saving state in ${directoryPath}/${filename}`);
        try {
            await fsAsync.mkdir(directoryPath, { recursive: true });
            const serializedState = await wallet.serializeState();
            const writer = fs.createWriteStream(`${directoryPath}/${filename}`);
            writer.write(serializedState);
            writer.on('finish', function () {
                logger.info(`File '${directoryPath}/${filename}' written successfully.`);
            });
            writer.on('error', function (err) {
                logger.error(err);
            });
            writer.end();
        }
        catch (e) {
            if (typeof e === 'string') {
                logger.warn(e);
            }
            else if (e instanceof Error) {
                logger.warn(e.message);
            }
        }
    }
    else {
        logger.info('Not saving cache as sync cache was not defined');
    }
};
//# sourceMappingURL=api.js.map