import { type Resource } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface, type Interface } from 'node:readline/promises';
import { type Logger } from 'pino';
import { type VerifierProviders, type DeployedVerifierContract } from './common-types';
import { type Config } from './config';
import * as api from './api';
import { type VerifiableCredential } from '@midnight-ntwrk/zk-vcr-contract';
import * as fs from 'fs/promises';

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
        const ownerSk = Buffer.from(secret, 'hex');
        const verifierContract = await api.deploy(providers, ownerSk);

        const issuerKeyHex = await rli.question('Enter the issuer public key to add (hex): ');
        const issuerKey = new Uint8Array(Buffer.from(issuerKeyHex, 'hex'));
        await api.addIssuer(verifierContract, issuerKey);

        return verifierContract;
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
        const issuerKeyHex = await rli.question('Enter the issuer key (hex): ');
        const issuerKey = new Uint8Array(Buffer.from(issuerKeyHex, 'hex'));

        const credentialContent = await fs.readFile('./credential.json', 'utf-8');
        const credentialFromFile = JSON.parse(credentialContent);
        
        // We need to update the private state to include the credential for the witness
        const currentPrivateState = await providers.privateStateProvider.get('verifierPrivateState');
        if (currentPrivateState) {
            currentPrivateState.credential = {
                results: {
                    cholesterol: BigInt(credentialFromFile.results.cholesterol),
                    bloodPressure: BigInt(credentialFromFile.results.bloodPressure),
                    isSmoker: credentialFromFile.results.isSmoker,
                },
                signature: Buffer.from(credentialFromFile.signature, 'hex'),
            };
            await providers.privateStateProvider.set('verifierPrivateState', currentPrivateState);
        }

        await api.submitHealthProof(verifierContract, BigInt(`0x${challenge}`), issuerKey);
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