#include <QApplication>
#include <QMessageBox>
#include "ui/MainWindow.hpp"
#include "database/Database.hpp"
#include <exception>
#include <memory>

int main(int argc, char *argv[]) {
    try {
        QApplication app(argc, argv);
        
        // Set application information
        QApplication::setApplicationName("Tape Inventory Management");
        QApplication::setApplicationVersion("1.0");
        QApplication::setOrganizationName("TapeInventory");
        
        // Initialize database connection pool
        auto& pool = TapeInventory::Database::ConnectionPool::getInstance();
        
        // Create and show main window
        TapeInventory::UI::MainWindow mainWindow;
        mainWindow.show();
        
        return app.exec();
        
    } catch (const std::exception& e) {
        QMessageBox::critical(nullptr, 
            QObject::tr("Critical Error"),
            QObject::tr("Application failed to start: %1").arg(e.what()));
        return 1;
    }
} 