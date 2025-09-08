import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { Verifier, type VerifierPrivateState, witnesses, type VerifiableCredential } from '@midnight-ntwrk/zk-vcr-contract';
import { type CoinInfo, nativeToken, Transaction, type TransactionId } from '@midnight-ntwrk/ledger';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import {
  type BalancedTransaction,
  createBalancedTx,
  type FinalizedTxData,
  type MidnightProvider,
  type UnbalancedTransaction,
  type WalletProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { type Resource, WalletBuilder } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import { Transaction as ZswapTransaction } from '@midnight-ntwrk/zswap';
import { webcrypto } from 'crypto';
import { type Logger } from 'pino';
import * as Rx from 'rxjs';
import { WebSocket } from 'ws';
import {
  type VerifierContract,
  type VerifierPrivateStateId,
  type VerifierProviders,
  type DeployedVerifierContract,
  VerifierCircuits,
} from './common-types';
import { type Config, contractConfig } from './config';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { getLedgerNetworkId, getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import * as fsAsync from 'node:fs/promises';
import * as fs from 'node:fs';

let logger: Logger;
(globalThis as any).WebSocket = WebSocket;

export const getVerifierLedgerState = async (
  providers: VerifierProviders,
  contractAddress: ContractAddress,
): Promise<string | null> => {
  assertIsContractAddress(contractAddress);
  logger.info('Checking contract ledger state...');
  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  if (contractState) {
    const ledgerState = Verifier.ledger(contractState.data);

    const trustedIssuersMap = new Map<string, boolean>();
    for (const [key, value] of ledgerState.trustedIssuers) {
      trustedIssuersMap.set(toHex(key), value);
    }

    const usedNoncesMap = new Map<string, boolean>();
    for (const [key, value] of ledgerState.usedNonces) {
      usedNoncesMap.set(key.toString(), value);
    }

    const plainObject = {
      owner: toHex(ledgerState.owner),
      trustedIssuers: Object.fromEntries(trustedIssuersMap),
      usedNonces: Object.fromEntries(usedNoncesMap),
      modelParameters: {
        riskThreshold: ledgerState.modelParameters.riskThreshold.toString(),
      },
    };

    const stateStr = JSON.stringify(plainObject, null, 2);
    logger.info(`Ledger state: ${stateStr}`);
    return stateStr;
  } else {
    logger.info('Ledger state: null');
    return null;
  }
};

export const verifierContractInstance: VerifierContract = new Verifier.Contract(witnesses);

export const joinContract = async (
  providers: VerifierProviders,
  contractAddress: string,
): Promise<DeployedVerifierContract> => {
  const verifierContract = await findDeployedContract(providers, {
    contractAddress,
    contract: verifierContractInstance,
    privateStateId: 'verifierPrivateState',
    initialPrivateState: { secret: new Uint8Array(32) },
  });
  logger.info(`Joined contract at address: ${verifierContract.deployTxData.public.contractAddress}`);
  return verifierContract;
};

export const deploy = async (
  providers: VerifierProviders,
  ownerSk: Uint8Array,
): Promise<DeployedVerifierContract> => {
  logger.info('Deploying verifier contract...');
  const initialThreshold = 180n;
  const verifierContract = await deployContract(providers, {
    contract: verifierContractInstance,
    privateStateId: 'verifierPrivateState',
    initialPrivateState: { secret: ownerSk },
    args: [ownerSk, initialThreshold],
  });
  logger.info(`Deployed contract at address: ${verifierContract.deployTxData.public.contractAddress}`);
  return verifierContract;
};

export const addIssuer = async (
  providers: VerifierProviders,
  verifierContract: DeployedVerifierContract,
  ownerSk: Uint8Array,
  issuerKey: Uint8Array,
): Promise<FinalizedTxData> => {
  logger.info('Updating private state with owner secret key for authentication...');
  const currentPrivateState = await providers.privateStateProvider.get('verifierPrivateState');
  if (!currentPrivateState) {
    throw new Error('Could not find private state to update for owner authentication.');
  }
  currentPrivateState.secret = ownerSk;
  await providers.privateStateProvider.set('verifierPrivateState', currentPrivateState);
  logger.info('Private state updated. Adding issuer...');
  const finalizedTxData = await verifierContract.callTx.addIssuer(issuerKey);
  logger.info(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  return finalizedTxData.public;
};

export const revokeIssuer = async (
  providers: VerifierProviders,
  verifierContract: DeployedVerifierContract,
  ownerSk: Uint8Array,
  issuerKey: Uint8Array,
): Promise<FinalizedTxData> => {
  logger.info('Updating private state with owner secret key for authentication...');
  const currentPrivateState = await providers.privateStateProvider.get('verifierPrivateState');
  if (!currentPrivateState) {
    throw new Error('Could not find private state to update for owner authentication.');
  }
  currentPrivateState.secret = ownerSk;
  await providers.privateStateProvider.set('verifierPrivateState', currentPrivateState);
  logger.info('Private state updated. Revoking issuer...');
  const finalizedTxData = await verifierContract.callTx.revokeIssuer(issuerKey);
  logger.info(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  return finalizedTxData.public;
};

export const getChallenge = async (
  verifierContract: DeployedVerifierContract,
): Promise<bigint> => {
  logger.info('Getting challenge from contract...');
  const finalizedTxData = await verifierContract.callTx.getChallenge();
  logger.info(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  return finalizedTxData.private.result;
};

export const submitHealthProof = async (
  verifierContract: DeployedVerifierContract,
  challenge: bigint,
  issuerKey: Uint8Array,
): Promise<FinalizedTxData> => {
  logger.info('Submitting health proof...');
  const finalizedTxData = await verifierContract.callTx.submitHealthProof(issuerKey, challenge);
  logger.info(`Transaction ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`);
  return finalizedTxData.public;
};

export const displayVerifierState = async (
  providers: VerifierProviders,
  verifierContract: DeployedVerifierContract,
): Promise<{ state: string | null; contractAddress: string }> => {
  const contractAddress = verifierContract.deployTxData.public.contractAddress;
  const state = await getVerifierLedgerState(providers, contractAddress);
  if (state === null) {
    logger.info(`There is no verifier contract deployed at ${contractAddress}.`);
  } else {
    logger.info(`Current verifier state: ${state}`);
  }
  return { contractAddress, state };
};

export const createWalletAndMidnightProvider = async (wallet: Wallet): Promise<WalletProvider & MidnightProvider> => {
  const state = await Rx.firstValueFrom(wallet.state());
  return {
    coinPublicKey: state.coinPublicKey,
    encryptionPublicKey: state.encryptionPublicKey,
    balanceTx(tx: UnbalancedTransaction, newCoins: CoinInfo[]): Promise<BalancedTransaction> {
      return wallet
        .balanceTransaction(
          ZswapTransaction.deserialize(tx.serialize(getLedgerNetworkId()), getZswapNetworkId()),
          newCoins,
        )
        .then((tx) => wallet.proveTransaction(tx))
        .then((zswapTx) => Transaction.deserialize(zswapTx.serialize(getZswapNetworkId()), getLedgerNetworkId()))
        .then(createBalancedTx);
    },
    submitTx(tx: BalancedTransaction): Promise<TransactionId> {
      return wallet.submitTransaction(tx);
    },
  };
};

export const waitForSync = (wallet: Wallet) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.tap((state) => {
        const applyGap = state.syncProgress?.lag.applyGap ?? 0n;
        const sourceGap = state.syncProgress?.lag.sourceGap ?? 0n;
        logger.info(
          `Waiting for funds. Backend lag: ${sourceGap}, wallet lag: ${applyGap}, transactions=${state.transactionHistory.length}`,
        );
      }),
      Rx.filter((state) => {
        return state.syncProgress !== undefined && state.syncProgress.synced;
      }),
    ),
  );

export const waitForSyncProgress = async (wallet: Wallet) =>
  await Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.tap((state) => {
        const applyGap = state.syncProgress?.lag.applyGap ?? 0n;
        const sourceGap = state.syncProgress?.lag.sourceGap ?? 0n;
        logger.info(
          `Waiting for funds. Backend lag: ${sourceGap}, wallet lag: ${applyGap}, transactions=${state.transactionHistory.length}`,
        );
      }),
      Rx.filter((state) => {
        return state.syncProgress !== undefined;
      }),
    ),
  );

export const waitForFunds = (wallet: Wallet) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.tap((state) => {
        const applyGap = state.syncProgress?.lag.applyGap ?? 0n;
        const sourceGap = state.syncProgress?.lag.sourceGap ?? 0n;
        logger.info(
          `Waiting for funds. Backend lag: ${sourceGap}, wallet lag: ${applyGap}, transactions=${state.transactionHistory.length}`,
        );
      }),
      Rx.filter((state) => {
        return state.syncProgress?.synced === true;
      }),
      Rx.map((s) => s.balances[nativeToken()] ?? 0n),
      Rx.filter((balance) => balance > 1000000n),
    ),
  );

