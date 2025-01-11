#include "database/Database.hpp"
#include <stdexcept>
#include <mutex>

namespace TapeInventory {
namespace Database {

namespace {
    std::mutex poolMutex;
}

ConnectionPool::ConnectionPool() {
    // Initialize connection string from environment or config
    connectionString_ = "postgresql://username:password@localhost:5432/tape_inventory";
    
    // Create initial pool of connections
    for (size_t i = 0; i < POOL_SIZE; ++i) {
        try {
            auto conn = std::make_shared<pqxx::connection>(connectionString_);
            connections_.push_back(conn);
        } catch (const std::exception& e) {
            throw std::runtime_error("Failed to initialize database connection pool: " + std::string(e.what()));
        }
    }
}

ConnectionPool::~ConnectionPool() {
    // Connections will be automatically closed by their destructors
    connections_.clear();
}

ConnectionPool& ConnectionPool::getInstance() {
    static ConnectionPool instance;
    return instance;
}

std::shared_ptr<pqxx::connection> ConnectionPool::getConnection() {
    std::lock_guard<std::mutex> lock(poolMutex);
    
    if (connections_.empty()) {
        // Create new connection if pool is empty
        return std::make_shared<pqxx::connection>(connectionString_);
    }
    
    auto conn = connections_.back();
    connections_.pop_back();
    
    // Check if connection is still valid
    if (!conn->is_open()) {
        conn = std::make_shared<pqxx::connection>(connectionString_);
    }
    
    return conn;
}

void ConnectionPool::returnConnection(std::shared_ptr<pqxx::connection> conn) {
    if (!conn || !conn->is_open()) {
        return;
    }
    
    std::lock_guard<std::mutex> lock(poolMutex);
    
    // Only keep up to POOL_SIZE connections
    if (connections_.size() < POOL_SIZE) {
        connections_.push_back(conn);
    }
}

// BangKeoInRepository Implementation
BangKeoInRepository::BangKeoInRepository() : pool_(ConnectionPool::getInstance()) {}

std::vector<Models::BangKeoInOrder> BangKeoInRepository::findAll() {
    auto conn = pool_.getConnection();
    std::vector<Models::BangKeoInOrder> results;
    
    try {
        pqxx::work txn(*conn);
        auto res = txn.exec("SELECT * FROM bang_keo_in_orders ORDER BY thoi_gian DESC");
        
        for (const auto& row : res) {
            Models::BangKeoInOrder order;
            order.id = row["id"].as<std::string>();
            order.ten_hang = row["ten_hang"].as<std::string>();
            // ... populate other fields
            results.push_back(order);
        }
        
        txn.commit();
    } catch (const std::exception& e) {
        // Log error
    }
    
    pool_.returnConnection(conn);
    return results;
}

std::optional<Models::BangKeoInOrder> BangKeoInRepository::findById(const std::string& id) {
    auto conn = pool_.getConnection();
    
    try {
        pqxx::work txn(*conn);
        auto res = txn.exec_params("SELECT * FROM bang_keo_in_orders WHERE id = $1", id);
        
        if (!res.empty()) {
            Models::BangKeoInOrder order;
            order.id = res[0]["id"].as<std::string>();
            order.ten_hang = res[0]["ten_hang"].as<std::string>();
            // ... populate other fields
            
            txn.commit();
            pool_.returnConnection(conn);
            return order;
        }
        
        txn.commit();
    } catch (const std::exception& e) {
        // Log error
    }
    
    pool_.returnConnection(conn);
    return std::nullopt;
}

void BangKeoInRepository::save(const Models::BangKeoInOrder& order) {
    auto conn = pool_.getConnection();
    
    try {
        pqxx::work txn(*conn);
        txn.exec_params(
            "INSERT INTO bang_keo_in_orders (id, ten_hang, ngay_du_kien, ...) "
            "VALUES ($1, $2, $3, ...)",
            order.id,
            order.ten_hang,
            order.ngay_du_kien
            // ... other fields
        );
        
        txn.commit();
    } catch (const std::exception& e) {
        // Log error
        throw;
    }
    
    pool_.returnConnection(conn);
}

// Similar implementations for update() and remove()
// And similar implementations for TrucInRepository and BangKeoRepository

} // namespace Database
} // namespace TapeInventory 