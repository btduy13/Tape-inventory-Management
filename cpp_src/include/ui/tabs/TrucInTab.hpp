#pragma once

#include "ui/tabs/BaseTab.hpp"
#include <QStandardItemModel>
#include <memory>

namespace TapeInventory {
namespace UI {

class TrucInTab : public BaseTab {
    Q_OBJECT

public:
    explicit TrucInTab(QWidget* parent = nullptr);
    ~TrucInTab() override = default;

protected:
    void refreshData() override;
    void onAdd() override;
    void onEdit() override;
    void onDelete() override;
    void onSearch(const QString& text) override;

private:
    void setupModel();
    void populateModel(const std::vector<Models::TrucInOrder>& orders);
    void setupTableView();
    
    std::unique_ptr<QStandardItemModel> model;
    std::unique_ptr<Database::TrucInRepository> repository;
    
    // Column indices for the table
    enum Columns {
        ID,
        DATE,
        NAME,
        DUE_DATE,
        MATERIAL,
        DIAMETER,
        LENGTH,
        QUANTITY,
        UNIT_PRICE,
        TOTAL_PRICE,
        STATUS,
        COLUMN_COUNT
    };
};

} // namespace UI
} // namespace TapeInventory 