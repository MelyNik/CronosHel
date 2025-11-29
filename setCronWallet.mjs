// setCronWallet.mjs
// Скрипт для установки cron wallet address в контракте
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import { readPassword } from './read-password.mjs';

// ABI контракта с функцией setCronWallet
const contractAbi = [
  {
    "inputs": [{ "internalType": "address", "name": "_cronWallet", "type": "address" }],
    "name": "setCronWallet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": true, "internalType": "address", "name": "cronWallet", "type": "address" }],
    "name": "CronWalletSet",
    "type": "event"
  }
];

// Проверка аргументов
if (process.argv.length < 3) {
  console.error("❌ Использование: node setCronWallet.mjs <CRON_WALLET_ADDRESS>");
  console.error("   Пример: node setCronWallet.mjs 0x1234567890123456789012345678901234567890");
  process.exit(1);
}

const cronWalletAddress = process.argv[2];

// Валидация адреса
if (!/^0x[a-fA-F0-9]{40}$/.test(cronWalletAddress)) {
  console.error("❌ Неверный формат адреса. Адрес должен начинаться с 0x и содержать 40 hex символов.");
  process.exit(1);
}

console.log("🔗 Подключение к Helios...");
const provider = new JsonRpcProvider(process.env.RPC_URL);
const password = await readPassword("Пароль keystore: ");
const keystore = await readFile('./keystore.json', 'utf8');
const wallet = (await Wallet.fromEncryptedJson(keystore, password)).connect(provider);

console.log("👤 Адрес кошелька:", wallet.address);
console.log("📄 Адрес контракта:", process.env.CONTRACT_ADDRESS);
console.log("🤖 Cron Wallet:", cronWalletAddress);

const contract = new Contract(process.env.CONTRACT_ADDRESS, contractAbi, wallet);

console.log("\n📤 Отправка транзакции setCronWallet...");
const tx = await contract.setCronWallet(cronWalletAddress);

console.log("📨 TX Hash:", tx.hash);
console.log("⏳ Ожидание подтверждения...");

const receipt = await tx.wait();
console.log("✅ Транзакция подтверждена в блоке:", receipt.blockNumber);

console.log("\n✅ Cron Wallet успешно установлен!");
console.log("   Теперь Chronos может вызывать функцию tick() вашего контракта.");
