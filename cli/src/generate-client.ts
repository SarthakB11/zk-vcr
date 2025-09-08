import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import ora from 'ora';
import chalk from 'chalk';
import ProgressBar from 'progress';

const execAsync = promisify(exec);

const art = `
          ⬜⬜⬜
     ⬜               ⬜
     🟥🟥🟥🟥🟥🟥🟥
     🟥🟥🟥⬜🟥🟥🟥
     🟥🟥⬜⬜⬜🟥🟥
     🟥🟥🟥⬜🟥🟥🟥
     🟥🟥🟥🟥🟥🟥🟥🇨🇭🇨🇭🇨🇭💊💊🚑💊
`;

const blankLines = '\n\n\n\n\n\n\n\n'; // Match the height of the art to prevent jumping

const frames = [art, blankLines];

async function showStartupAnimation() {
    let i = 0;
    const interval = setInterval(() => {
        process.stdout.write('\x1B[2J\x1B[0;0H'); // Clear the console
        const frameContent = frames[i % frames.length];
        process.stdout.write(chalk.white(frameContent));
        // Only show the panel text when the art is visible
        if (frameContent === art) {
            process.stdout.write(chalk.bold.cyan('\n       HealthProof Clinic Panel'));
        }
        i++;
    }, 500); // Blink speed: 500ms

    await new Promise(resolve => setTimeout(resolve, 3000)); // Animate for 3 seconds
    clearInterval(interval);
    process.stdout.write('\x1B[2J\x1B[0;0H'); // Clear console one last time
    console.log(chalk.white(art)); // Show the final, static art
    console.log(chalk.bold.cyan('\n       HealthProof Clinic Panel'));
    console.log(chalk.green.bold('\nZK-VCR Secure Credential Generator'));
}

// --- Type Definitions ---
interface LabResults {
    cholesterol: bigint;
    bloodPressure: bigint;
    isSmoker: boolean;
}

// --- Main Tool Logic ---
async function main() {
    await showStartupAnimation();

    console.log(chalk.yellow('\nThis tool is for authorized clinic personnel only.'));
    console.log(chalk.yellow("A patient's real-world health check-up has been completed."));
    console.log(chalk.yellow('You will now enter their results to generate a secure, signed Verifiable Credential.\n'));

    const rli = createInterface({ input, output });

    try {
        // 1. Get Inputs Interactively
        const ownerSkHex = await rli.question(chalk.cyan('> Enter the Clinic\'s Private Signing Key (hex): '));
        const ownerSk = Buffer.from(ownerSkHex, 'hex');
        if (ownerSk.length !== 32) {
            throw new Error('Secret key must be 32 bytes (64 hex characters).');
        }

        const cholesterolStr = await rli.question(chalk.cyan('> Enter the Patient\'s Cholesterol Level: '));
        const bloodPressureStr = await rli.question(chalk.cyan('> Enter the Patient\'s Blood Pressure: '));
        const isSmokerStr = await rli.question(chalk.cyan('> Is the Patient a smoker? (true/false): '));
        const outputFilename = await rli.question(chalk.cyan('> Enter the output filename (e.g., patient_credential.json): '));

        const labResults: LabResults = {
            cholesterol: BigInt(cholesterolStr),
            bloodPressure: BigInt(bloodPressureStr),
            isSmoker: isSmokerStr.toLowerCase() === 'true',
        };

        // 2. Generate Signature with Progress Bar
        console.log(''); // Newline for formatting
        const bar = new ProgressBar(chalk.yellow('Generating Signature [:bar] :percent :etas'), {
            complete: '█',
            incomplete: '░',
            width: 40,
            total: 100,
        });

        const hashPromise = execAsync(
            `node src/hash-vc.mjs ${ownerSkHex} ${labResults.cholesterol} ${labResults.bloodPressure} ${labResults.isSmoker}`
        );

        // Simulate progress for a more realistic feel
        await new Promise<void>(resolve => {
            const timer = setInterval(() => {
                bar.tick(1); // Tick 1%
                if (bar.complete) {
                    clearInterval(timer);
                    resolve();
                }
            }, 50); // every 50ms. Total time = 100 * 50ms = 5000ms = 5 seconds
        });

        const { stdout } = await hashPromise;
        
        const { publicKey, signature } = JSON.parse(stdout);

        // 3. Create and Save Verifiable Credential
        const credential = {
            results: labResults,
            signature: signature,
        };

        await fs.writeFile(outputFilename, JSON.stringify(credential, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2));

        // 4. Display Final Instructions
        console.log(chalk.green.bold(`\n\nSUCCESS: The credential file "${outputFilename}" has been created.`));
        console.log(chalk.yellow('Securely transfer this file to the patient.\n'));
        console.log(chalk.red.bold('------------------------------------------------------------------'));
        console.log(chalk.red.bold('IMPORTANT: Provide the following Public Key to the DApp Administrator (e.g., the insurance company).'));
        console.log(chalk.red.bold("They MUST add this key to the on-chain trusted registry for the patient's credential to be valid.\n"));
        console.log(chalk.white.bold('Issuer Public Key:'));
        console.log(chalk.cyan.bold(publicKey));
        console.log(chalk.red.bold('------------------------------------------------------------------'));

    } catch (error) {
        console.error(chalk.red(`\nError: ${(error as Error).message}`));
    } finally {
        rli.close();
    }
}

main();