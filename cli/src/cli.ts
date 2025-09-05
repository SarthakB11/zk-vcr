
import { type Resource } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface, type Interface } from 'node:readline/promises';
import { type Logger } from 'pino';
import { type VerifierProviders, type DeployedVerifierContract } from './common-types';
import { type Config } from './config';
import * as api from './api';

let logger: Logger;

const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new verifier contract
  2. Join an existing verifier contract
  3. Exit
Which would you like to do? `;

const MAIN_LOOP_QUESTION = `
You can do one of the following:
  1. Call the submitHealthProof circuit
  2. Display current verifier state
  3. Exit
Which would you like to do? `;

const join = async (providers: VerifierProviders, rli: Interface): Promise<DeployedVerifierContract> => {
  const contractAddress = await rli.question('What is the contract address (in hex)? ');
  return await api.joinContract(providers, contractAddress);
};

const deployOrJoin = async (providers: VerifierProviders, rli: Interface): Promise<DeployedVerifierContract | null> => {
  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1': {
        const secret = await rli.question('Enter the initial secret (hex): ');
        return await api.deploy(providers, { secret: Buffer.from(secret, 'hex') });
      }
      case '2':
        return await join(providers, rli);
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const mainLoop = async (providers: VerifierProviders, rli: Interface): Promise<void> => {
  const verifierContract = await deployOrJoin(providers, rli);
  if (verifierContract === null) {
    return;
  }
  while (true) {
    const choice = await rli.question(MAIN_LOOP_QUESTION);
    switch (choice) {
      case '1': {
        const challenge = await rli.question('Enter the challenge (hex): ');
        const issuerKey = await rli.question('Enter the issuer key (hex): ');
        const issuerKeyBytes = new Uint8Array(32);
        if (issuerKey.length > 0) {
          const buffer = Buffer.from(issuerKey, 'hex');
          issuerKeyBytes.set(buffer.slice(0, 32));
        }
        await api.submitHealthProof(verifierContract, BigInt(`0x${challenge}`), issuerKeyBytes);
        break;
      }
      case '2':
        await api.displayVerifierState(providers, verifierContract);
        break;
      case '3':
        logger.info('Exiting...');
        return;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const buildWalletFromSeed = async (config: Config, rli: Interface): Promise<Wallet & Resource> => {
  const seed = await rli.question('Enter your wallet seed: ');
  return await api.buildWalletAndWaitForFunds(config, seed, '');
};

const WALLET_LOOP_QUESTION = `
You can do one of the following:
  1. Build a fresh wallet
  2. Build wallet from a seed
  3. Exit
Which would you like to do? `;

const buildWallet = async (config: Config, rli: Interface): Promise<(Wallet & Resource) | null> => {
  while (true) {
    const choice = await rli.question(WALLET_LOOP_QUESTION);
    switch (choice) {
      case '1':
        return await api.buildFreshWallet(config);
      case '2':
        return await buildWalletFromSeed(config, rli);
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

export const run = async (config: Config, _logger: Logger): Promise<void> => {
  logger = _logger;
  api.setLogger(_logger);
  const rli = createInterface({ input, output, terminal: true });

  const wallet = await buildWallet(config, rli);
  try {
    if (wallet !== null) {
      const providers = await api.configureProviders(wallet, config);
      await mainLoop(providers, rli);
    }
  } catch (e) {
    if (e instanceof Error) {
      logger.error(`Found error '${e.message}'`);
      logger.info('Exiting...');
      logger.debug(`${e.stack}`);
    } else {
      throw e;
    }
  } finally {
    try {
      rli.close();
      rli.removeAllListeners();
    } catch (e) {
      logger.error(`Error closing readline interface: ${e}`);
    } finally {
      if (wallet !== null) {
        await wallet.close();
      }
    }
  }
};
