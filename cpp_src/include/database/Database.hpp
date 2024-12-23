#pragma once

#include <memory>
#include <string>
#include <pqxx/pqxx>

class Database {
public:
    static Database& getInstance();
    bool connect(const std::string& connectionString);
    std::shared_ptr<pqxx::connection> getConnection();
    void disconnect();

private:
    Database() = default;
    ~Database();
    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;

    std::shared_ptr<pqxx::connection> connection;
    static Database instance;
}; 