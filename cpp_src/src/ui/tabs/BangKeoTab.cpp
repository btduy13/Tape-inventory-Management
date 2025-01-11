#include "ui/tabs/BangKeoTab.hpp"
#include "ui/dialogs/OrderDialog.hpp"
#include <QMessageBox>
#include <QHeaderView>
#include <fmt/format.h>

namespace TapeInventory {
namespace UI {

BangKeoTab::BangKeoTab(QWidget* parent)
    : BaseTab(parent)
    , model(std::make_unique<QStandardItemModel>(this))
    , repository(std::make_unique<Database::BangKeoRepository>())
{
    setupModel();
    setupTableView();
    refreshData();
}

void BangKeoTab::setupModel() {
    model->setColumnCount(COLUMN_COUNT);
    model->setHorizontalHeaderLabels({
        tr("ID"),
        tr("Date"),
        tr("Customer Name"),
        tr("Due Date"),
        tr("Specifications"),
        tr("Quantity"),
        tr("Color"),
        tr("Unit Price"),
        tr("Total Price"),
        tr("Status")
    });
    
    tableView->setModel(model.get());
}

void BangKeoTab::setupTableView() {
    // Set column widths
    tableView->horizontalHeader()->setSectionResizeMode(ID, QHeaderView::Fixed);
    tableView->horizontalHeader()->setSectionResizeMode(DATE, QHeaderView::Fixed);
    tableView->horizontalHeader()->setSectionResizeMode(NAME, QHeaderView::Stretch);
    tableView->horizontalHeader()->setSectionResizeMode(DUE_DATE, QHeaderView::Fixed);
    tableView->horizontalHeader()->setSectionResizeMode(SPECIFICATIONS, QHeaderView::Stretch);
    tableView->horizontalHeader()->setSectionResizeMode(QUANTITY, QHeaderView::Fixed);
    tableView->horizontalHeader()->setSectionResizeMode(COLOR, QHeaderView::Fixed);
    tableView->horizontalHeader()->setSectionResizeMode(UNIT_PRICE, QHeaderView::Fixed);
    tableView->horizontalHeader()->setSectionResizeMode(TOTAL_PRICE, QHeaderView::Fixed);
    tableView->horizontalHeader()->setSectionResizeMode(STATUS, QHeaderView::Fixed);
    
    tableView->setColumnWidth(ID, 80);
    tableView->setColumnWidth(DATE, 100);
    tableView->setColumnWidth(DUE_DATE, 100);
    tableView->setColumnWidth(QUANTITY, 80);
    tableView->setColumnWidth(COLOR, 100);
    tableView->setColumnWidth(UNIT_PRICE, 100);
    tableView->setColumnWidth(TOTAL_PRICE, 100);
    tableView->setColumnWidth(STATUS, 100);
    
    // Enable sorting
    tableView->setSortingEnabled(true);
    tableView->sortByColumn(DATE, Qt::DescendingOrder);
}

void BangKeoTab::refreshData() {
    try {
        auto orders = repository->findAll();
        populateModel(orders);
    } catch (const std::exception& e) {
        QMessageBox::critical(this, tr("Error"),
            tr("Failed to load orders: %1").arg(e.what()));
    }
}

void BangKeoTab::populateModel(const std::vector<Models::BangKeoOrder>& orders) {
    model->removeRows(0, model->rowCount());
    
    for (const auto& order : orders) {
        QList<QStandardItem*> row;
        
        // ID
        row.append(new QStandardItem(QString::number(order.id)));
        
        // Date
        row.append(new QStandardItem(order.date.toString("yyyy-MM-dd")));
        
        // Customer Name
        row.append(new QStandardItem(QString::fromStdString(order.customer_name)));
        
        // Due Date
        row.append(new QStandardItem(order.due_date.toString("yyyy-MM-dd")));
        
        // Specifications
        row.append(new QStandardItem(QString::fromStdString(order.specifications)));
        
        // Quantity
        row.append(new QStandardItem(QString::number(order.quantity)));
        
        // Color
        row.append(new QStandardItem(QString::fromStdString(order.color)));
        
        // Unit Price
        row.append(new QStandardItem(QString::number(order.unit_price, 'f', 2)));
        
        // Total Price
        row.append(new QStandardItem(QString::number(order.total_price, 'f', 2)));
        
        // Status
        row.append(new QStandardItem(QString::fromStdString(order.status)));
        
        model->appendRow(row);
    }
}

void BangKeoTab::onAdd() {
    try {
        OrderDialog dialog(OrderDialog::Type::BANG_KEO, this);
        if (dialog.exec() == QDialog::Accepted) {
            auto order = dialog.getBangKeoOrder();
            repository->save(order);
            refreshData();
        }
    } catch (const std::exception& e) {
        QMessageBox::critical(this, tr("Error"),
            tr("Failed to add order: %1").arg(e.what()));
    }
}

void BangKeoTab::onEdit() {
    auto selectedRows = tableView->selectionModel()->selectedRows();
    if (selectedRows.isEmpty()) {
        QMessageBox::warning(this, tr("Warning"),
            tr("Please select an order to edit"));
        return;
    }
    
    try {
        int id = model->data(model->index(selectedRows[0].row(), ID)).toInt();
        auto order = repository->findById(id);
        if (!order) {
            throw std::runtime_error("Order not found");
        }
        
        OrderDialog dialog(OrderDialog::Type::BANG_KEO, this);
        dialog.setBangKeoOrder(*order);
        
        if (dialog.exec() == QDialog::Accepted) {
            auto updatedOrder = dialog.getBangKeoOrder();
            updatedOrder.id = id;
            repository->save(updatedOrder);
            refreshData();
        }
    } catch (const std::exception& e) {
        QMessageBox::critical(this, tr("Error"),
            tr("Failed to edit order: %1").arg(e.what()));
    }
}

void BangKeoTab::onDelete() {
    auto selectedRows = tableView->selectionModel()->selectedRows();
    if (selectedRows.isEmpty()) {
        QMessageBox::warning(this, tr("Warning"),
            tr("Please select an order to delete"));
        return;
    }
    
    if (QMessageBox::question(this, tr("Confirm Delete"),
        tr("Are you sure you want to delete the selected order?"),
        QMessageBox::Yes | QMessageBox::No) == QMessageBox::Yes) {
        try {
            int id = model->data(model->index(selectedRows[0].row(), ID)).toInt();
            repository->remove(id);
            refreshData();
        } catch (const std::exception& e) {
            QMessageBox::critical(this, tr("Error"),
                tr("Failed to delete order: %1").arg(e.what()));
        }
    }
}

void BangKeoTab::onSearch(const QString& text) {
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