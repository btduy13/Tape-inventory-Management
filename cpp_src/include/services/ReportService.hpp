#pragma once

#include <string>
#include <vector>
#include <memory>
#include <QDate>
#include "database/Models.hpp"

namespace TapeInventory {
namespace Services {

class ReportService {
public:
    // Report types
    enum class ReportType {
        DAILY_SALES,
        MONTHLY_SALES,
        INVENTORY_STATUS,
        CUSTOMER_SUMMARY,
        PROFIT_LOSS
    };
    
    // Report formats
    enum class ReportFormat {
        PDF,
        EXCEL,
        HTML
    };
    
    struct ReportOptions {
        ReportType type;
        ReportFormat format;
        QDate startDate;
        QDate endDate;
        std::string outputPath;
        bool includeCharts;
        bool includeDetails;
    };
    
    // Main report generation functions
    static void generateReport(const ReportOptions& options);
    
    // Specific report generators
    static void generateDailySalesReport(const ReportOptions& options);
    static void generateMonthlySalesReport(const ReportOptions& options);
    static void generateInventoryStatusReport(const ReportOptions& options);
    static void generateCustomerSummaryReport(const ReportOptions& options);
    static void generateProfitLossReport(const ReportOptions& options);

private:
    // Helper functions
    static void generatePDFReport(const ReportOptions& options,
        const std::vector<std::vector<std::string>>& data,
        const std::vector<std::string>& headers);
        
    static void generateExcelReport(const ReportOptions& options,
        const std::vector<std::vector<std::string>>& data,
        const std::vector<std::string>& headers);
        
    static void generateHTMLReport(const ReportOptions& options,
        const std::vector<std::vector<std::string>>& data,
        const std::vector<std::string>& headers);
        
    // Data aggregation helpers
    static std::vector<std::vector<std::string>> aggregateDailySalesData(
        const QDate& startDate, const QDate& endDate);
        
    static std::vector<std::vector<std::string>> aggregateMonthlySalesData(
        const QDate& startDate, const QDate& endDate);
        
    static std::vector<std::vector<std::string>> aggregateInventoryData();
    
    static std::vector<std::vector<std::string>> aggregateCustomerData(
        const QDate& startDate, const QDate& endDate);
        
    static std::vector<std::vector<std::string>> aggregateProfitLossData(
        const QDate& startDate, const QDate& endDate);
};

} // namespace Services
} // namespace TapeInventory 