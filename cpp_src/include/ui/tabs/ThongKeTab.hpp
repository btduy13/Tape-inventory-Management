#pragma once

#include "ui/tabs/BaseTab.hpp"
#include <QStandardItemModel>
#include <QChart>
#include <QChartView>
#include <QDateEdit>
#include <QComboBox>
#include <memory>

QT_CHARTS_USE_NAMESPACE

namespace TapeInventory {
namespace UI {

class ThongKeTab : public BaseTab {
    Q_OBJECT

public:
    explicit ThongKeTab(QWidget* parent = nullptr);
    ~ThongKeTab() override = default;

protected:
    void refreshData() override;
    void onAdd() override { /* Not used */ }
    void onEdit() override { /* Not used */ }
    void onDelete() override { /* Not used */ }
    void onSearch(const QString& text) override;

private slots:
    void onDateRangeChanged();
    void onChartTypeChanged(int index);
    void onMetricChanged(int index);

private:
    void setupUI() override;
    void createFilterControls();
    void createCharts();
    void updateCharts();
    void updateSummaryTable();
    
    // Filter controls
    QDateEdit* startDateEdit;
    QDateEdit* endDateEdit;
    QComboBox* chartTypeCombo;
    QComboBox* metricCombo;
    
    // Chart views
    QChartView* revenueChartView;
    QChartView* orderCountChartView;
    QChartView* profitChartView;
    
    // Data models
    std::unique_ptr<QStandardItemModel> summaryModel;
    
    // Repositories
    std::unique_ptr<Database::BangKeoInRepository> bangKeoInRepo;
    std::unique_ptr<Database::TrucInRepository> trucInRepo;
    std::unique_ptr<Database::BangKeoRepository> bangKeoRepo;
    
    // Chart types
    enum ChartType {
        DAILY,
        WEEKLY,
        MONTHLY,
        YEARLY
    };
    
    // Metrics
    enum Metric {
        REVENUE,
        ORDER_COUNT,
        PROFIT,
        ALL
    };
};

} // namespace UI
} // namespace TapeInventory 