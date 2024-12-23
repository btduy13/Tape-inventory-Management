#pragma once

#include <string>
#include <memory>
#include <spdlog/spdlog.h>

namespace TapeInventory {
namespace Services {

class LoggingService {
public:
    static void initialize();
    static void shutdown();
    
    static void debug(const std::string& message);
    static void info(const std::string& message);
    static void warning(const std::string& message);
    static void error(const std::string& message);
    static void critical(const std::string& message);
    
    template<typename... Args>
    static void debug(fmt::format_string<Args...> fmt, Args&&... args) {
        logger_->debug(fmt, std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void info(fmt::format_string<Args...> fmt, Args&&... args) {
        logger_->info(fmt, std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void warning(fmt::format_string<Args...> fmt, Args&&... args) {
        logger_->warn(fmt, std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void error(fmt::format_string<Args...> fmt, Args&&... args) {
        logger_->error(fmt, std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void critical(fmt::format_string<Args...> fmt, Args&&... args) {
        logger_->critical(fmt, std::forward<Args>(args)...);
    }

private:
    static std::shared_ptr<spdlog::logger> logger_;
    static void setupFileLogger();
    static void setupConsoleLogger();
};

} // namespace Services
} // namespace TapeInventory 