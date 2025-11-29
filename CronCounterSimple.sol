// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CronCounterSimple
 * @notice Упрощённый контракт-счётчик для Helios Chronos (без ограничений)
 * @dev Функция tick() публична - может вызываться кем угодно
 * Это РЕКОМЕНДУЕМЫЙ вариант для начала работы с Chronos
 */
contract CronCounterSimple {
    address public owner;

    uint256 public counter;
    uint256 public lastCalled;
    uint256 public totalCalls;

    event Ticked(address indexed caller, uint256 newCounter, uint256 timestamp);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Основная функция, вызываемая Chronos
     * @dev ПУБЛИЧНАЯ - может вызываться кем угодно (включая Chronos cron wallet)
     */
    function tick() external {
        unchecked {
            counter += 1;
            totalCalls += 1;
        }
        lastCalled = block.timestamp;
        emit Ticked(msg.sender, counter, lastCalled);
    }

    /**
     * @notice Сбросить счётчик (только owner)
     */
    function reset() external onlyOwner {
        counter = 0;
    }

    /**
     * @notice Получить информацию о контракте
     */
    function getInfo() external view returns (
        uint256 currentCounter,
        uint256 lastCalledTime,
        uint256 totalCallsCount
    ) {
        return (counter, lastCalled, totalCalls);
    }

    /**
     * @notice Передать владение контрактом
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
