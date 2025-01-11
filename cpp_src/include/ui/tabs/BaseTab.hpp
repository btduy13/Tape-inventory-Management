#pragma once

#include <QWidget>
#include <QVBoxLayout>
#include <QTableView>
#include <QToolBar>
#include <QPushButton>
#include <QLineEdit>
#include <memory>
#include "database/Database.hpp"

namespace TapeInventory {
namespace UI {

class BaseTab : public QWidget {
    Q_OBJECT

public:
    explicit BaseTab(QWidget* parent = nullptr);
    virtual ~BaseTab() = default;

protected:
    virtual void setupUI();
    virtual void createToolBar();
    virtual void createTable();
    virtual void refreshData() = 0;
    virtual void onAdd() = 0;
    virtual void onEdit() = 0;
    virtual void onDelete() = 0;
    virtual void onSearch(const QString& text) = 0;

    QVBoxLayout* mainLayout;
    QToolBar* toolBar;
    QTableView* tableView;
    QLineEdit* searchBox;
    QPushButton* addButton;
    QPushButton* editButton;
    QPushButton* deleteButton;
};

} // namespace UI
} // namespace TapeInventory 