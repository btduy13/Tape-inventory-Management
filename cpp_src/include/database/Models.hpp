#pragma once

#include <string>
#include <chrono>
#include <optional>
#include <memory>
#include <vector>

namespace TapeInventory {
namespace Models {

// Base class for all orders
class BaseOrder {
public:
    virtual ~BaseOrder() = default;

    std::string id;
    std::chrono::system_clock::time_point thoi_gian;
    std::string ten_hang;
    std::chrono::system_clock::time_point ngay_du_kien;
    double so_luong;
    std::string mau_sac;
    double don_gia_goc;
    double thanh_tien;
    double don_gia_ban;
    double thanh_tien_ban;
    double cong_no_khach;
    std::string ctv;
    double hoa_hong;
    double tien_hoa_hong;
    double loi_nhuan;
    bool da_giao;
    bool da_tat_toan;
};

// Printed tape orders
class BangKeoInOrder : public BaseOrder {
public:
    double quy_cach_mm;
    double quy_cach_m;
    double quy_cach_mic;
    double cuon_cay;
    double phi_sl;
    std::string mau_keo;
    double phi_keo;
    double phi_mau;
    double phi_size;
    double phi_cat;
    double don_gia_von;
    double tien_coc;
    std::string loi_giay;
    std::string thung_bao;
};

// Print roller orders
class TrucInOrder : public BaseOrder {
public:
    std::string quy_cach;
    std::string mau_keo;
};

// Tape orders
class BangKeoOrder : public BaseOrder {
public:
    std::string quy_cach;  // In KG
};

} // namespace Models
} // namespace TapeInventory 