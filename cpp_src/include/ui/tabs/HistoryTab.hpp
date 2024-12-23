#pragma once

#include "ui/tabs/BaseTab.hpp"
#include <QStandardItemModel>
#include <memory>

namespace TapeInventory {
namespace UI {

class HistoryTab : public BaseTab {
    Q_OBJECT

public:
    explicit HistoryTab(QWidget* parent = nullptr);
    ~HistoryTab() override = default;

protected:
    void refreshData() override;
    void onAdd() override { /* Not used */ }
    void onEdit() override { /* Not used */ }
    void onDelete() override { /* Not used */ }
    void onSearch(const QString& text) override;

private:
    void setupModel();
    void setupTableView();
    void populateModel();
    
    std::unique_ptr<QStandardItemModel> model;
    std::unique_ptr<Database::BangKeoInRepository> bangKeoInRepo;
    std::unique_ptr<Database::TrucInRepository> trucInRepo;
    std::unique_ptr<Database::BangKeoRepository> bangKeoRepo;
    
    // Column indices for the table
    enum Columns {
        DATE,
        TYPE,
        NAME,
        DETAILS,
        QUANTITY,
        TOTAL_PRICE,
        STATUS,
        COLUMN_COUNT
    };
};

} // namespace UI
} // namespace TapeInventory 