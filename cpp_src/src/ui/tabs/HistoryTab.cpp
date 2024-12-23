#include "ui/tabs/HistoryTab.hpp"
#include <QMessageBox>
#include <QHeaderView>
#include <fmt/format.h>

namespace TapeInventory {
namespace UI {

HistoryTab::HistoryTab(QWidget* parent)
    : BaseTab(parent)
    , model(std::make_unique<QStandardItemModel>(this))
    , bangKeoInRepo(std::make_unique<Database::BangKeoInRepository>())
    , trucInRepo(std::make_unique<Database::TrucInRepository>())
    , bangKeoRepo(std::make_unique<Database::BangKeoRepository>())
{
    // Hide unused buttons
    addButton->hide();
    editButton->hide();
    deleteButton->hide();
    
    setupModel();
    setupTableView();
    refreshData();
}

void HistoryTab::setupModel() {
    model->setColumnCount(COLUMN_COUNT);
    model->setHorizontalHeaderLabels({
        tr("Date"),
        tr("Type"),
        tr("Customer Name"),
        tr("Details"),
        tr("Quantity"),
        tr("Total Price"),
        tr("Status")
    });
    
    tableView->setModel(model.get());
}

void HistoryTab::setupTableView() {
    // Set column widths
    tableView->horizontalHeader()->setSectionResizeMode(DATE, QHeaderView::Fixed);
    tableView->horizontalHeader()->setSectionResizeMode(TYPE, QHeaderView::Fixed);
    tableView->horizontalHeader()->setSectionResizeMode(NAME, QHeaderView::Stretch);
    tableView->horizontalHeader()->setSectionResizeMode(DETAILS, QHeaderView::Stretch);
    tableView->horizontalHeader()->setSectionResizeMode(QUANTITY, QHeaderView::Fixed);
    tableView->horizontalHeader()->setSectionResizeMode(TOTAL_PRICE, QHeaderView::Fixed);
    tableView->horizontalHeader()->setSectionResizeMode(STATUS, QHeaderView::Fixed);
    
    tableView->setColumnWidth(DATE, 100);
    tableView->setColumnWidth(TYPE, 100);
    tableView->setColumnWidth(QUANTITY, 80);
    tableView->setColumnWidth(TOTAL_PRICE, 100);
    tableView->setColumnWidth(STATUS, 100);
    
    // Enable sorting
    tableView->setSortingEnabled(true);
    tableView->sortByColumn(DATE, Qt::DescendingOrder);
}

void HistoryTab::refreshData() {
    try {
        populateModel();
    } catch (const std::exception& e) {
        QMessageBox::critical(this, tr("Error"),
            tr("Failed to load history: %1").arg(e.what()));
    }
}

void HistoryTab::populateModel() {
    model->removeRows(0, model->rowCount());
    
    // Helper function to add a row
    auto addRow = [this](const QDate& date,
        const QString& type,
        const QString& name,
        const QString& details,
        int quantity,
        double totalPrice,
        const QString& status) {
        QList<QStandardItem*> row;
        
        row.append(new QStandardItem(date.toString("yyyy-MM-dd")));
        row.append(new QStandardItem(type));
        row.append(new QStandardItem(name));
        row.append(new QStandardItem(details));
        row.append(new QStandardItem(QString::number(quantity)));
        row.append(new QStandardItem(QString::number(totalPrice, 'f', 2)));
        row.append(new QStandardItem(status));
        
        model->appendRow(row);
    };
    
    // Add BangKeoIn orders
    auto bangKeoInOrders = bangKeoInRepo->findAll();
    for (const auto& order : bangKeoInOrders) {
        QString details = tr("Size: %1, Color: %2")
            .arg(QString::fromStdString(order.size))
            .arg(QString::fromStdString(order.color));
            
        addRow(order.date,
            tr("Băng Keo In"),
            QString::fromStdString(order.customer_name),
            details,
            order.quantity,
            order.total_price,
            QString::fromStdString(order.status));
    }
    
    // Add TrucIn orders
    auto trucInOrders = trucInRepo->findAll();
    for (const auto& order : trucInOrders) {
        QString details = tr("Material: %1, Diameter: %2mm, Length: %3mm")
            .arg(QString::fromStdString(order.material))
            .arg(order.diameter)
            .arg(order.length);
            
        addRow(order.date,
            tr("Trục In"),
            QString::fromStdString(order.customer_name),
            details,
            order.quantity,
            order.total_price,
            QString::fromStdString(order.status));
    }
    
    // Add BangKeo orders
    auto bangKeoOrders = bangKeoRepo->findAll();
    for (const auto& order : bangKeoOrders) {
        QString details = tr("Specifications: %1, Color: %2")
            .arg(QString::fromStdString(order.specifications))
            .arg(QString::fromStdString(order.color));
            
        addRow(order.date,
            tr("Băng Keo"),
            QString::fromStdString(order.customer_name),
            details,
            order.quantity,
            order.total_price,
            QString::fromStdString(order.status));
    }
}

void HistoryTab::onSearch(const QString& text) {
    for (int row = 0; row < model->rowCount(); ++row) {
        bool match = false;
        
        for (int col = 0; col < model->columnCount(); ++col) {
            QString cellText = model->data(model->index(row, col)).toString();
            if (cellText.contains(text, Qt::CaseInsensitive)) {
                match = true;
                break;
            }
        }
        
        tableView->setRowHidden(row, !match);
    }
}

} // namespace UI
} // namespace TapeInventory 