export const buildWalletAndWaitForFunds = async (
  { indexer, indexerWS, node, proofServer }: Config,
  seed: string,
  filename: string,
): Promise<Wallet & Resource> => {
  const directoryPath = process.env.SYNC_CACHE;
  let wallet: Wallet & Resource;
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
          wallet = await WalletBuilder.buildFromSeed(
            indexer,
            indexerWS,
            proofServer,
            node,
            seed,
            getZswapNetworkId(),
            'info',
          );
          wallet.start();
        } else {
          const newState = await waitForSync(wallet);
          if (newState.syncProgress?.synced) {
            logger.info('Wallet was able to sync from restored state');
          } else {
            logger.info(`Offset: ${stateObject.offset}`);
            logger.info(`SyncProgress.lag.applyGap: ${newState.syncProgress?.lag.applyGap}`);
            logger.info(`SyncProgress.lag.sourceGap: ${newState.syncProgress?.lag.sourceGap}`);
            logger.warn('Wallet was not able to sync from restored state, building wallet from scratch');
            wallet = await WalletBuilder.buildFromSeed(
              indexer,
              indexerWS,
              proofServer,
              node,
              seed,
              getZswapNetworkId(),
              'info',
            );
            wallet.start();
          }
        }
      } catch (error: unknown) {
        if (typeof error === 'string') {
          logger.error(error);
        } else if (error instanceof Error) {
          logger.error(error.message);
        } else {
          logger.error(error);
        }
        logger.warn('Wallet was not able to restore using the stored state, building wallet from scratch');
        wallet = await WalletBuilder.buildFromSeed(
          indexer,
          indexerWS,
          proofServer,
          node,
          seed,
          getZswapNetworkId(),
          'info',
        );
        wallet.start();
      }
    } else {
      logger.info('Wallet save file not found, building wallet from scratch');
      wallet = await WalletBuilder.buildFromSeed(
        indexer,
        indexerWS,
        proofServer,
        node,
        seed,
        getZswapNetworkId(),
        'info',
      );
      wallet.start();
    }
  } else {
    logger.info('File path for save file not found, building wallet from scratch');
    wallet = await WalletBuilder.buildFromSeed(
      indexer,
      indexerWS,
      proofServer,
      node,
      seed,
      getZswapNetworkId(),
      'info',
    );
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

export const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  webcrypto.getRandomValues(bytes);
  return bytes;
};

