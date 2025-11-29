// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CronCounter
 * @notice Контракт-счётчик для Helios Chronos
 * @dev Chronos создаёт уникальный cron wallet address при регистрации задания
 */
contract CronCounter {
    address public owner;
    address public cronWallet; // уникальный адрес cron wallet (НЕ precompile!)

    uint256 public counter;
    uint256 public lastCalled;

    event Ticked(address indexed caller, uint256 newCounter, uint256 timestamp);
    event CronWalletSet(address indexed cronWallet);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOwnerOrCron() {
        require(
            msg.sender == owner ||
            (cronWallet != address(0) && msg.sender == cronWallet),
            "Not authorized"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Устанавливает адрес cron wallet
     * @dev Вызывается ПОСЛЕ создания cron job через precompile
     * @param _cronWallet Адрес cron wallet (получить из событий или эксплорера)
     */
    function setCronWallet(address _cronWallet) external onlyOwner {
        require(_cronWallet != address(0), "Invalid address");
        cronWallet = _cronWallet;
        emit CronWalletSet(_cronWallet);
    }

    /**
     * @notice Основная функция, вызываемая Chronos
     * @dev Может вызываться owner или cron wallet
     */
    function tick() external onlyOwnerOrCron {
        unchecked { counter += 1; }
        lastCalled = block.timestamp;
        emit Ticked(msg.sender, counter, lastCalled);
    }

    /**
     * @notice Получить информацию о контракте
     * @return counter Текущее значение счётчика
     * @return lastCalled Timestamp последнего вызова
     */
    function getInfo() external view returns (uint256, uint256) {
        return (counter, lastCalled);
    }

    /**
     * @notice Передать владение контрактом
     * @param newOwner Адрес нового владельца
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
