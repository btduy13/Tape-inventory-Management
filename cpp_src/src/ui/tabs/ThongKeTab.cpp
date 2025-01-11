#include "ui/tabs/ThongKeTab.hpp"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QGroupBox>
#include <QLabel>
#include <QLineSeries>
#include <QBarSeries>
#include <QBarSet>
#include <QDateTimeAxis>
#include <QValueAxis>
#include <QBarCategoryAxis>
#include <QMessageBox>
#include <fmt/format.h>

namespace TapeInventory {
namespace UI {

ThongKeTab::ThongKeTab(QWidget* parent)
    : BaseTab(parent)
    , summaryModel(std::make_unique<QStandardItemModel>(this))
    , bangKeoInRepo(std::make_unique<Database::BangKeoInRepository>())
    , trucInRepo(std::make_unique<Database::TrucInRepository>())
    , bangKeoRepo(std::make_unique<Database::BangKeoRepository>())
{
    setupUI();
    refreshData();
}

void ThongKeTab::setupUI() {
    // Hide unused base class buttons
    addButton->hide();
    editButton->hide();
    deleteButton->hide();
    
    // Create main layout
    auto layout = new QVBoxLayout(this);
    
    // Create filter controls
    createFilterControls();
    
    // Create charts
    createCharts();
    
    // Create summary table
    auto summaryGroup = new QGroupBox(tr("Summary"), this);
    auto summaryLayout = new QVBoxLayout(summaryGroup);
    
    tableView->setModel(summaryModel.get());
    summaryLayout->addWidget(tableView);
    
    // Add all components to main layout
    layout->addWidget(summaryGroup);
}

void ThongKeTab::createFilterControls() {
    auto filterGroup = new QGroupBox(tr("Filters"), this);
    auto filterLayout = new QHBoxLayout(filterGroup);
    
    // Date range
    auto dateLayout = new QHBoxLayout;
    dateLayout->addWidget(new QLabel(tr("From:")));
    startDateEdit = new QDateEdit(this);
    startDateEdit->setCalendarPopup(true);
    dateLayout->addWidget(startDateEdit);
    
    dateLayout->addWidget(new QLabel(tr("To:")));
    endDateEdit = new QDateEdit(this);
    endDateEdit->setCalendarPopup(true);
    dateLayout->addWidget(endDateEdit);
    
    // Set default date range to last 30 days
    auto today = QDate::currentDate();
    endDateEdit->setDate(today);
    startDateEdit->setDate(today.addDays(-30));
    
    filterLayout->addLayout(dateLayout);
    
    // Chart type combo
    filterLayout->addWidget(new QLabel(tr("Chart Type:")));
    chartTypeCombo = new QComboBox(this);
    chartTypeCombo->addItems({
        tr("Daily"),
        tr("Weekly"),
        tr("Monthly"),
        tr("Yearly")
    });
    filterLayout->addWidget(chartTypeCombo);
    
    // Metric combo
    filterLayout->addWidget(new QLabel(tr("Metric:")));
    metricCombo = new QComboBox(this);
    metricCombo->addItems({
        tr("Revenue"),
        tr("Order Count"),
        tr("Profit"),
        tr("All")
    });
    filterLayout->addWidget(metricCombo);
    
    // Connect signals
    connect(startDateEdit, &QDateEdit::dateChanged, this, &ThongKeTab::onDateRangeChanged);
    connect(endDateEdit, &QDateEdit::dateChanged, this, &ThongKeTab::onDateRangeChanged);
    connect(chartTypeCombo, QOverload<int>::of(&QComboBox::currentIndexChanged),
        this, &ThongKeTab::onChartTypeChanged);
    connect(metricCombo, QOverload<int>::of(&QComboBox::currentIndexChanged),
        this, &ThongKeTab::onMetricChanged);
    
    mainLayout->addWidget(filterGroup);
}

void ThongKeTab::createCharts() {
    auto chartsGroup = new QGroupBox(tr("Charts"), this);
    auto chartsLayout = new QHBoxLayout(chartsGroup);
    
    // Revenue chart
    revenueChartView = new QChartView(this);
    revenueChartView->setMinimumHeight(300);
    chartsLayout->addWidget(revenueChartView);
    
    // Order count chart
    orderCountChartView = new QChartView(this);
    orderCountChartView->setMinimumHeight(300);
    chartsLayout->addWidget(orderCountChartView);
    
    // Profit chart
    profitChartView = new QChartView(this);
    profitChartView->setMinimumHeight(300);
    chartsLayout->addWidget(profitChartView);
    
    mainLayout->addWidget(chartsGroup);
}

void ThongKeTab::refreshData() {
    try {
        updateCharts();
        updateSummaryTable();
    } catch (const std::exception& e) {
        QMessageBox::critical(this, tr("Error"),
            tr("Failed to refresh statistics: %1").arg(e.what()));
    }
}

void ThongKeTab::updateCharts() {
    // Get date range
    auto startDate = startDateEdit->date();
    auto endDate = endDateEdit->date();
    
    // Create series for each metric
    auto revenueSeries = new QLineSeries();
    auto orderCountSeries = new QLineSeries();
    auto profitSeries = new QLineSeries();
    
    // Get data from repositories
    auto bangKeoInOrders = bangKeoInRepo->findAll();
    auto trucInOrders = trucInRepo->findAll();
    auto bangKeoOrders = bangKeoRepo->findAll();
    
    // Process data based on chart type
    ChartType chartType = static_cast<ChartType>(chartTypeCombo->currentIndex());
    
    // TODO: Aggregate data based on chart type and create series
    
    // Create and set up charts
    auto revenueChart = new QChart();
    revenueChart->addSeries(revenueSeries);
    revenueChart->setTitle(tr("Revenue"));
    revenueChartView->setChart(revenueChart);
    
    auto orderCountChart = new QChart();
    orderCountChart->addSeries(orderCountSeries);
    orderCountChart->setTitle(tr("Order Count"));
    orderCountChartView->setChart(orderCountChart);
    
    auto profitChart = new QChart();
    profitChart->addSeries(profitSeries);
    profitChart->setTitle(tr("Profit"));
    profitChartView->setChart(profitChart);
}

void ThongKeTab::updateSummaryTable() {
    // Set up model headers
    summaryModel->setColumnCount(4);
    summaryModel->setHorizontalHeaderLabels({
        tr("Metric"),
        tr("Băng Keo In"),
        tr("Trục In"),
        tr("Băng Keo")
    });
    
    // Get data from repositories
    auto bangKeoInOrders = bangKeoInRepo->findAll();
    auto trucInOrders = trucInRepo->findAll();
    auto bangKeoOrders = bangKeoRepo->findAll();
    
    // Calculate metrics
    auto addRow = [this](const QString& metric,
        double bangKeoInValue,
        double trucInValue,
        double bangKeoValue) {
        QList<QStandardItem*> row;
        row.append(new QStandardItem(metric));
        row.append(new QStandardItem(QString::number(bangKeoInValue, 'f', 2)));
        row.append(new QStandardItem(QString::number(trucInValue, 'f', 2)));
        row.append(new QStandardItem(QString::number(bangKeoValue, 'f', 2)));
        summaryModel->appendRow(row);
    };
    
    // Total revenue
    double bangKeoInRevenue = 0;
    double trucInRevenue = 0;
    double bangKeoRevenue = 0;
    
    // Calculate totals
    for (const auto& order : bangKeoInOrders) {
        bangKeoInRevenue += order.thanh_tien_ban;
    }
    
    for (const auto& order : trucInOrders) {
        trucInRevenue += order.thanh_tien_ban;
    }
    
    for (const auto& order : bangKeoOrders) {
        bangKeoRevenue += order.thanh_tien_ban;
    }
    
    // Add rows to table
    addRow(tr("Total Revenue"), bangKeoInRevenue, trucInRevenue, bangKeoRevenue);
    addRow(tr("Order Count"),
        bangKeoInOrders.size(),
        trucInOrders.size(),
        bangKeoOrders.size());
    
    // Calculate and add other metrics...
}

void ThongKeTab::onSearch(const QString& text) {
    // Filter summary table
    for (int row = 0; row < summaryModel->rowCount(); ++row) {
        bool match = false;
        
        for (int col = 0; col < summaryModel->columnCount(); ++col) {
            QString cellText = summaryModel->data(summaryModel->index(row, col)).toString();
            if (cellText.contains(text, Qt::CaseInsensitive)) {
                match = true;
                break;
            }
        }
        
        tableView->setRowHidden(row, !match);
    }
}

void ThongKeTab::onDateRangeChanged() {
    refreshData();
}

void ThongKeTab::onChartTypeChanged(int index) {
    refreshData();
}

void ThongKeTab::onMetricChanged(int index) {
    // Show/hide charts based on selected metric
    Metric metric = static_cast<Metric>(index);
    
    revenueChartView->setVisible(metric == REVENUE || metric == ALL);
    orderCountChartView->setVisible(metric == ORDER_COUNT || metric == ALL);
    profitChartView->setVisible(metric == PROFIT || metric == ALL);
    
    refreshData();
}

} // namespace UI
} // namespace TapeInventory 