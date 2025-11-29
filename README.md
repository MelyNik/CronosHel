# CronosHel - Helios Chronos Cron Jobs

Скрипты для работы с автоматическими периодическими вызовами смарт-контрактов через Helios Chronos.

## 🔍 Проблема и решение

### Что было не так?

При создании cron job через Helios Chronos precompile (`0x830`), система автоматически создаёт **уникальный "cron wallet address"** для каждого задания. Этот адрес **НЕ равен** адресу precompile!

**Ошибка**: Контракт проверял `msg.sender == 0x830`, но `msg.sender` при вызове = адрес cron wallet → вызов отклонялся.

### Решение

Используйте один из двух вариантов контрактов:

1. **CronCounterSimple.sol** (РЕКОМЕНДУЕТСЯ для начала) - функция `tick()` публична
2. **CronCounter.sol** - с защитой через `setCronWallet()` после создания cron job

## 📁 Файлы

- `CronCounterSimple.sol` - упрощённый контракт без ограничений доступа
- `CronCounter.sol` - контракт с защитой через cron wallet
- `cron.mjs` - скрипт для регистрации cron job (улучшенный)
- `setCronWallet.mjs` - скрипт для установки cron wallet в контракте

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install dotenv ethers
```

### 2. Настройка .env

Создайте файл `.env`:

```env
# RPC для Helios (mainnet или testnet)
RPC_URL=https://mainnet.helioschainlabs.org
# или testnet:
# RPC_URL=https://testnet1.helioschainlabs.org

# Адрес вашего развёрнутого контракта
CONTRACT_ADDRESS=0xYourContractAddressHere

# Опционально - URL эксплорера
EXPLORER_URL=https://explorer.helioschain.network
```

### 3. Вариант A: Простой контракт (РЕКОМЕНДУЕТСЯ)

#### Шаг 1: Деплой контракта на Remix

1. Откройте [Remix IDE](https://remix.ethereum.org/)
2. Создайте файл `CronCounterSimple.sol` и скопируйте код
3. Скомпилируйте (Solidity 0.8.20+)
4. Подключите MetaMask к Helios
5. Разверните контракт
6. **Скопируйте адрес контракта** в `.env`

#### Шаг 2: Создание Cron Job

```bash
node cron.mjs
```

**Готово!** Chronos будет вызывать `tick()` каждые ~5 минут.

### 4. Вариант B: Защищённый контракт

#### Шаг 1: Деплой CronCounter.sol

1. Разверните `CronCounter.sol` через Remix
2. Скопируйте адрес контракта в `.env`

#### Шаг 2: Создание Cron Job

```bash
node cron.mjs
```

Скрипт выведет **Cron Wallet Address** в конце.

#### Шаг 3: Установка Cron Wallet

```bash
node setCronWallet.mjs 0xCronWalletAddressFromPreviousStep
```

**Готово!** Теперь только этот cron wallet может вызывать `tick()`.

## 📊 Проверка работы

### Через Remix

1. Подключитесь к контракту в Remix (At Address)
2. Вызовите `getInfo()` - увидите:
   - `counter` - количество успешных вызовов
   - `lastCalled` - timestamp последнего вызова

### Через эксплорер

Откройте адрес вашего контракта в [Helios Explorer](https://explorer.helioschain.network/) и смотрите события `Ticked`.

## ⚙️ Параметры Cron Job

В `cron.mjs` можно настроить:

```javascript
const frequency    = 300;                    // частота в блоках (~5 мин при 15с/блок)
const expiration   = currentBlock + 201600;  // срок действия (~2 недели)
const gasLimit     = 300_000;                // лимит газа для tick()
const gasPrice     = parseUnits("2", "gwei"); // цена газа
const deposit      = parseEther("0.02");     // депозит для оплаты вызовов
```

### Расчёт депозита

Депозит расходуется на gas по формуле:
```
Расход = gasLimit × gasPrice × количество_вызовов
```

Пример:
- 300,000 gas × 2 gwei = 600,000 gwei = 0.0006 HLS за вызов
- 0.02 HLS ≈ 33 вызова
- При частоте 300 блоков (~5 мин) это ~2.7 часа работы

Увеличьте депозит для более длительной работы.

## 🔧 Важные замечания

### Почему не работает регистрация Chronos?

**Проблемы:**

1. **Модификатор доступа** - если используете `onlyOwnerOrCron`, но не установили cron wallet
2. **Недостаточный депозит** - cron job остановится, когда закончатся средства
3. **Неправильный gas limit** - если tick() требует больше газа, чем указано
4. **Истёк срок** - после `expirationBlock` cron job автоматически отключается

### Как получить Cron Wallet Address?

1. **Из скрипта** - `cron.mjs` автоматически выводит адрес после создания
2. **Из эксплорера** - найдите транзакцию createCron, посмотрите событие `CronCreated`
3. **Через Helios Hub** - посмотрите список ваших cron jobs

### Как отменить Cron Job?

Cron job автоматически отменяется, когда:
- Закончились средства на cron wallet
- Достигнут блок `expirationBlock`
- Произошла критическая ошибка выполнения

## 🔗 Полезные ссылки

- [Официальная документация Helios Chronos](https://hub.helioschain.network/docs/innovate/advanced-use-cases/autonomous-chronos-tasks)
- [Chronos Quest Tutorial](https://forum.helioschain.network/t/chronos-quest-tutorial-for-beginners/97)
- [Helios Explorer](https://explorer.helioschain.network/)
- [Helios Testnet Guide](https://helioschain.medium.com/how-to-join-the-helios-testnet-step-by-step-guide-for-early-access-250d024a1e1e)

## 📝 Changelog

### 30.11.2025

- ✅ Исправлена проблема с cron wallet address
- ✅ Добавлен упрощённый контракт `CronCounterSimple.sol`
- ✅ Улучшен скрипт `cron.mjs` - автоматический вывод cron wallet
- ✅ Добавлен скрипт `setCronWallet.mjs` для установки cron wallet
- ✅ Обновлена документация с объяснением проблемы
- ✅ Добавлена поддержка событий `CronCreated`

## 💡 Совет

Начните с **CronCounterSimple.sol** для тестирования. Когда всё заработает, переходите на **CronCounter.sol** с защитой доступа.

## 📧 Поддержка

- [Helios Forum](https://forum.helioschain.network/)
- [GitHub Issues](https://github.com/helios-network)
