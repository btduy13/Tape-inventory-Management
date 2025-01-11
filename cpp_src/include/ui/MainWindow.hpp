#pragma once

#include <QMainWindow>
#include <QTabWidget>
#include <QStatusBar>
#include <QMenuBar>
#include <memory>
#include "database/Database.hpp"
#include "ui/tabs/BaseTab.hpp"

namespace TapeInventory {
namespace UI {

class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit MainWindow(QWidget* parent = nullptr);
    ~MainWindow();

private slots:
    void onExportTemplate(const QString& type);
    void onImportData(const QString& type);
    void onGenerateReport();
    void onAbout();
    void updateStatusMessage(const QString& message);

private:
    void setupUI();
    void createMenus();
    void createStatusBar();
    void createTabs();
    void loadSettings();
    void saveSettings();

    QTabWidget* tabWidget;
    QStatusBar* statusBar;
    QMenuBar* menuBar;

    // Database repositories
    std::unique_ptr<Database::BangKeoInRepository> bangKeoInRepo;
    std::unique_ptr<Database::TrucInRepository> trucInRepo;
    std::unique_ptr<Database::BangKeoRepository> bangKeoRepo;
};

} // namespace UI
} // namespace TapeInventory 