export const buildFreshWallet = async (config: Config): Promise<Wallet & Resource> =>
  await buildWalletAndWaitForFunds(config, toHex(randomBytes(32)), '');

export const configureProviders = async (wallet: Wallet & Resource, config: Config) => {
  const walletAndMidnightProvider = await createWalletAndMidnightProvider(wallet);
  return {
    privateStateProvider: levelPrivateStateProvider<typeof VerifierPrivateStateId>({
      privateStateStoreName: contractConfig.privateStateStoreName,
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider: new NodeZkConfigProvider<VerifierCircuits>(contractConfig.zkConfigPath),
    proofProvider: httpClientProofProvider(config.proofServer),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };
};

export function setLogger(_logger: Logger) {
  logger = _logger;
}

export const streamToString = async (stream: fs.ReadStream): Promise<string> => {
  const chunks: Buffer[] = [];
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

export const isAnotherChain = async (wallet: Wallet, offset: number) => {
  await waitForSyncProgress(wallet);
  const walletOffset = Number(JSON.parse(await wallet.serializeState()).offset);
  if (walletOffset < offset - 1) {
    logger.info(`Your offset offset is: ${walletOffset} restored offset: ${offset} so it is another chain`);
    return true;
  } else {
    logger.info(`Your offset offset is: ${walletOffset} restored offset: ${offset} ok`);
    return false;
  }
};

export const saveState = async (wallet: Wallet, filename: string) => {
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
    } catch (e) {
      if (typeof e === 'string') {
        logger.warn(e);
      } else if (e instanceof Error) {
        logger.warn(e.message);
      }
    }
  } else {
    logger.info('Not saving cache as sync cache was not defined');
  }
};
