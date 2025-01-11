#include "ui/MainWindow.hpp"
#include "services/ExcelService.hpp"
#include "ui/tabs/ThongKeTab.hpp"
#include "ui/tabs/BangKeoInTab.hpp"
#include "ui/tabs/BangKeoTab.hpp"
#include "ui/tabs/TrucInTab.hpp"
#include "ui/tabs/HistoryTab.hpp"
#include <QApplication>
#include <QMessageBox>
#include <QFileDialog>
#include <QSettings>
#include <QScreen>
#include <QMenu>
#include <QMenuBar>
#include <QStatusBar>
#include <QVBoxLayout>
#include <stdexcept>

namespace TapeInventory {
namespace UI {

MainWindow::MainWindow(QWidget* parent)
    : QMainWindow(parent)
    , bangKeoInRepo(std::make_unique<Database::BangKeoInRepository>())
    , trucInRepo(std::make_unique<Database::TrucInRepository>())
    , bangKeoRepo(std::make_unique<Database::BangKeoRepository>())
{
    setupUI();
    loadSettings();
}

MainWindow::~MainWindow() {
    saveSettings();
}

void MainWindow::setupUI() {
    setWindowTitle(tr("Tape Inventory Management"));
    
    // Set window size
    const QRect screenGeometry = QApplication::primaryScreen()->geometry();
    const int width = 1024;
    const int height = 850;
    const int x = (screenGeometry.width() - width) / 2;
    const int y = (screenGeometry.height() - height) / 2;
    setGeometry(x, y, width, height);
    setMinimumSize(800, 600);

    // Create central widget and layout
    QWidget* centralWidget = new QWidget(this);
    QVBoxLayout* layout = new QVBoxLayout(centralWidget);
    setCentralWidget(centralWidget);

    // Create UI components
    createMenus();
    createStatusBar();
    createTabs();

    layout->setContentsMargins(0, 0, 0, 0);
    layout->addWidget(tabWidget);
}

void MainWindow::createMenus() {
    // File menu
    QMenu* fileMenu = menuBar()->addMenu(tr("&File"));
    
    // Export submenu
    QMenu* exportMenu = fileMenu->addMenu(tr("Export Template"));
    exportMenu->addAction(tr("Băng Keo Template"), this, [this]() {
        onExportTemplate("bang_keo_in");
    });
    exportMenu->addAction(tr("Trục In Template"), this, [this]() {
        onExportTemplate("truc_in");
    });
    
    // Import submenu
    QMenu* importMenu = fileMenu->addMenu(tr("Import Data"));
    importMenu->addAction(tr("Băng Keo Data"), this, [this]() {
        onImportData("bang_keo_in");
    });
    importMenu->addAction(tr("Trục In Data"), this, [this]() {
        onImportData("truc_in");
    });
    
    fileMenu->addSeparator();
    fileMenu->addAction(tr("&Exit"), this, &QWidget::close);

    // Report menu
    QMenu* reportMenu = menuBar()->addMenu(tr("&Reports"));
    reportMenu->addAction(tr("Generate Report"), this, &MainWindow::onGenerateReport);

    // Help menu
    QMenu* helpMenu = menuBar()->addMenu(tr("&Help"));
    helpMenu->addAction(tr("&About"), this, &MainWindow::onAbout);
}

void MainWindow::createStatusBar() {
    statusBar = new QStatusBar(this);
    setStatusBar(statusBar);
}

void MainWindow::createTabs() {
    tabWidget = new QTabWidget(this);
    
    // Create and add tabs
    tabWidget->addTab(new ThongKeTab(this), tr("Thống Kê"));
    tabWidget->addTab(new BangKeoInTab(this), tr("Băng Keo In"));
    tabWidget->addTab(new BangKeoTab(this), tr("Băng Keo"));
    tabWidget->addTab(new TrucInTab(this), tr("Trục In"));
    tabWidget->addTab(new HistoryTab(this), tr("History"));
}

void MainWindow::loadSettings() {
    QSettings settings("TapeInventory", "TapeInventoryManagement");
    restoreGeometry(settings.value("geometry").toByteArray());
    restoreState(settings.value("windowState").toByteArray());
}

void MainWindow::saveSettings() {
    QSettings settings("TapeInventory", "TapeInventoryManagement");
    settings.setValue("geometry", saveGeometry());
    settings.setValue("windowState", saveState());
}

void MainWindow::onExportTemplate(const QString& type) {
    QString fileName = QFileDialog::getSaveFileName(this,
        tr("Export Template"),
        QString(),
        tr("Excel Files (*.xlsx)"));
        
    if (!fileName.isEmpty()) {
        try {
            if (type == "bang_keo_in") {
                Services::ExcelService::exportBangKeoInTemplate(fileName.toStdString());
            } else if (type == "truc_in") {
                Services::ExcelService::exportTrucInTemplate(fileName.toStdString());
            } else if (type == "bang_keo") {
                Services::ExcelService::exportBangKeoTemplate(fileName.toStdString());
            }
            
            updateStatusMessage(tr("Template exported successfully"));
        } catch (const std::exception& e) {
            QMessageBox::critical(this, tr("Error"), 
                tr("Failed to export template: %1").arg(e.what()));
        }
    }
}

void MainWindow::onImportData(const QString& type) {
    QString fileName = QFileDialog::getOpenFileName(this,
        tr("Import Data"),
        QString(),
        tr("Excel Files (*.xlsx)"));
        
    if (!fileName.isEmpty()) {
        try {
            if (type == "bang_keo_in") {
                auto orders = Services::ExcelService::importBangKeoInData(fileName.toStdString());
                for (const auto& order : orders) {
                    bangKeoInRepo->save(order);
                }
            } else if (type == "truc_in") {
                auto orders = Services::ExcelService::importTrucInData(fileName.toStdString());
                for (const auto& order : orders) {
                    trucInRepo->save(order);
                }
            } else if (type == "bang_keo") {
                auto orders = Services::ExcelService::importBangKeoData(fileName.toStdString());
                for (const auto& order : orders) {
                    bangKeoRepo->save(order);
                }
            }
            
            updateStatusMessage(tr("Data imported successfully"));
            
            // Refresh current tab
            if (auto* tab = qobject_cast<BaseTab*>(tabWidget->currentWidget())) {
                tab->refreshData();
            }
        } catch (const std::exception& e) {
            QMessageBox::critical(this, tr("Error"), 
                tr("Failed to import data: %1").arg(e.what()));
        }
    }
}

void MainWindow::onGenerateReport() {
    try {
        ReportDialog dialog(this);
        if (dialog.exec() == QDialog::Accepted) {
            auto options = dialog.getReportOptions();
            Services::ReportService::generateReport(options);
            updateStatusMessage(tr("Report generated successfully"));
        }
    } catch (const std::exception& e) {
        QMessageBox::critical(this, tr("Error"), 
            tr("Failed to generate report: %1").arg(e.what()));
    }
}

void MainWindow::onAbout() {
    QMessageBox::about(this, tr("About Tape Inventory Management"),
        tr("Tape Inventory Management System\n"
           "Version 1.0\n"
           "\n"
           "A comprehensive system for managing tape inventory."));
}

void MainWindow::updateStatusMessage(const QString& message) {
    statusBar->showMessage(message, 3000); // Show for 3 seconds
}

} // namespace UI
} // namespace TapeInventory 