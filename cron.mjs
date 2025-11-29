// cron.mjs
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { JsonRpcProvider, Wallet, parseUnits, parseEther, Contract } from 'ethers';
import { readPassword } from './read-password.mjs';

const CRON_ADDRESS = "0x0000000000000000000000000000000000000830"; // Helios Chronos precompile

// ABI для precompile.createCron(...)
const cronAbi = [
  {
    "inputs": [
      { "internalType": "address", "name": "contractAddress", "type": "address" },
      { "internalType": "string",  "name": "abi",             "type": "string"  },
      { "internalType": "string",  "name": "methodName",      "type": "string"  },
      { "internalType": "string[]","name": "params",          "type": "string[]" },
      { "internalType": "uint64",  "name": "frequency",       "type": "uint64"  },
      { "internalType": "uint64",  "name": "expirationBlock", "type": "uint64"  },
      { "internalType": "uint64",  "name": "gasLimit",        "type": "uint64"  },
      { "internalType": "uint256", "name": "maxGasPrice",     "type": "uint256" },
      { "internalType": "uint256", "name": "amountToDeposit", "type": "uint256" }
    ],
    "name": "createCron",
    "outputs": [{ "internalType": "bool", "name": "success", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// ABI целевого контракта (только tick), сериализуем в строку
const targetAbiJson = JSON.stringify([
  { name: 'tick', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] }
]);

const provider  = new JsonRpcProvider(process.env.RPC_URL);
const password  = await readPassword("Пароль keystore: ");
const keystore  = await readFile('./keystore.json', 'utf8');
const wallet    = (await Wallet.fromEncryptedJson(keystore, password)).connect(provider);

const cron = new Contract(CRON_ADDRESS, cronAbi, wallet);

// параметры cron
const currentBlock = await provider.getBlockNumber();
const frequency    = 300;                    // раз в ~5 минут (поменяешь по желанию)
const expiration   = currentBlock + 201600;  // ~2 недели (при 15с/блок)
const gasLimit     = 300_000;
const gasPrice     = parseUnits("2", "gwei");
const deposit      = parseEther("0.02");     // пополнение на вызовы

const tx = await cron.createCron(
  process.env.CONTRACT_ADDRESS,
  targetAbiJson,
  "tick",
  [],
  frequency,
  expiration,
  gasLimit,
  gasPrice,
  deposit,
  { gasLimit: gasLimit + 50_000, gasPrice }
);

console.log("📨 TX Hash:", tx.hash);
await tx.wait();
console.log("✅ Cron job registered!");
