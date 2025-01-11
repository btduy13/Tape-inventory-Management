#include "MainWindow.hpp"
#include "ui/OrderForm.hpp"
#include "database/Database.hpp"
#include <QMenuBar>
#include <QMessageBox>
#include <QStatusBar>
#include <QApplication>
#include <QScreen>

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
{
    setupUI();
    createMenus();
    createStatusBar();
    initializeDatabase();
}

void MainWindow::setupUI() {
    // Set window title
    setWindowTitle(tr("Tape Inventory Management"));
    
    // Center the window
    QScreen *screen = QApplication::primaryScreen();
    QRect screenGeometry = screen->geometry();
    int x = (screenGeometry.width() - width()) / 2;
    int y = (screenGeometry.height() - height()) / 2;
    move(x, y);
    
    // Create central widget
    setCentralWidget(new OrderForm(this));
}

void MainWindow::createMenus() {
    menuBar = new QMenuBar(this);
    setMenuBar(menuBar);
    
    // File menu
    QMenu *fileMenu = menuBar->addMenu(tr("&File"));
    fileMenu->addAction(tr("&Exit"), this, &QWidget::close);
    
    // Reports menu
    QMenu *reportsMenu = menuBar->addMenu(tr("&Reports"));
    reportsMenu->addAction(tr("&Generate Order Report"), this, &MainWindow::generateReport);
}

void MainWindow::createStatusBar() {
    statusBar = new QStatusBar(this);
    setStatusBar(statusBar);
    statusBar->showMessage(tr("Ready"));
}

void MainWindow::initializeDatabase() {
    // TODO: Load from config file
    databaseUrl = "postgresql://username:password@localhost/inventory";
    handleDatabaseConnection();
}

void MainWindow::handleDatabaseConnection() {
    try {
        if (Database::getInstance().connect(databaseUrl.toStdString())) {
            statusBar->showMessage(tr("Connected to database"));
        } else {
            throw std::runtime_error("Failed to connect to database");
        }
    } catch (const std::exception& e) {
        QMessageBox::critical(this, tr("Database Error"),
            tr("Failed to connect to database: %1").arg(e.what()));
    }
}

void MainWindow::openOrderForm() {
    // Already handled in setupUI()
}

void MainWindow::generateReport() {
    try {
        // TODO: Implement report generation
        QMessageBox::information(this, tr("Report Generation"),
            tr("Report generation will be implemented soon."));
    } catch (const std::exception& e) {
        QMessageBox::critical(this, tr("Error"),
            tr("Failed to generate report: %1").arg(e.what()));
    }
} 