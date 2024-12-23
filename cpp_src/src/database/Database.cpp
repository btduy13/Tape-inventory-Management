#include "database/Database.hpp"
#include <QDebug>

Database Database::instance;

Database& Database::getInstance() {
    return instance;
}

bool Database::connect(const std::string& connectionString) {
    try {
        connection = std::make_shared<pqxx::connection>(connectionString);
        if (connection->is_open()) {
            qDebug() << "Successfully connected to PostgreSQL database";
            return true;
        }
        return false;
    } catch (const std::exception& e) {
        qDebug() << "Database connection error:" << e.what();
        return false;
    }
}

std::shared_ptr<pqxx::connection> Database::getConnection() {
    return connection;
}

void Database::disconnect() {
    if (connection && connection->is_open()) {
        connection->disconnect();
    }
}

Database::~Database() {
    disconnect();
} 