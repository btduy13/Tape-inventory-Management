#include <QApplication>
#include <QMessageBox>
#include "MainWindow.hpp"

int main(int argc, char *argv[]) {
    try {
        QApplication app(argc, argv);
        
        // Set application properties
        QApplication::setApplicationName("Tape Inventory Management");
        QApplication::setApplicationVersion("1.0.0");
        
        // Create and show main window
        MainWindow mainWindow;
        mainWindow.resize(1024, 850);
        mainWindow.setMinimumSize(800, 600);
        mainWindow.show();
        
        return app.exec();
    } catch (const std::exception& e) {
        QMessageBox::critical(nullptr, "Error", 
            QString("An unexpected error occurred: %1").arg(e.what()));
        return 1;
    }
} 