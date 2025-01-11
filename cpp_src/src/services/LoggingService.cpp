#include "services/LoggingService.hpp"
#include <spdlog/sinks/rotating_file_sink.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <spdlog/async.h>
#include <filesystem>
#include <QStandardPaths>
#include <QString>

namespace TapeInventory {
namespace Services {

std::shared_ptr<spdlog::logger> LoggingService::logger_;

void LoggingService::initialize() {
    try {
        // Initialize async logging
        spdlog::init_thread_pool(8192, 1);
        
        // Set up both file and console loggers
        setupFileLogger();
        setupConsoleLogger();
        
        // Set global logging pattern
        spdlog::set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [thread %t] %v");
        
        // Set global logging level
#ifdef NDEBUG
        spdlog::set_level(spdlog::level::info);
#else
        spdlog::set_level(spdlog::level::debug);
#endif
        
        info("Logging system initialized");
    } catch (const spdlog::spdlog_ex& ex) {
        std::cerr << "Log initialization failed: " << ex.what() << std::endl;
        throw;
    }
}

void LoggingService::shutdown() {
    if (logger_) {
        info("Shutting down logging system");
        spdlog::shutdown();
    }
}

void LoggingService::setupFileLogger() {
    // Get the application data directory
    QString appDataPath = QStandardPaths::writableLocation(
        QStandardPaths::AppDataLocation);
    std::filesystem::path logDir = appDataPath.toStdString() / "logs";
    
    // Create the log directory if it doesn't exist
    std::filesystem::create_directories(logDir);
    
    // Create a rotating file sink
    auto file_sink = std::make_shared<spdlog::sinks::rotating_file_sink_mt>(
        (logDir / "tape_inventory.log").string(),
        1024 * 1024 * 5, // 5MB max file size
        3                // Keep 3 rotated files
    );
    
    // Create the logger with both sinks
    logger_ = std::make_shared<spdlog::async_logger>("main_logger",
        file_sink,
        spdlog::thread_pool(),
        spdlog::async_overflow_policy::block);
    
    // Register the logger
    spdlog::register_logger(logger_);
}

void LoggingService::setupConsoleLogger() {
    // Add console sink to the logger
    auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
    logger_->sinks().push_back(console_sink);
}

void LoggingService::debug(const std::string& message) {
    logger_->debug(message);
}

void LoggingService::info(const std::string& message) {
    logger_->info(message);
}

void LoggingService::warning(const std::string& message) {
    logger_->warn(message);
}

void LoggingService::error(const std::string& message) {
    logger_->error(message);
}

void LoggingService::critical(const std::string& message) {
    logger_->critical(message);
}

} // namespace Services
} // namespace TapeInventory 