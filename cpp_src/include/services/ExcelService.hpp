#pragma once

#include <string>
#include <vector>
#include <memory>
#include <xlnt/xlnt.hpp>
#include "database/Models.hpp"

namespace TapeInventory {
namespace Services {

class ExcelService {
public:
    // Template export functions
    static void exportBangKeoInTemplate(const std::string& filePath);
    static void exportTrucInTemplate(const std::string& filePath);
    static void exportBangKeoTemplate(const std::string& filePath);
    
    // Data export functions
    static void exportBangKeoInData(const std::string& filePath,
        const std::vector<Models::BangKeoInOrder>& orders);
    static void exportTrucInData(const std::string& filePath,
        const std::vector<Models::TrucInOrder>& orders);
    static void exportBangKeoData(const std::string& filePath,
        const std::vector<Models::BangKeoOrder>& orders);
    
    // Data import functions
    static std::vector<Models::BangKeoInOrder> importBangKeoInData(const std::string& filePath);
    static std::vector<Models::TrucInOrder> importTrucInData(const std::string& filePath);
    static std::vector<Models::BangKeoOrder> importBangKeoData(const std::string& filePath);

private:
    static void setupWorkbook(xlnt::workbook& wb);
    static void writeHeaders(xlnt::worksheet& ws, const std::vector<std::string>& headers);
    static std::vector<std::string> readHeaders(const xlnt::worksheet& ws);
    static void validateHeaders(const std::vector<std::string>& actual,
        const std::vector<std::string>& expected);
};

} // namespace Services
} // namespace TapeInventory 