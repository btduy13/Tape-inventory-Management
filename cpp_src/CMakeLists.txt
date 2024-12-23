cmake_minimum_required(VERSION 3.15)
project(TapeInventoryManagement VERSION 1.0.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add Qt installation path (modify this path according to your Qt installation)
set(CMAKE_PREFIX_PATH "C:/Qt/6.5.3/msvc2019_64")

# Find required packages
find_package(Qt6 REQUIRED COMPONENTS Core Widgets Gui)

# PostgreSQL settings (modify these paths according to your PostgreSQL installation)
set(PostgreSQL_ROOT "C:/Program Files/PostgreSQL/16")
set(PostgreSQL_INCLUDE_DIRS "${PostgreSQL_ROOT}/include")
set(PostgreSQL_LIBRARY_DIRS "${PostgreSQL_ROOT}/lib")
set(PostgreSQL_LIBRARIES "${PostgreSQL_ROOT}/lib/libpq.lib")

# Include directories
include_directories(${CMAKE_SOURCE_DIR}/include)
include_directories(${PostgreSQL_INCLUDE_DIRS})
link_directories(${PostgreSQL_LIBRARY_DIRS})

# Add source files
set(SOURCES
    src/main.cpp
    src/MainWindow.cpp
    src/database/Database.cpp
    src/ui/OrderForm.cpp
)

# Add header files
set(HEADERS
    include/MainWindow.hpp
    include/database/Database.hpp
    include/ui/OrderForm.hpp
)

# Qt MOC (Meta-Object Compiler)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

# Create executable
add_executable(${PROJECT_NAME} ${SOURCES} ${HEADERS})

# Link libraries
target_link_libraries(${PROJECT_NAME} PRIVATE
    Qt6::Core
    Qt6::Widgets
    Qt6::Gui
    ${PostgreSQL_LIBRARIES}
)

# Install targets
install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION bin
) 