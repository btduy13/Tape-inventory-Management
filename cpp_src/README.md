# Tape Inventory Management System

A comprehensive system for managing tape inventory, orders, and reports.

## Features

- Order management for different types of tapes (Băng Keo In, Trục In, Băng Keo)
- Statistical analysis and visualization
- Report generation in multiple formats (PDF, Excel, HTML)
- Excel import/export functionality
- Dark mode support
- Multi-language support

## Prerequisites

- CMake 3.15 or higher
- C++17 compatible compiler
- vcpkg package manager
- Qt 6.5.3
- PostgreSQL 13 or higher

## Dependencies

The following libraries are required and will be installed automatically through vcpkg:
- Qt6 (Core, Gui, Widgets, Charts)
- libpqxx (PostgreSQL C++ client library)
- spdlog (Logging library)
- fmt (String formatting library)
- xlnt (Excel file handling)
- Catch2 (Testing framework)

## Building from Source

### Windows

1. Install vcpkg and set the VCPKG_ROOT environment variable:
   ```powershell
   git clone https://github.com/Microsoft/vcpkg.git
   .\vcpkg\bootstrap-vcpkg.bat
   setx VCPKG_ROOT "C:\path\to\vcpkg"
   ```

2. Build the project:
   ```powershell
   .\build.ps1
   ```

### Linux/macOS

1. Install vcpkg and set the VCPKG_ROOT environment variable:
   ```bash
   git clone https://github.com/Microsoft/vcpkg.git
   ./vcpkg/bootstrap-vcpkg.sh
   export VCPKG_ROOT=/path/to/vcpkg
   ```

2. Build the project:
   ```bash
   chmod +x build.sh
   ./build.sh
   ```

## Installation

After building, you can find the installation package in the `build` directory:
- Windows: `TapeInventoryManagement-1.0.0-win64.exe`
- Linux: `TapeInventoryManagement-1.0.0-Linux.deb`
- macOS: `TapeInventoryManagement-1.0.0-Darwin.dmg`

## Configuration

The application settings are stored in:
- Windows: `%APPDATA%\TapeInventory\TapeInventoryManagement.ini`
- Linux: `~/.config/TapeInventory/TapeInventoryManagement.ini`
- macOS: `~/Library/Preferences/TapeInventory/TapeInventoryManagement.ini`

## Database Setup

1. Create a PostgreSQL database:
   ```sql
   CREATE DATABASE tape_inventory;
   ```

2. Configure the database connection in the application settings or through environment variables:
   - `TAPE_INVENTORY_DB_HOST`: Database host (default: localhost)
   - `TAPE_INVENTORY_DB_PORT`: Database port (default: 5432)
   - `TAPE_INVENTORY_DB_NAME`: Database name (default: tape_inventory)
   - `TAPE_INVENTORY_DB_USER`: Database user
   - `TAPE_INVENTORY_DB_PASSWORD`: Database password

## Usage

1. Launch the application
2. Configure the database connection if not already set
3. Use the tabs to manage different types of orders:
   - Thống Kê: View statistics and charts
   - Băng Keo In: Manage printed tape orders
   - Băng Keo: Manage regular tape orders
   - Trục In: Manage printing roller orders
   - History: View all orders in one place

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 