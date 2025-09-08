import { type Resource } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface, type Interface } from 'node:readline/promises';
import { type Logger } from 'pino';
import { type VerifierProviders, type DeployedVerifierContract } from './common-types';
import { type Config } from './config';
import * as api from './api';
import * as fs from 'fs/promises';
import chalk from 'chalk';

let logger: Logger;

const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new verifier contract
  2. Join an existing verifier contract
  3. Back to main menu
Which would you like to do? `;

const join = async (providers: VerifierProviders, rli: Interface): Promise<DeployedVerifierContract | null> => {
  console.log(chalk.blue('\nThis is the public address of the smart contract that manages the list of trusted issuers and verifies proofs.'));
  const contractAddress = (await rli.question(chalk.cyan('> Enter the contract address (a 64-character hex string): '))).trim();
  logger.info('Joining contract...');
  try {
    const contract = await api.joinContract(providers, contractAddress);
    logger.info('Joined contract successfully.');
    return contract;
  } catch (error) {
    logger.error('Failed to join contract.');
    if (error instanceof Error) logger.error(error.message);
    return null;
  }
};

const deployOrJoin = async (
  providers: VerifierProviders,
  rli: Interface,
): Promise<[DeployedVerifierContract, Uint8Array] | null> => {
  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1': {
        console.log(chalk.blue('\nThis key gives you administrative control over the contract (e.g., adding trusted clinics).'));
        const secret = (await rli.question(chalk.cyan('> Enter the contract owner secret key (a 64-character hex string): '))).trim();
        const ownerSk = Buffer.from(secret, 'hex');
        logger.info('Deploying contract...');
        try {
          const verifierContract = await api.deploy(providers, ownerSk);
          logger.info('Contract deployed successfully.');
          return [verifierContract, ownerSk];
        } catch (error) {
          logger.error('Failed to deploy contract.');
          if (error instanceof Error) logger.error(error.message);
          return null;
        }
      }
      case '2': {
        const contract = await join(providers, rli);
        if (contract) {
          console.log(chalk.blue('\nTo manage this contract, you must provide its owner secret key.'));
          const secret = (await rli.question(chalk.cyan('> Enter the contract owner secret key (a 64-character hex string): '))).trim();
          const ownerSk = Buffer.from(secret, 'hex');
          return [contract, ownerSk];
        }
        return null;
      }
      case '3':
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const userFlow = async (providers: VerifierProviders, rli: Interface): Promise<void> => {
  console.log(chalk.bold.cyan('\n--- Health Credential Verification Wizard ---'));
  console.log(chalk.yellow('This flow allows a user to submit a proof of their health status without revealing their private data.'));

  try {
    console.log(chalk.blue('\nThis is the public address of the smart contract that manages the list of trusted issuers and verifies proofs.'));
    const contractAddress = (await rli.question(chalk.cyan('> Enter the Verifier Contract Address (a 64-character hex string): '))).trim();
    const verifierContract = await api.joinContract(providers, contractAddress);
    if (!verifierContract) return;

    console.log(chalk.blue('\nThis is the digitally signed file you received from a trusted clinic.'));
    const credentialPath = (await rli.question(chalk.cyan('> Enter the path to your credential.json file: '))).trim();
    logger.info('Reading credential file...');
    const credentialContent = await fs.readFile(credentialPath, 'utf-8');
    const credentialFromFile = JSON.parse(credentialContent);
    logger.info('Credential file read successfully.');

    const challenge = await api.getChallenge(verifierContract);
    console.log(chalk.yellow(`
Your unique, single-use challenge nonce is: ${challenge.toString(16)}`));
    console.log(chalk.blue('The CLI will now use this nonce to generate and submit your proof.'));

    console.log(chalk.blue('\nThis is the public key of the clinic that issued your credential. It must be on the contract\'s trusted list.'));
    const issuerKeyHex = (await rli.question(chalk.cyan('> Enter the issuer public key (a 64-character hex string): '))).trim();
    const issuerKey = new Uint8Array(Buffer.from(issuerKeyHex, 'hex'));

    logger.info('Preparing to generate proof...');
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
      logger.info('Private state updated for proof generation.');
    } else {
      logger.error('Could not find private state to update.');
      return;
    }

    logger.info('Generating and submitting your anonymous proof... (This may take a moment)');
    await api.submitHealthProof(verifierContract, challenge, issuerKey);
    logger.info(chalk.green.bold('Verification Successful! Your health proof has been submitted.'));

    logger.info('Fetching updated contract state...');
    const { state } = await api.displayVerifierState(providers, verifierContract);
    if (state) {
      logger.info('Updated contract state:');
      console.log(state);
    } else {
      logger.warn('Could not fetch updated contract state.');
    }
  } catch (error) {
    logger.error('An error occurred during the verification process.');
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error(String(error));
    }
  }
};

const ADMIN_MAIN_LOOP_QUESTION = `
You can do one of the following:
  1. Add an issuer
  2. Revoke an issuer
  3. Display current verifier state
  4. Back to main menu
