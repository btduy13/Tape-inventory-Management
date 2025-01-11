#include "ui/dialogs/ReportDialog.hpp"
#include <QFormLayout>
#include <QVBoxLayout>
#include <QDialogButtonBox>
#include <QPushButton>
#include <QLabel>
#include <QFileDialog>
#include <QMessageBox>

namespace TapeInventory {
namespace UI {

ReportDialog::ReportDialog(QWidget* parent)
    : QDialog(parent)
{
    setupUI();
}

void ReportDialog::setupUI() {
    setWindowTitle(tr("Generate Report"));
    setMinimumWidth(400);

    auto mainLayout = new QVBoxLayout(this);
    
    // Create form layout
    createFormLayout();
    
    // Create buttons
    createButtons();
}

void ReportDialog::createFormLayout() {
    auto formGroup = new QGroupBox(tr("Report Options"), this);
    auto formLayout = new QFormLayout(formGroup);
    
    // Report type
    reportTypeCombo = new QComboBox(this);
    reportTypeCombo->addItems({
        tr("Daily Sales"),
        tr("Monthly Sales"),
        tr("Inventory Status"),
        tr("Customer Summary"),
        tr("Profit & Loss")
    });
    formLayout->addRow(tr("Report Type:"), reportTypeCombo);
    
    // Format
    formatCombo = new QComboBox(this);
    formatCombo->addItems({
        tr("PDF"),
        tr("Excel"),
        tr("HTML")
    });
    formLayout->addRow(tr("Format:"), formatCombo);
    
    // Date range
    startDateEdit = new QDateEdit(this);
    startDateEdit->setCalendarPopup(true);
    startDateEdit->setDate(QDate::currentDate().addDays(-30));
    formLayout->addRow(tr("Start Date:"), startDateEdit);
    
    endDateEdit = new QDateEdit(this);
    endDateEdit->setCalendarPopup(true);
    endDateEdit->setDate(QDate::currentDate());
    formLayout->addRow(tr("End Date:"), endDateEdit);
    
    // Output path
    auto pathLayout = new QHBoxLayout;
    outputPathEdit = new QLineEdit(this);
    pathLayout->addWidget(outputPathEdit);
    
    auto browseButton = new QPushButton(tr("Browse"), this);
    pathLayout->addWidget(browseButton);
    formLayout->addRow(tr("Output Path:"), pathLayout);
    
    // Options
    includeChartsCheck = new QCheckBox(tr("Include Charts"), this);
    includeChartsCheck->setChecked(true);
    formLayout->addRow("", includeChartsCheck);
    
    includeDetailsCheck = new QCheckBox(tr("Include Details"), this);
    includeDetailsCheck->setChecked(true);
    formLayout->addRow("", includeDetailsCheck);
    
    // Connect signals
    connect(browseButton, &QPushButton::clicked, this, &ReportDialog::onBrowse);
    connect(reportTypeCombo, QOverload<int>::of(&QComboBox::currentIndexChanged),
        this, &ReportDialog::onReportTypeChanged);
        
    mainLayout->addWidget(formGroup);
}

void ReportDialog::createButtons() {
    auto buttonBox = new QDialogButtonBox(
        QDialogButtonBox::Ok | QDialogButtonBox::Cancel,
        Qt::Horizontal, this);
        
    connect(buttonBox, &QDialogButtonBox::accepted, this, &ReportDialog::onAccept);
    connect(buttonBox, &QDialogButtonBox::rejected, this, &ReportDialog::onReject);
    
    mainLayout->addWidget(buttonBox);
}

Services::ReportService::ReportOptions ReportDialog::getReportOptions() const {
    Services::ReportService::ReportOptions options;
    
    // Set report type
    options.type = static_cast<Services::ReportService::ReportType>(
        reportTypeCombo->currentIndex());
    
    // Set format
    options.format = static_cast<Services::ReportService::ReportFormat>(
        formatCombo->currentIndex());
    
    // Set date range
    options.startDate = startDateEdit->date();
    options.endDate = endDateEdit->date();
    
    // Set output path
    options.outputPath = outputPathEdit->text().toStdString();
    
    // Set options
    options.includeCharts = includeChartsCheck->isChecked();
    options.includeDetails = includeDetailsCheck->isChecked();
    
    return options;
}

void ReportDialog::validateInputs() {
    if (outputPathEdit->text().isEmpty()) {
        throw std::runtime_error("Output path is required");
    }
    
    if (startDateEdit->date() > endDateEdit->date()) {
        throw std::runtime_error("Start date must be before end date");
    }
}

void ReportDialog::onAccept() {
    try {
        validateInputs();
        accept();
    } catch (const std::exception& e) {
        QMessageBox::warning(this, tr("Validation Error"), e.what());
    }
}

void ReportDialog::onReject() {
    reject();
}

void ReportDialog::onBrowse() {
    QString defaultSuffix;
    QString filter;
    
    // Set appropriate filter based on selected format
    switch (static_cast<Services::ReportService::ReportFormat>(
        formatCombo->currentIndex())) {
        case Services::ReportService::ReportFormat::PDF:
            defaultSuffix = "pdf";
            filter = tr("PDF Files (*.pdf)");
            break;
        case Services::ReportService::ReportFormat::EXCEL:
            defaultSuffix = "xlsx";
            filter = tr("Excel Files (*.xlsx)");
            break;
        case Services::ReportService::ReportFormat::HTML:
            defaultSuffix = "html";
            filter = tr("HTML Files (*.html)");
            break;
    }
    
    QString fileName = QFileDialog::getSaveFileName(this,
        tr("Save Report"),
        QString(),
        filter);
        
    if (!fileName.isEmpty()) {
        // Add extension if not present
        if (!fileName.endsWith("." + defaultSuffix)) {
            fileName += "." + defaultSuffix;
        }
        outputPathEdit->setText(fileName);
    }
}

void ReportDialog::onReportTypeChanged(int index) {
    // Enable/disable date range based on report type
    bool showDateRange = index != static_cast<int>(
        Services::ReportService::ReportType::INVENTORY_STATUS);
        
    startDateEdit->setEnabled(showDateRange);
    endDateEdit->setEnabled(showDateRange);
}

} // namespace UI
} // namespace TapeInventory 