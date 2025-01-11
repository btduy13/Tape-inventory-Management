#include "ui/OrderForm.hpp"
#include "database/Database.hpp"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QPushButton>
#include <QLabel>
#include <QMessageBox>
#include <QTableView>
#include <QHeaderView>
#include <QSqlTableModel>

OrderForm::OrderForm(QWidget *parent)
    : QWidget(parent)
    , mainLayout(new QVBoxLayout(this))
    , tabWidget(new QTabWidget(this))
{
    setupUI();
    setupTabs();
    setupConnections();
    refreshData();
}

OrderForm::~OrderForm() {
    // Qt will handle deletion of child widgets
}

void OrderForm::setupUI() {
    // Create main layout
    setLayout(mainLayout);
    
    // Add tab widget to main layout
    mainLayout->addWidget(tabWidget);
    
    // Create action buttons
    QHBoxLayout *buttonLayout = new QHBoxLayout();
    QPushButton *newOrderBtn = new QPushButton(tr("New Order"), this);
    QPushButton *editOrderBtn = new QPushButton(tr("Edit Order"), this);
    QPushButton *deleteOrderBtn = new QPushButton(tr("Delete Order"), this);
    
    buttonLayout->addWidget(newOrderBtn);
    buttonLayout->addWidget(editOrderBtn);
    buttonLayout->addWidget(deleteOrderBtn);
    buttonLayout->addStretch();
    
    mainLayout->addLayout(buttonLayout);
    
    // Connect button signals
    connect(newOrderBtn, &QPushButton::clicked, this, &OrderForm::handleNewOrder);
    connect(editOrderBtn, &QPushButton::clicked, this, &OrderForm::handleEditOrder);
    connect(deleteOrderBtn, &QPushButton::clicked, this, &OrderForm::handleDeleteOrder);
}

void OrderForm::setupTabs() {
    // Create tabs
    orderListTab = new QWidget();
    customerTab = new QWidget();
    productTab = new QWidget();
    
    // Add tabs to tab widget
    tabWidget->addTab(orderListTab, tr("Orders"));
    tabWidget->addTab(customerTab, tr("Customers"));
    tabWidget->addTab(productTab, tr("Products"));
    
    // Setup order list tab
    QVBoxLayout *orderLayout = new QVBoxLayout(orderListTab);
    QTableView *orderTable = new QTableView(orderListTab);
    orderLayout->addWidget(orderTable);
    
    // TODO: Set up table model and populate data
}

void OrderForm::setupConnections() {
    try {
        dbConnection = Database::getInstance().getConnection();
    } catch (const std::exception& e) {
        QMessageBox::critical(this, tr("Database Error"),
            tr("Failed to connect to database: %1").arg(e.what()));
    }
}

void OrderForm::handleNewOrder() {
    // TODO: Implement new order dialog
    QMessageBox::information(this, tr("New Order"),
        tr("New order functionality will be implemented soon."));
}

void OrderForm::handleEditOrder() {
    // TODO: Implement edit order dialog
    QMessageBox::information(this, tr("Edit Order"),
        tr("Edit order functionality will be implemented soon."));
}

void OrderForm::handleDeleteOrder() {
    // TODO: Implement delete order confirmation and processing
    QMessageBox::information(this, tr("Delete Order"),
        tr("Delete order functionality will be implemented soon."));
}

void OrderForm::handleExportOrder() {
    // TODO: Implement order export
    QMessageBox::information(this, tr("Export Order"),
        tr("Export functionality will be implemented soon."));
}

void OrderForm::handleImportData() {
    // TODO: Implement data import
    QMessageBox::information(this, tr("Import Data"),
        tr("Import functionality will be implemented soon."));
}

void OrderForm::refreshData() {
    // TODO: Implement data refresh from database
    try {
        if (dbConnection && dbConnection->is_open()) {
            // Refresh data from database
        }
    } catch (const std::exception& e) {
        QMessageBox::critical(this, tr("Database Error"),
            tr("Failed to refresh data: %1").arg(e.what()));
    }
} 