Which would you like to do? `;

const adminFlow = async (providers: VerifierProviders, rli: Interface): Promise<void> => {
  console.log(chalk.bold.cyan('\n--- Administrator Panel ---'));
  console.log(chalk.yellow('This flow is for the DApp owner to manage the smart contract.'));

  const deployResult = await deployOrJoin(providers, rli);
  if (deployResult === null) {
    return;
  }
  const [verifierContract, ownerSk] = deployResult;

  while (true) {
    const choice = await rli.question(ADMIN_MAIN_LOOP_QUESTION);
    switch (choice) {
      case '1': {
        console.log(chalk.blue('\nThis is the public key of a clinic you want to add to the trusted list.'));
        const issuerKeyHex = (await rli.question(chalk.cyan('> Enter the issuer public key to add (a 64-character hex string): '))).trim();
        const issuerKey = new Uint8Array(Buffer.from(issuerKeyHex, 'hex'));
        logger.info('Adding issuer...');
        try {
          await api.addIssuer(providers, verifierContract, ownerSk, issuerKey);
          logger.info('Issuer added successfully.');
        } catch (e) {
          logger.error('Failed to add issuer.');
          if (e instanceof Error) logger.error(e.message);
        }
        break;
      }
      case '2': {
        console.log(chalk.blue('\nThis is the public key of a clinic you want to remove from the trusted list.'));
        const issuerKeyHex = (await rli.question(chalk.cyan('> Enter the issuer public key to revoke (a 64-character hex string): '))).trim();
        const issuerKey = new Uint8Array(Buffer.from(issuerKeyHex, 'hex'));
        logger.info('Revoking issuer...');
        try {
          await api.revokeIssuer(providers, verifierContract, ownerSk, issuerKey);
          logger.info('Issuer revoked successfully.');
        } catch (e) {
          logger.error('Failed to revoke issuer.');
          if (e instanceof Error) logger.error(e.message);
        }
        break;
      }

      case '3':
        await api.displayVerifierState(providers, verifierContract);
        break;
      case '4':
        return;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const USER_OR_ADMIN_QUESTION = `
${chalk.bold.cyan('--- ZK-VCR Main Menu ---')}
There are two roles in this system. Please choose yours:
  1. A user wanting to verify their health credential
  2. A DApp administrator
  3. Exit
Please enter your choice: `;

const mainLoop = async (providers: VerifierProviders, rli: Interface): Promise<boolean> => {
  const choice = await rli.question(USER_OR_ADMIN_QUESTION);
  switch (choice) {
    case '1':
      await userFlow(providers, rli);
      break;
    case '2':
      await adminFlow(providers, rli);
      break;
    case '3':
      logger.info('Exiting...');
      return false;
    default:
      logger.error(`Invalid choice: ${choice}`);
  }
  return true;
};

const buildWalletFromSeed = async (config: Config, rli: Interface): Promise<Wallet & Resource | null> => {
  console.log(chalk.blue('\nThis is your private key for interacting with the network. Keep it secret.'));
  const seed = (await rli.question(chalk.cyan('> Enter your wallet seed (a 64-character hex string): '))).trim();
  logger.info('Building wallet from seed...');
  try {
    const wallet = await api.buildWalletAndWaitForFunds(config, seed, '');
    logger.info('Wallet built successfully.');
    return wallet;
  } catch (error) {
    logger.error('Failed to build wallet from seed.');
    if (error instanceof Error) logger.error(error.message);
    return null;
  }
};

const WALLET_LOOP_QUESTION = `
${chalk.bold.cyan('--- Wallet Setup ---')}
You can do one of the following:
  1. Build a fresh wallet (generates a new random seed)
  2. Build wallet from a seed (restores an existing wallet)
  3. Exit
Which would you like to do? `;

const buildWallet = async (config: Config, rli: Interface): Promise<(Wallet & Resource) | null> => {
  while (true) {
    const choice = await rli.question(WALLET_LOOP_QUESTION);
    switch (choice) {
      case '1': {
        logger.info('Building fresh wallet...');
        try {
          const wallet = await api.buildFreshWallet(config);
          logger.info('Fresh wallet built successfully.');
          return wallet;
        } catch (error) {
          logger.error('Failed to build fresh wallet.');
          if (error instanceof Error) logger.error(error.message);
          return null;
        }
      }
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

  let wallet: (Wallet & Resource) | null = null;
  let rli: Interface | null = null;

  try {
    rli = createInterface({ input, output, terminal: true });
    wallet = await buildWallet(config, rli);
    rli.close();
    rli.removeAllListeners();

    if (wallet) {
      const providers = await api.configureProviders(wallet, config);
      let shouldContinue = true;
      while (shouldContinue) {
        rli = createInterface({ input, output, terminal: true });
        try {
          shouldContinue = await mainLoop(providers, rli);
        } catch (e) {
          if (e instanceof Error) {
            logger.error(e.message);
          } else {
            logger.error('An unexpected error occurred.');
          }
        } finally {
          rli.close();
          rli.removeAllListeners();
        }
      }
    }
  } catch (e) {
    if (e instanceof Error) {
      logger.error(`An error occurred: ${e.message}`);
    } else {
      logger.error('An unknown error occurred.');
    }
  } finally {
    if (rli) {
      rli.close();
      rli.removeAllListeners();
    }
    if (wallet) {
      await wallet.close();
    }
  }
};
