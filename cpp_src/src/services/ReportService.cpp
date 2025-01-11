#include "services/ReportService.hpp"
#include <QPdfWriter>
#include <QPainter>
#include <QTextDocument>
#include <xlnt/xlnt.hpp>
#include <fmt/format.h>
#include <fstream>
#include <sstream>
#include <stdexcept>

namespace TapeInventory {
namespace Services {

void ReportService::generateReport(const ReportOptions& options) {
    switch (options.type) {
        case ReportType::DAILY_SALES:
            generateDailySalesReport(options);
            break;
        case ReportType::MONTHLY_SALES:
            generateMonthlySalesReport(options);
            break;
        case ReportType::INVENTORY_STATUS:
            generateInventoryStatusReport(options);
            break;
        case ReportType::CUSTOMER_SUMMARY:
            generateCustomerSummaryReport(options);
            break;
        case ReportType::PROFIT_LOSS:
            generateProfitLossReport(options);
            break;
        default:
            throw std::runtime_error("Unknown report type");
    }
}

void ReportService::generateDailySalesReport(const ReportOptions& options) {
    std::vector<std::string> headers = {
        "Date", "Order ID", "Customer", "Product", "Quantity",
        "Unit Price", "Total Price", "Status"
    };
    
    auto data = aggregateDailySalesData(options.startDate, options.endDate);
    
    switch (options.format) {
        case ReportFormat::PDF:
            generatePDFReport(options, data, headers);
            break;
        case ReportFormat::EXCEL:
            generateExcelReport(options, data, headers);
            break;
        case ReportFormat::HTML:
            generateHTMLReport(options, data, headers);
            break;
    }
}

void ReportService::generatePDFReport(const ReportOptions& options,
    const std::vector<std::vector<std::string>>& data,
    const std::vector<std::string>& headers) {
    
    QPdfWriter writer(QString::fromStdString(options.outputPath));
    writer.setPageSize(QPageSize(QPageSize::A4));
    
    QPainter painter(&writer);
    QTextDocument doc;
    
    // Create HTML content
    std::stringstream html;
    html << "<html><body>";
    html << "<h1>Report: " << options.startDate.toString("yyyy-MM-dd").toStdString()
         << " to " << options.endDate.toString("yyyy-MM-dd").toStdString() << "</h1>";
    
    // Add table
    html << "<table border='1' cellspacing='0' cellpadding='2'>";
    
    // Headers
    html << "<tr>";
    for (const auto& header : headers) {
        html << "<th>" << header << "</th>";
    }
    html << "</tr>";
    
    // Data rows
    for (const auto& row : data) {
        html << "<tr>";
        for (const auto& cell : row) {
            html << "<td>" << cell << "</td>";
        }
        html << "</tr>";
    }
    
    html << "</table></body></html>";
    
    doc.setHtml(QString::fromStdString(html.str()));
    doc.setPageSize(writer.pageRect().size());
    doc.drawContents(&painter);
}

void ReportService::generateExcelReport(const ReportOptions& options,
    const std::vector<std::vector<std::string>>& data,
    const std::vector<std::string>& headers) {
    
    xlnt::workbook wb;
    auto ws = wb.active_sheet();
    
    // Write headers
    for (size_t i = 0; i < headers.size(); ++i) {
        ws.cell(1, i + 1).value(headers[i]);
    }
    
    // Write data
    for (size_t row = 0; row < data.size(); ++row) {
        for (size_t col = 0; col < data[row].size(); ++col) {
            ws.cell(row + 2, col + 1).value(data[row][col]);
        }
    }
    
    // Style headers
    auto headerFont = xlnt::font()
        .bold(true)
        .size(12);
    
    auto headerFill = xlnt::fill()
        .type(xlnt::fill_type::solid)
        .start_color(xlnt::rgb_color(200, 200, 200));
    
    for (size_t i = 0; i < headers.size(); ++i) {
        auto cell = ws.cell(1, i + 1);
        cell.font(headerFont);
        cell.fill(headerFill);
    }
    
    wb.save(options.outputPath);
}

void ReportService::generateHTMLReport(const ReportOptions& options,
    const std::vector<std::vector<std::string>>& data,
    const std::vector<std::string>& headers) {
    
    std::ofstream file(options.outputPath);
    if (!file.is_open()) {
        throw std::runtime_error("Failed to create HTML file");
    }
    
    file << "<!DOCTYPE html>\n<html>\n<head>\n";
    file << "<style>\n";
    file << "table { border-collapse: collapse; width: 100%; }\n";
    file << "th, td { border: 1px solid black; padding: 8px; text-align: left; }\n";
    file << "th { background-color: #f2f2f2; }\n";
    file << "tr:nth-child(even) { background-color: #f9f9f9; }\n";
    file << "</style>\n</head>\n<body>\n";
    
    file << "<h1>Report: " << options.startDate.toString("yyyy-MM-dd").toStdString()
         << " to " << options.endDate.toString("yyyy-MM-dd").toStdString() << "</h1>\n";
    
    file << "<table>\n<tr>\n";
    for (const auto& header : headers) {
        file << "<th>" << header << "</th>\n";
    }
    file << "</tr>\n";
    
    for (const auto& row : data) {
        file << "<tr>\n";
        for (const auto& cell : row) {
            file << "<td>" << cell << "</td>\n";
        }
        file << "</tr>\n";
    }
    
    file << "</table>\n</body>\n</html>";
    file.close();
}

std::vector<std::vector<std::string>> ReportService::aggregateDailySalesData(
    const QDate& startDate, const QDate& endDate) {
    
    std::vector<std::vector<std::string>> data;
    
    // TODO: Implement data aggregation from repositories
    // This should query the database and format the data
    
    return data;
}

// Similar implementations for other report types...

} // namespace Services
} // namespace TapeInventory 