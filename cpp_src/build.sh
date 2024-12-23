#!/bin/bash

# Build script for TapeInventoryManagement

# Check if vcpkg is installed
if [ -z "$VCPKG_ROOT" ]; then
    echo "Error: VCPKG_ROOT environment variable is not set or vcpkg is not installed"
    exit 1
fi

# Create build directory
buildDir="build"
if [ ! -d "$buildDir" ]; then
    mkdir -p "$buildDir"
fi

# Configure CMake
echo "Configuring CMake..."
cmake -B "$buildDir" -S . \
    -DCMAKE_TOOLCHAIN_FILE="$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake" \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_PREFIX="install"

# Build the project
echo "Building project..."
cmake --build "$buildDir" --config Release

# Create installation package
echo "Creating installation package..."
cmake --build "$buildDir" --target package --config Release

echo "Build completed successfully!" 