#pragma once

#include <QWidget>
#include <QTabWidget>
#include <QMenuBar>
#include <QVBoxLayout>
#include <memory>
#include <pqxx/pqxx>

class OrderForm : public QWidget {
    Q_OBJECT

public:
    explicit OrderForm(QWidget *parent = nullptr);
    ~OrderForm() override;

private slots:
    void handleNewOrder();
    void handleEditOrder();
    void handleDeleteOrder();
    void handleExportOrder();
    void handleImportData();
    void refreshData();

private:
    void setupUI();
    void createMenus();
    void setupTabs();
    void setupConnections();

    QVBoxLayout *mainLayout;
    QTabWidget *tabWidget;
    QMenuBar *menuBar;
    
    // Database connection
    std::shared_ptr<pqxx::connection> dbConnection;

    // Tab components will be added here
    QWidget *orderListTab;
    QWidget *customerTab;
    QWidget *productTab;
}; 