#pragma once

#include <QDialog>
#include <QDateEdit>
#include <QComboBox>
#include <QCheckBox>
#include <QLineEdit>
#include <memory>
#include "services/ReportService.hpp"

namespace TapeInventory {
namespace UI {

class ReportDialog : public QDialog {
    Q_OBJECT

public:
    explicit ReportDialog(QWidget* parent = nullptr);
    Services::ReportService::ReportOptions getReportOptions() const;

private slots:
    void onAccept();
    void onReject();
    void onBrowse();
    void onReportTypeChanged(int index);

private:
    void setupUI();
    void createFormLayout();
    void createButtons();
    void validateInputs();
    
    // Form fields
    QComboBox* reportTypeCombo;
    QComboBox* formatCombo;
    QDateEdit* startDateEdit;
    QDateEdit* endDateEdit;
    QLineEdit* outputPathEdit;
    QCheckBox* includeChartsCheck;
    QCheckBox* includeDetailsCheck;
};

} // namespace UI
} // namespace TapeInventory 