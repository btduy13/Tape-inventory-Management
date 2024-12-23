#include "ui/tabs/BaseTab.hpp"
#include <QHeaderView>
#include <QLabel>

namespace TapeInventory {
namespace UI {

BaseTab::BaseTab(QWidget* parent) : QWidget(parent) {
    setupUI();
}

void BaseTab::setupUI() {
    mainLayout = new QVBoxLayout(this);
    mainLayout->setContentsMargins(0, 0, 0, 0);
    mainLayout->setSpacing(0);

    createToolBar();
    createTable();
}

void BaseTab::createToolBar() {
    toolBar = new QToolBar(this);
    
    // Search box
    QLabel* searchLabel = new QLabel(tr("Search:"), this);
    toolBar->addWidget(searchLabel);
    
    searchBox = new QLineEdit(this);
    searchBox->setPlaceholderText(tr("Enter search terms..."));
    searchBox->setClearButtonEnabled(true);
    toolBar->addWidget(searchBox);
    
    toolBar->addSeparator();
    
    // CRUD buttons
    addButton = new QPushButton(tr("Add"), this);
    editButton = new QPushButton(tr("Edit"), this);
    deleteButton = new QPushButton(tr("Delete"), this);
    
    toolBar->addWidget(addButton);
    toolBar->addWidget(editButton);
    toolBar->addWidget(deleteButton);
    
    // Connect signals
    connect(searchBox, &QLineEdit::textChanged, this, &BaseTab::onSearch);
    connect(addButton, &QPushButton::clicked, this, &BaseTab::onAdd);
    connect(editButton, &QPushButton::clicked, this, &BaseTab::onEdit);
    connect(deleteButton, &QPushButton::clicked, this, &BaseTab::onDelete);
    
    mainLayout->addWidget(toolBar);
}

void BaseTab::createTable() {
    tableView = new QTableView(this);
    tableView->setSelectionBehavior(QAbstractItemView::SelectRows);
    tableView->setSelectionMode(QAbstractItemView::SingleSelection);
    tableView->setAlternatingRowColors(true);
    tableView->horizontalHeader()->setStretchLastSection(true);
    tableView->verticalHeader()->setVisible(false);
    tableView->setSortingEnabled(true);
    
    mainLayout->addWidget(tableView);
}

} // namespace UI
} // namespace TapeInventory 