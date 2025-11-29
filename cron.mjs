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
  },
  // События Chronos для отслеживания
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "cronWallet", "type": "address" }
    ],
    "name": "CronCreated",
    "type": "event"
  }
];

// ABI целевого контракта (только tick), сериализуем в строку
const targetAbiJson = JSON.stringify([
  { name: 'tick', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] }
]);

console.log("🔗 Подключение к Helios...");
const provider  = new JsonRpcProvider(process.env.RPC_URL);
const password  = await readPassword("Пароль keystore: ");
const keystore  = await readFile('./keystore.json', 'utf8');
const wallet    = (await Wallet.fromEncryptedJson(keystore, password)).connect(provider);

console.log("👤 Адрес кошелька:", wallet.address);

const cron = new Contract(CRON_ADDRESS, cronAbi, wallet);

// параметры cron
const currentBlock = await provider.getBlockNumber();
console.log("📦 Текущий блок:", currentBlock);

const frequency    = 300;                    // раз в ~5 минут (300 блоков)
const expiration   = currentBlock + 201600;  // ~2 недели (при 15с/блок)
const gasLimit     = 300_000;
const gasPrice     = parseUnits("2", "gwei");
const deposit      = parseEther("0.02");     // пополнение на вызовы

console.log("\n⚙️  Параметры Cron Job:");
console.log("   Контракт:", process.env.CONTRACT_ADDRESS);
console.log("   Частота:", frequency, "блоков (~5 мин)");
console.log("   Истекает в блоке:", expiration);
console.log("   Gas Limit:", gasLimit);
console.log("   Gas Price:", parseFloat(parseUnits("2", "gwei")) / 1e9, "gwei");
console.log("   Депозит:", parseFloat(deposit) / 1e18, "HLS");

console.log("\n📤 Отправка транзакции createCron...");
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
  {
    gasLimit: BigInt(gasLimit) + 100_000n,
    gasPrice,
    value: deposit  // ВАЖНО: отправляем депозит вместе с транзакцией
  }
);

console.log("📨 TX Hash:", tx.hash);
console.log("⏳ Ожидание подтверждения...");

const receipt = await tx.wait();
console.log("✅ Транзакция подтверждена в блоке:", receipt.blockNumber);

// Попытка найти событие CronCreated для получения cron wallet address
console.log("\n🔍 Поиск события CronCreated...");
const cronCreatedEvent = receipt.logs
  .map(log => {
    try {
      return cron.interface.parseLog(log);
    } catch {
      return null;
    }
  })
  .find(event => event && event.name === 'CronCreated');

if (cronCreatedEvent) {
  console.log("✅ Cron Wallet Address:", cronCreatedEvent.args.cronWallet);
  console.log("\n⚠️  ВАЖНО: Если ваш контракт использует модификатор доступа,");
  console.log("   вызовите setCronWallet() с этим адресом:");
  console.log("   setCronWallet(\"" + cronCreatedEvent.args.cronWallet + "\")");
} else {
  console.log("⚠️  Событие CronCreated не найдено в логах.");
  console.log("   Проверьте транзакцию в эксплорере для получения cron wallet address.");
}

console.log("\n✅ Cron job успешно зарегистрирован!");
console.log("🔗 Посмотреть в эксплорере:", `${process.env.EXPLORER_URL || 'https://explorer.helioschain.network'}/tx/${tx.hash}`);
