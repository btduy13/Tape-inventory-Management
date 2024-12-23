#include "services/ExcelService.hpp"
#include <stdexcept>
#include <algorithm>
#include <fmt/format.h>

namespace TapeInventory {
namespace Services {

namespace {
    // Header definitions
    const std::vector<std::string> BANG_KEO_IN_HEADERS = {
        "ID", "Date", "Name", "Due Date", "Width (mm)", "Length (m)",
        "Thickness (mic)", "Rolls", "Quantity", "Quantity Fee", "Tape Color",
        "Tape Fee", "Color Fee", "Size Fee", "Cut Fee", "Cost Price",
        "Base Price", "Selling Price", "Deposit", "Paper Type", "Packaging",
        "Collaborator", "Commission", "Delivered", "Paid"
    };
    
    const std::vector<std::string> TRUC_IN_HEADERS = {
        "ID", "Date", "Name", "Due Date", "Specifications", "Quantity",
        "Tape Color", "Base Price", "Selling Price", "Collaborator",
        "Commission", "Delivered", "Paid"
    };
    
    const std::vector<std::string> BANG_KEO_HEADERS = {
        "ID", "Date", "Name", "Due Date", "Specifications", "Quantity",
        "Color", "Base Price", "Selling Price", "Collaborator",
        "Commission", "Delivered", "Paid"
    };
}

void ExcelService::setupWorkbook(xlnt::workbook& wb) {
    // Set workbook properties
    wb.core_property("creator", "Tape Inventory Management");
    wb.core_property("title", "Order Data");
    wb.core_property("created", std::chrono::system_clock::now());
}

void ExcelService::writeHeaders(xlnt::worksheet& ws, const std::vector<std::string>& headers) {
    // Write headers
    for (size_t i = 0; i < headers.size(); ++i) {
        ws.cell(1, i + 1).value(headers[i]);
        ws.column_properties(i + 1).width = 15.0; // Set column width
    }
    
    // Style headers
    auto headerFont = xlnt::font()
        .bold(true)
        .size(12);
    
    auto headerFill = xlnt::fill()
        .type(xlnt::fill_type::solid)
        .start_color(xlnt::rgb_color(200, 200, 200));
    
    auto headerAlignment = xlnt::alignment()
        .horizontal(xlnt::horizontal_alignment::center)
        .vertical(xlnt::vertical_alignment::center);
    
    for (size_t i = 0; i < headers.size(); ++i) {
        auto cell = ws.cell(1, i + 1);
        cell.font(headerFont);
        cell.fill(headerFill);
        cell.alignment(headerAlignment);
    }
}

std::vector<std::string> ExcelService::readHeaders(const xlnt::worksheet& ws) {
    std::vector<std::string> headers;
    for (auto cell : ws.range("1:1")) {
        headers.push_back(cell.to_string());
    }
    return headers;
}

void ExcelService::validateHeaders(const std::vector<std::string>& actual,
    const std::vector<std::string>& expected) {
    if (actual.size() != expected.size()) {
        throw std::runtime_error(fmt::format(
            "Invalid header count. Expected {}, got {}",
            expected.size(), actual.size()));
    }
    
    for (size_t i = 0; i < expected.size(); ++i) {
        if (actual[i] != expected[i]) {
            throw std::runtime_error(fmt::format(
                "Invalid header at column {}. Expected '{}', got '{}'",
                i + 1, expected[i], actual[i]));
        }
    }
}

void ExcelService::exportBangKeoInTemplate(const std::string& filePath) {
    xlnt::workbook wb;
    setupWorkbook(wb);
    
    auto ws = wb.active_sheet();
    ws.title("Template");
    
    writeHeaders(ws, BANG_KEO_IN_HEADERS);
    
    // Add example row
    std::vector<std::string> example = {
        "BK-12-23-001", "2023-12-23", "Example Order", "2023-12-30",
        "100", "200", "50", "10", "1000", "100", "Blue", "200", "150",
        "100", "50", "5000", "6000", "7000", "1000", "Type A", "Box",
        "John Doe", "10", "FALSE", "FALSE"
    };
    
    for (size_t i = 0; i < example.size(); ++i) {
        ws.cell(2, i + 1).value(example[i]);
    }
    
    wb.save(filePath);
}

void ExcelService::exportBangKeoInData(const std::string& filePath,
    const std::vector<Models::BangKeoInOrder>& orders) {
    xlnt::workbook wb;
    setupWorkbook(wb);
    
    auto ws = wb.active_sheet();
    ws.title("Orders");
    
    writeHeaders(ws, BANG_KEO_IN_HEADERS);
    
    // Write data
    int row = 2;
    for (const auto& order : orders) {
        ws.cell(row, 1).value(order.id);
        ws.cell(row, 2).value(std::chrono::system_clock::to_time_t(order.thoi_gian));
        ws.cell(row, 3).value(order.ten_hang);
        ws.cell(row, 4).value(std::chrono::system_clock::to_time_t(order.ngay_du_kien));
        ws.cell(row, 5).value(order.quy_cach_mm);
        ws.cell(row, 6).value(order.quy_cach_m);
        ws.cell(row, 7).value(order.quy_cach_mic);
        ws.cell(row, 8).value(order.cuon_cay);
        ws.cell(row, 9).value(order.so_luong);
        ws.cell(row, 10).value(order.phi_sl);
        ws.cell(row, 11).value(order.mau_keo);
        ws.cell(row, 12).value(order.phi_keo);
        ws.cell(row, 13).value(order.phi_mau);
        ws.cell(row, 14).value(order.phi_size);
        ws.cell(row, 15).value(order.phi_cat);
        ws.cell(row, 16).value(order.don_gia_von);
        ws.cell(row, 17).value(order.don_gia_goc);
        ws.cell(row, 18).value(order.don_gia_ban);
        ws.cell(row, 19).value(order.tien_coc);
        ws.cell(row, 20).value(order.loi_giay);
        ws.cell(row, 21).value(order.thung_bao);
        ws.cell(row, 22).value(order.ctv);
        ws.cell(row, 23).value(order.hoa_hong);
        ws.cell(row, 24).value(order.da_giao);
        ws.cell(row, 25).value(order.da_tat_toan);
        
        ++row;
    }
    
    wb.save(filePath);
}

std::vector<Models::BangKeoInOrder> ExcelService::importBangKeoInData(const std::string& filePath) {
    xlnt::workbook wb;
    wb.load(filePath);
    
    auto ws = wb.active_sheet();
    
    // Validate headers
    auto headers = readHeaders(ws);
    validateHeaders(headers, BANG_KEO_IN_HEADERS);
    
    std::vector<Models::BangKeoInOrder> orders;
    
    // Read data rows
    for (auto row : ws.rows(false)) {
        if (row[0].row() == 1) continue; // Skip header row
        
        Models::BangKeoInOrder order;
        
        order.id = row[0].to_string();
        order.thoi_gian = std::chrono::system_clock::from_time_t(row[1].value<int>());
        order.ten_hang = row[2].to_string();
        order.ngay_du_kien = std::chrono::system_clock::from_time_t(row[3].value<int>());
        order.quy_cach_mm = row[4].value<double>();
        order.quy_cach_m = row[5].value<double>();
        order.quy_cach_mic = row[6].value<double>();
        order.cuon_cay = row[7].value<double>();
        order.so_luong = row[8].value<double>();
        order.phi_sl = row[9].value<double>();
        order.mau_keo = row[10].to_string();
        order.phi_keo = row[11].value<double>();
        order.phi_mau = row[12].value<double>();
        order.phi_size = row[13].value<double>();
        order.phi_cat = row[14].value<double>();
        order.don_gia_von = row[15].value<double>();
        order.don_gia_goc = row[16].value<double>();
        order.don_gia_ban = row[17].value<double>();
        order.tien_coc = row[18].value<double>();
        order.loi_giay = row[19].to_string();
        order.thung_bao = row[20].to_string();
        order.ctv = row[21].to_string();
        order.hoa_hong = row[22].value<double>();
        order.da_giao = row[23].value<bool>();
        order.da_tat_toan = row[24].value<bool>();
        
        orders.push_back(order);
    }
    
    return orders;
}

// Similar implementations for TrucIn and BangKeo template/data export/import functions...

} // namespace Services
} // namespace TapeInventory 