# Build script for TapeInventoryManagement

# Import Visual Studio environment variables
$vsPath = &"${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" -latest -property installationPath
if (-not $vsPath) {
    Write-Error "Visual Studio not found. Please install Visual Studio 2019 or later with C++ development tools."
    exit 1
}
$vcvarsPath = Join-Path $vsPath "VC\Auxiliary\Build\vcvars64.bat"
if (-not (Test-Path $vcvarsPath)) {
    Write-Error "Visual Studio C++ tools not found. Please install the C++ development workload."
    exit 1
}

# Clean and recreate build directory
$buildDir = "build"
if (Test-Path $buildDir) {
    Write-Host "Cleaning build directory..."
    Remove-Item -Path $buildDir -Recurse -Force
}
New-Item -ItemType Directory -Path $buildDir

# Configure CMake
Write-Host "Configuring CMake..."
cmd.exe /c "call `"$vcvarsPath`" && cmake -B $buildDir -S . -G `"Visual Studio 16 2019`" -A x64 -DCMAKE_BUILD_TYPE=Release"

# Build the project
Write-Host "Building project..."
cmd.exe /c "call `"$vcvarsPath`" && cmake --build $buildDir --config Release"

# Create installation package
Write-Host "Creating installation package..."
cmd.exe /c "call `"$vcvarsPath`" && cmake --build $buildDir --target package --config Release"

Write-Host "Build completed successfully!" 