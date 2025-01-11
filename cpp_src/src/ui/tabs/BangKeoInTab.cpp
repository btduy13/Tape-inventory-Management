#include "ui/tabs/BangKeoInTab.hpp"
#include "ui/dialogs/OrderDialog.hpp"
#include <QMessageBox>
#include <QDateTime>
#include <fmt/format.h>

namespace TapeInventory {
namespace UI {

BangKeoInTab::BangKeoInTab(QWidget* parent)
    : BaseTab(parent)
    , model(std::make_unique<QStandardItemModel>(this))
    , repository(std::make_unique<Database::BangKeoInRepository>())
{
    setupModel();
    setupTableView();
    refreshData();
}

void BangKeoInTab::setupModel() {
    model->setColumnCount(COLUMN_COUNT);
    model->setHorizontalHeaderLabels({
        tr("ID"),
        tr("Date"),
        tr("Name"),
        tr("Due Date"),
        tr("Dimensions"),
        tr("Quantity"),
        tr("Tape Color"),
        tr("Unit Price"),
        tr("Total Price"),
        tr("Status")
    });
}

void BangKeoInTab::setupTableView() {
    tableView->setModel(model.get());
    
    // Set column widths
    tableView->setColumnWidth(ID, 100);
    tableView->setColumnWidth(DATE, 150);
    tableView->setColumnWidth(NAME, 200);
    tableView->setColumnWidth(DUE_DATE, 150);
    tableView->setColumnWidth(DIMENSIONS, 150);
    tableView->setColumnWidth(QUANTITY, 100);
    tableView->setColumnWidth(TAPE_COLOR, 100);
    tableView->setColumnWidth(UNIT_PRICE, 100);
    tableView->setColumnWidth(TOTAL_PRICE, 100);
    tableView->setColumnWidth(STATUS, 100);
}

void BangKeoInTab::refreshData() {
    try {
        auto orders = repository->findAll();
        populateModel(orders);
    } catch (const std::exception& e) {
        QMessageBox::critical(this, tr("Error"),
            tr("Failed to load orders: %1").arg(e.what()));
    }
}

void BangKeoInTab::populateModel(const std::vector<Models::BangKeoInOrder>& orders) {
    model->removeRows(0, model->rowCount());
    
    for (const auto& order : orders) {
        QList<QStandardItem*> row;
        
        // ID
        row.append(new QStandardItem(QString::fromStdString(order.id)));
        
        // Date
        auto date = QDateTime::fromStdChrono(order.thoi_gian);
        row.append(new QStandardItem(date.toString("yyyy-MM-dd HH:mm")));
        
        // Name
        row.append(new QStandardItem(QString::fromStdString(order.ten_hang)));
        
        // Due Date
        auto dueDate = QDateTime::fromStdChrono(order.ngay_du_kien);
        row.append(new QStandardItem(dueDate.toString("yyyy-MM-dd")));
        
        // Dimensions
        QString dimensions = fmt::format("{} x {} x {} mm",
            order.quy_cach_mm, order.quy_cach_m, order.quy_cach_mic).c_str();
        row.append(new QStandardItem(dimensions));
        
        // Quantity
        row.append(new QStandardItem(QString::number(order.so_luong)));
        
        // Tape Color
        row.append(new QStandardItem(QString::fromStdString(order.mau_keo)));
        
        // Unit Price
        row.append(new QStandardItem(QString::number(order.don_gia_ban, 'f', 2)));
        
        // Total Price
        row.append(new QStandardItem(QString::number(order.thanh_tien_ban, 'f', 2)));
        
        // Status
        QString status = order.da_giao ? tr("Delivered") : tr("Pending");
        if (order.da_tat_toan) {
            status += tr(" (Paid)");
        }
        row.append(new QStandardItem(status));
        
        model->appendRow(row);
    }
}

void BangKeoInTab::onAdd() {
    OrderDialog dialog(this);
    
    if (dialog.exec() == QDialog::Accepted) {
        try {
            auto order = dialog.getOrder();
            repository->save(order);
            refreshData();
        } catch (const std::exception& e) {
            QMessageBox::critical(this, tr("Error"),
                tr("Failed to save order: %1").arg(e.what()));
        }
    }
}

void BangKeoInTab::onEdit() {
    auto selection = tableView->selectionModel()->selectedRows();
    if (selection.isEmpty()) {
        QMessageBox::warning(this, tr("Edit Order"),
            tr("Please select an order to edit."));
        return;
    }
    
    auto row = selection.first().row();
    QString orderId = model->data(model->index(row, ID)).toString();
    
    try {
        auto order = repository->findById(orderId.toStdString());
        if (!order) {
            QMessageBox::critical(this, tr("Error"),
                tr("Order not found."));
            return;
        }
        
        OrderDialog dialog(this);
        dialog.setOrder(*order);
        
        if (dialog.exec() == QDialog::Accepted) {
            auto updatedOrder = dialog.getOrder();
            repository->update(updatedOrder);
            refreshData();
        }
    } catch (const std::exception& e) {
        QMessageBox::critical(this, tr("Error"),
            tr("Failed to edit order: %1").arg(e.what()));
    }
}

void BangKeoInTab::onDelete() {
    auto selection = tableView->selectionModel()->selectedRows();
    if (selection.isEmpty()) {
        QMessageBox::warning(this, tr("Delete Order"),
            tr("Please select an order to delete."));
        return;
    }
    
    auto row = selection.first().row();
    QString orderId = model->data(model->index(row, ID)).toString();
    
    auto response = QMessageBox::question(this, tr("Confirm Delete"),
        tr("Are you sure you want to delete order %1?").arg(orderId),
        QMessageBox::Yes | QMessageBox::No);
        
    if (response == QMessageBox::Yes) {
        try {
            repository->remove(orderId.toStdString());
            refreshData();
        } catch (const std::exception& e) {
            QMessageBox::critical(this, tr("Error"),
                tr("Failed to delete order: %1").arg(e.what()));
        }
    }
}

void BangKeoInTab::onSearch(const QString& text) {
    for (int row = 0; row < model->rowCount(); ++row) {
        bool match = false;
        
        // Search through all columns
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