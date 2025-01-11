#pragma once

#include <string>
#include <variant>
#include <optional>
#include <QSettings>

namespace TapeInventory {
namespace Services {

class ConfigService {
public:
    static void initialize();
    static void shutdown();
    
    // Database settings
    static std::string getDatabaseHost();
    static int getDatabasePort();
    static std::string getDatabaseName();
    static std::string getDatabaseUser();
    static std::string getDatabasePassword();
    
    // UI settings
    static bool getDarkMode();
    static void setDarkMode(bool enabled);
    static int getDefaultPageSize();
    static void setDefaultPageSize(int size);
    static std::string getLanguage();
    static void setLanguage(const std::string& lang);
    
    // Report settings
    static std::string getDefaultReportFormat();
    static void setDefaultReportFormat(const std::string& format);
    static std::string getDefaultReportPath();
    static void setDefaultReportPath(const std::string& path);
    
    // Excel settings
    static std::string getDefaultExcelTemplatePath();
    static void setDefaultExcelTemplatePath(const std::string& path);
    static std::string getDefaultExcelImportPath();
    static void setDefaultExcelImportPath(const std::string& path);
    
    // General settings
    template<typename T>
    static std::optional<T> getValue(const std::string& key);
    
    template<typename T>
    static void setValue(const std::string& key, const T& value);
    
    static void sync();

private:
    static std::unique_ptr<QSettings> settings_;
    static void loadDefaults();
    static void migrateSettings();
};

} // namespace Services
} // namespace TapeInventory 