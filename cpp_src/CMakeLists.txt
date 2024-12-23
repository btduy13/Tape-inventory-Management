cmake_minimum_required(VERSION 3.16)
project(TapeInventoryManagement VERSION 1.0.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Enable Qt MOC, RCC, and UIC
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

# Set output directories
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

# Add Qt installation path - adjust this path based on your Qt installation
list(APPEND CMAKE_PREFIX_PATH "C:/Qt/6.5.3/msvc2019_64")

# Find Qt packages
find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets Charts)

# Add source files
file(GLOB_RECURSE SOURCES 
    "src/*.cpp"
    "src/ui/*.cpp"
    "src/ui/tabs/*.cpp"
    "src/ui/dialogs/*.cpp"
    "src/services/*.cpp"
    "src/repositories/*.cpp"
)

# Add header files
file(GLOB_RECURSE HEADERS 
    "include/*.hpp"
    "include/ui/*.hpp"
    "include/ui/tabs/*.hpp"
    "include/ui/dialogs/*.hpp"
    "include/services/*.hpp"
    "include/repositories/*.hpp"
)

# Create executable
add_executable(${PROJECT_NAME} ${SOURCES} ${HEADERS})

# Link Qt libraries
target_link_libraries(${PROJECT_NAME} PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Widgets
    Qt6::Charts
)

# Include directories
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Install rules
install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
)

# Package configuration
include(CPack)
set(CPACK_PACKAGE_NAME ${PROJECT_NAME})
set(CPACK_PACKAGE_VERSION ${PROJECT_VERSION})
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "Tape Inventory Management System")
set(CPACK_PACKAGE_VENDOR "Your Company")
set(CPACK_PACKAGE_INSTALL_DIRECTORY ${PROJECT_NAME})
set(CPACK_RESOURCE_FILE_LICENSE "${CMAKE_CURRENT_SOURCE_DIR}/LICENSE")
set(CPACK_PACKAGE_EXECUTABLES "${PROJECT_NAME}" "${PROJECT_NAME}")

# Set Windows-specific settings
if(WIN32)
    set(CMAKE_WIN32_EXECUTABLE ON)
    set(CPACK_GENERATOR "NSIS")
    set(CPACK_NSIS_ENABLE_UNINSTALL_BEFORE_INSTALL ON)
    set(CPACK_NSIS_MODIFY_PATH ON)
    set(CPACK_NSIS_DISPLAY_NAME ${PROJECT_NAME})
    set(CPACK_NSIS_PACKAGE_NAME ${PROJECT_NAME})
endif() 