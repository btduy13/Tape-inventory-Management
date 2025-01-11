#include "services/ConfigService.hpp"
#include "services/LoggingService.hpp"
#include <QStandardPaths>
#include <QString>
#include <filesystem>

namespace TapeInventory {
namespace Services {

std::unique_ptr<QSettings> ConfigService::settings_;

void ConfigService::initialize() {
    settings_ = std::make_unique<QSettings>("TapeInventory", "TapeInventoryManagement");
    loadDefaults();
    migrateSettings();
    LoggingService::info("Configuration system initialized");
}

void ConfigService::shutdown() {
    if (settings_) {
        sync();
        settings_.reset();
        LoggingService::info("Configuration system shut down");
    }
}

void ConfigService::loadDefaults() {
    if (!settings_->contains("database/host")) {
        settings_->setValue("database/host", "localhost");
    }
    if (!settings_->contains("database/port")) {
        settings_->setValue("database/port", 5432);
    }
    if (!settings_->contains("database/name")) {
        settings_->setValue("database/name", "tape_inventory");
    }
    if (!settings_->contains("database/user")) {
        settings_->setValue("database/user", "postgres");
    }
    
    if (!settings_->contains("ui/darkMode")) {
        settings_->setValue("ui/darkMode", false);
    }
    if (!settings_->contains("ui/defaultPageSize")) {
        settings_->setValue("ui/defaultPageSize", 50);
    }
    if (!settings_->contains("ui/language")) {
        settings_->setValue("ui/language", "en");
    }
    
    if (!settings_->contains("report/defaultFormat")) {
        settings_->setValue("report/defaultFormat", "pdf");
    }
    if (!settings_->contains("report/defaultPath")) {
        QString documentsPath = QStandardPaths::writableLocation(
            QStandardPaths::DocumentsLocation);
        settings_->setValue("report/defaultPath",
            (std::filesystem::path(documentsPath.toStdString()) / "Reports").string());
    }
    
    if (!settings_->contains("excel/defaultTemplatePath")) {
        QString documentsPath = QStandardPaths::writableLocation(
            QStandardPaths::DocumentsLocation);
        settings_->setValue("excel/defaultTemplatePath",
            (std::filesystem::path(documentsPath.toStdString()) / "Templates").string());
    }
    if (!settings_->contains("excel/defaultImportPath")) {
        QString documentsPath = QStandardPaths::writableLocation(
            QStandardPaths::DocumentsLocation);
        settings_->setValue("excel/defaultImportPath",
            (std::filesystem::path(documentsPath.toStdString()) / "Import").string());
    }
}

void ConfigService::migrateSettings() {
    // Version-based settings migration can be implemented here
    // For now, we just ensure the settings version is set
    if (!settings_->contains("version")) {
        settings_->setValue("version", "1.0.0");
    }
}

std::string ConfigService::getDatabaseHost() {
    return settings_->value("database/host").toString().toStdString();
}

int ConfigService::getDatabasePort() {
    return settings_->value("database/port").toInt();
}

std::string ConfigService::getDatabaseName() {
    return settings_->value("database/name").toString().toStdString();
}

std::string ConfigService::getDatabaseUser() {
    return settings_->value("database/user").toString().toStdString();
}

std::string ConfigService::getDatabasePassword() {
    return settings_->value("database/password").toString().toStdString();
}

bool ConfigService::getDarkMode() {
    return settings_->value("ui/darkMode").toBool();
}

void ConfigService::setDarkMode(bool enabled) {
    settings_->setValue("ui/darkMode", enabled);
}

int ConfigService::getDefaultPageSize() {
    return settings_->value("ui/defaultPageSize").toInt();
}

void ConfigService::setDefaultPageSize(int size) {
    settings_->setValue("ui/defaultPageSize", size);
}

std::string ConfigService::getLanguage() {
    return settings_->value("ui/language").toString().toStdString();
}

void ConfigService::setLanguage(const std::string& lang) {
    settings_->setValue("ui/language", QString::fromStdString(lang));
}

std::string ConfigService::getDefaultReportFormat() {
    return settings_->value("report/defaultFormat").toString().toStdString();
}

void ConfigService::setDefaultReportFormat(const std::string& format) {
    settings_->setValue("report/defaultFormat", QString::fromStdString(format));
}

std::string ConfigService::getDefaultReportPath() {
    return settings_->value("report/defaultPath").toString().toStdString();
}

void ConfigService::setDefaultReportPath(const std::string& path) {
    settings_->setValue("report/defaultPath", QString::fromStdString(path));
}

std::string ConfigService::getDefaultExcelTemplatePath() {
    return settings_->value("excel/defaultTemplatePath").toString().toStdString();
}

void ConfigService::setDefaultExcelTemplatePath(const std::string& path) {
    settings_->setValue("excel/defaultTemplatePath", QString::fromStdString(path));
}

std::string ConfigService::getDefaultExcelImportPath() {
    return settings_->value("excel/defaultImportPath").toString().toStdString();
}

void ConfigService::setDefaultExcelImportPath(const std::string& path) {
    settings_->setValue("excel/defaultImportPath", QString::fromStdString(path));
}

template<typename T>
std::optional<T> ConfigService::getValue(const std::string& key) {
    QVariant value = settings_->value(QString::fromStdString(key));
    if (value.isNull()) {
        return std::nullopt;
    }
    
    if constexpr (std::is_same_v<T, std::string>) {
        return value.toString().toStdString();
    } else if constexpr (std::is_same_v<T, int>) {
        return value.toInt();
    } else if constexpr (std::is_same_v<T, bool>) {
        return value.toBool();
    } else if constexpr (std::is_same_v<T, double>) {
        return value.toDouble();
    }
    
    return std::nullopt;
}

template<typename T>
void ConfigService::setValue(const std::string& key, const T& value) {
    settings_->setValue(QString::fromStdString(key), QVariant::fromValue(value));
}

void ConfigService::sync() {
    settings_->sync();
}

// Explicit template instantiations
template std::optional<std::string> ConfigService::getValue(const std::string&);
template std::optional<int> ConfigService::getValue(const std::string&);
template std::optional<bool> ConfigService::getValue(const std::string&);
template std::optional<double> ConfigService::getValue(const std::string&);

template void ConfigService::setValue(const std::string&, const std::string&);
template void ConfigService::setValue(const std::string&, const int&);
template void ConfigService::setValue(const std::string&, const bool&);
template void ConfigService::setValue(const std::string&, const double&);

} // namespace Services
} // namespace TapeInventory 