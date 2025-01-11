#pragma once

#include <memory>
#include <string>
#include <vector>
#include <pqxx/pqxx>
#include "Models.hpp"

namespace TapeInventory {
namespace Database {

class ConnectionPool {
public:
    static ConnectionPool& getInstance();
    std::shared_ptr<pqxx::connection> getConnection();
    void returnConnection(std::shared_ptr<pqxx::connection> conn);

private:
    ConnectionPool();
    ~ConnectionPool();
    ConnectionPool(const ConnectionPool&) = delete;
    ConnectionPool& operator=(const ConnectionPool&) = delete;

    std::vector<std::shared_ptr<pqxx::connection>> connections_;
    std::string connectionString_;
    static constexpr size_t POOL_SIZE = 10;
};

template<typename T>
class Repository {
public:
    virtual ~Repository() = default;
    virtual std::vector<T> findAll() = 0;
    virtual std::optional<T> findById(const std::string& id) = 0;
    virtual void save(const T& entity) = 0;
    virtual void update(const T& entity) = 0;
    virtual void remove(const std::string& id) = 0;
};

class BangKeoInRepository : public Repository<Models::BangKeoInOrder> {
public:
    BangKeoInRepository();
    std::vector<Models::BangKeoInOrder> findAll() override;
    std::optional<Models::BangKeoInOrder> findById(const std::string& id) override;
    void save(const Models::BangKeoInOrder& order) override;
    void update(const Models::BangKeoInOrder& order) override;
    void remove(const std::string& id) override;

private:
    ConnectionPool& pool_;
};

class TrucInRepository : public Repository<Models::TrucInOrder> {
public:
    TrucInRepository();
    std::vector<Models::TrucInOrder> findAll() override;
    std::optional<Models::TrucInOrder> findById(const std::string& id) override;
    void save(const Models::TrucInOrder& order) override;
    void update(const Models::TrucInOrder& order) override;
    void remove(const std::string& id) override;

private:
    ConnectionPool& pool_;
};

class BangKeoRepository : public Repository<Models::BangKeoOrder> {
public:
    BangKeoRepository();
    std::vector<Models::BangKeoOrder> findAll() override;
    std::optional<Models::BangKeoOrder> findById(const std::string& id) override;
    void save(const Models::BangKeoOrder& order) override;
    void update(const Models::BangKeoOrder& order) override;
    void remove(const std::string& id) override;

private:
    ConnectionPool& pool_;
};

} // namespace Database
} // namespace TapeInventory 