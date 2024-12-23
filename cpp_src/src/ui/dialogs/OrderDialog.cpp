#include "ui/dialogs/OrderDialog.hpp"
#include <QFormLayout>
#include <QVBoxLayout>
#include <QDialogButtonBox>
#include <QGroupBox>
#include <QLabel>
#include <QMessageBox>
#include <chrono>

namespace TapeInventory {
namespace UI {

OrderDialog::OrderDialog(QWidget* parent)
    : QDialog(parent)
{
    setupUI();
    connectSignals();
}

void OrderDialog::setupUI() {
    setWindowTitle(tr("Order Details"));
    setMinimumWidth(500);

    auto mainLayout = new QVBoxLayout(this);
    
    // Create form groups
    auto basicInfoGroup = new QGroupBox(tr("Basic Information"), this);
    auto dimensionsGroup = new QGroupBox(tr("Dimensions"), this);
    auto quantitiesGroup = new QGroupBox(tr("Quantities and Fees"), this);
    auto pricingGroup = new QGroupBox(tr("Pricing"), this);
    auto additionalInfoGroup = new QGroupBox(tr("Additional Information"), this);
    auto statusGroup = new QGroupBox(tr("Status"), this);
    
    // Basic Information
    auto basicLayout = new QFormLayout(basicInfoGroup);
    idEdit = new QLineEdit(this);
    idEdit->setReadOnly(true);
    nameEdit = new QLineEdit(this);
    dateEdit = new QDateEdit(this);
    dueDateEdit = new QDateEdit(this);
    
    basicLayout->addRow(tr("ID:"), idEdit);
    basicLayout->addRow(tr("Name:"), nameEdit);
    basicLayout->addRow(tr("Date:"), dateEdit);
    basicLayout->addRow(tr("Due Date:"), dueDateEdit);
    
    // Dimensions
    auto dimensionsLayout = new QFormLayout(dimensionsGroup);
    widthSpinBox = new QDoubleSpinBox(this);
    lengthSpinBox = new QDoubleSpinBox(this);
    thicknessSpinBox = new QDoubleSpinBox(this);
    rollsSpinBox = new QDoubleSpinBox(this);
    
    widthSpinBox->setRange(0, 10000);
    lengthSpinBox->setRange(0, 10000);
    thicknessSpinBox->setRange(0, 1000);
    rollsSpinBox->setRange(0, 1000);
    
    dimensionsLayout->addRow(tr("Width (mm):"), widthSpinBox);
    dimensionsLayout->addRow(tr("Length (m):"), lengthSpinBox);
    dimensionsLayout->addRow(tr("Thickness (mic):"), thicknessSpinBox);
    dimensionsLayout->addRow(tr("Rolls:"), rollsSpinBox);
    
    // Quantities and Fees
    auto quantitiesLayout = new QFormLayout(quantitiesGroup);
    quantitySpinBox = new QDoubleSpinBox(this);
    quantityFeeSpinBox = new QDoubleSpinBox(this);
    tapeColorEdit = new QLineEdit(this);
    tapeFeeSpinBox = new QDoubleSpinBox(this);
    colorFeeSpinBox = new QDoubleSpinBox(this);
    sizeFeeSpinBox = new QDoubleSpinBox(this);
    cutFeeSpinBox = new QDoubleSpinBox(this);
    
    quantitySpinBox->setRange(0, 1000000);
    quantityFeeSpinBox->setRange(0, 1000000);
    tapeFeeSpinBox->setRange(0, 1000000);
    colorFeeSpinBox->setRange(0, 1000000);
    sizeFeeSpinBox->setRange(0, 1000000);
    cutFeeSpinBox->setRange(0, 1000000);
    
    quantitiesLayout->addRow(tr("Quantity:"), quantitySpinBox);
    quantitiesLayout->addRow(tr("Quantity Fee:"), quantityFeeSpinBox);
    quantitiesLayout->addRow(tr("Tape Color:"), tapeColorEdit);
    quantitiesLayout->addRow(tr("Tape Fee:"), tapeFeeSpinBox);
    quantitiesLayout->addRow(tr("Color Fee:"), colorFeeSpinBox);
    quantitiesLayout->addRow(tr("Size Fee:"), sizeFeeSpinBox);
    quantitiesLayout->addRow(tr("Cut Fee:"), cutFeeSpinBox);
    
    // Pricing
    auto pricingLayout = new QFormLayout(pricingGroup);
    costPriceSpinBox = new QDoubleSpinBox(this);
    basePriceSpinBox = new QDoubleSpinBox(this);
    sellingPriceSpinBox = new QDoubleSpinBox(this);
    depositSpinBox = new QDoubleSpinBox(this);
    
    costPriceSpinBox->setRange(0, 1000000000);
    basePriceSpinBox->setRange(0, 1000000000);
    sellingPriceSpinBox->setRange(0, 1000000000);
    depositSpinBox->setRange(0, 1000000000);
    
    pricingLayout->addRow(tr("Cost Price:"), costPriceSpinBox);
    pricingLayout->addRow(tr("Base Price:"), basePriceSpinBox);
    pricingLayout->addRow(tr("Selling Price:"), sellingPriceSpinBox);
    pricingLayout->addRow(tr("Deposit:"), depositSpinBox);
    
    // Additional Information
    auto additionalLayout = new QFormLayout(additionalInfoGroup);
    paperTypeEdit = new QLineEdit(this);
    packagingEdit = new QLineEdit(this);
    collaboratorEdit = new QLineEdit(this);
    commissionSpinBox = new QDoubleSpinBox(this);
    
    commissionSpinBox->setRange(0, 100);
    commissionSpinBox->setSuffix("%");
    
    additionalLayout->addRow(tr("Paper Type:"), paperTypeEdit);
    additionalLayout->addRow(tr("Packaging:"), packagingEdit);
    additionalLayout->addRow(tr("Collaborator:"), collaboratorEdit);
    additionalLayout->addRow(tr("Commission:"), commissionSpinBox);
    
    // Status
    auto statusLayout = new QFormLayout(statusGroup);
    deliveredCheckBox = new QCheckBox(tr("Delivered"), this);
    paidCheckBox = new QCheckBox(tr("Paid"), this);
    
    statusLayout->addRow(deliveredCheckBox);
    statusLayout->addRow(paidCheckBox);
    
    // Add all groups to main layout
    mainLayout->addWidget(basicInfoGroup);
    mainLayout->addWidget(dimensionsGroup);
    mainLayout->addWidget(quantitiesGroup);
    mainLayout->addWidget(pricingGroup);
    mainLayout->addWidget(additionalInfoGroup);
    mainLayout->addWidget(statusGroup);
    
    // Add dialog buttons
    auto buttonBox = new QDialogButtonBox(
        QDialogButtonBox::Ok | QDialogButtonBox::Cancel,
        Qt::Horizontal, this);
    mainLayout->addWidget(buttonBox);
    
    connect(buttonBox, &QDialogButtonBox::accepted, this, &OrderDialog::onAccept);
    connect(buttonBox, &QDialogButtonBox::rejected, this, &OrderDialog::onReject);
}

void OrderDialog::connectSignals() {
    // Connect price calculation signals
    connect(quantitySpinBox, QOverload<double>::of(&QDoubleSpinBox::valueChanged),
        this, &OrderDialog::updateTotalPrice);
    connect(sellingPriceSpinBox, QOverload<double>::of(&QDoubleSpinBox::valueChanged),
        this, &OrderDialog::updateTotalPrice);
}

void OrderDialog::updateTotalPrice() {
    double total = quantitySpinBox->value() * sellingPriceSpinBox->value();
    basePriceSpinBox->setValue(total);
}

void OrderDialog::setOrder(const Models::BangKeoInOrder& order) {
    idEdit->setText(QString::fromStdString(order.id));
    nameEdit->setText(QString::fromStdString(order.ten_hang));
    dateEdit->setDateTime(QDateTime::fromStdChrono(order.thoi_gian));
    dueDateEdit->setDateTime(QDateTime::fromStdChrono(order.ngay_du_kien));
    
    widthSpinBox->setValue(order.quy_cach_mm);
    lengthSpinBox->setValue(order.quy_cach_m);
    thicknessSpinBox->setValue(order.quy_cach_mic);
    rollsSpinBox->setValue(order.cuon_cay);
    
    quantitySpinBox->setValue(order.so_luong);
    quantityFeeSpinBox->setValue(order.phi_sl);
    tapeColorEdit->setText(QString::fromStdString(order.mau_keo));
    tapeFeeSpinBox->setValue(order.phi_keo);
    colorFeeSpinBox->setValue(order.phi_mau);
    sizeFeeSpinBox->setValue(order.phi_size);
    cutFeeSpinBox->setValue(order.phi_cat);
    
    costPriceSpinBox->setValue(order.don_gia_von);
    basePriceSpinBox->setValue(order.don_gia_goc);
    sellingPriceSpinBox->setValue(order.don_gia_ban);
    depositSpinBox->setValue(order.tien_coc);
    
    paperTypeEdit->setText(QString::fromStdString(order.loi_giay));
    packagingEdit->setText(QString::fromStdString(order.thung_bao));
    collaboratorEdit->setText(QString::fromStdString(order.ctv));
    commissionSpinBox->setValue(order.hoa_hong);
    
    deliveredCheckBox->setChecked(order.da_giao);
    paidCheckBox->setChecked(order.da_tat_toan);
}

Models::BangKeoInOrder OrderDialog::getOrder() const {
    Models::BangKeoInOrder order;
    
    order.id = idEdit->text().toStdString();
    order.ten_hang = nameEdit->text().toStdString();
    order.thoi_gian = dateEdit->dateTime().toStdChrono();
    order.ngay_du_kien = dueDateEdit->dateTime().toStdChrono();
    
    order.quy_cach_mm = widthSpinBox->value();
    order.quy_cach_m = lengthSpinBox->value();
    order.quy_cach_mic = thicknessSpinBox->value();
    order.cuon_cay = rollsSpinBox->value();
    
    order.so_luong = quantitySpinBox->value();
    order.phi_sl = quantityFeeSpinBox->value();
    order.mau_keo = tapeColorEdit->text().toStdString();
    order.phi_keo = tapeFeeSpinBox->value();
    order.phi_mau = colorFeeSpinBox->value();
    order.phi_size = sizeFeeSpinBox->value();
    order.phi_cat = cutFeeSpinBox->value();
    
    order.don_gia_von = costPriceSpinBox->value();
    order.don_gia_goc = basePriceSpinBox->value();
    order.don_gia_ban = sellingPriceSpinBox->value();
    order.tien_coc = depositSpinBox->value();
    
    order.loi_giay = paperTypeEdit->text().toStdString();
    order.thung_bao = packagingEdit->text().toStdString();
    order.ctv = collaboratorEdit->text().toStdString();
    order.hoa_hong = commissionSpinBox->value();
    
    order.da_giao = deliveredCheckBox->isChecked();
    order.da_tat_toan = paidCheckBox->isChecked();
    
    return order;
}

void OrderDialog::validateInputs() {
    if (nameEdit->text().isEmpty()) {
        throw std::runtime_error("Name is required");
    }
    
    if (quantitySpinBox->value() <= 0) {
        throw std::runtime_error("Quantity must be greater than 0");
    }
    
    if (sellingPriceSpinBox->value() <= 0) {
        throw std::runtime_error("Selling price must be greater than 0");
    }
}

void OrderDialog::onAccept() {
    try {
        validateInputs();
        accept();
    } catch (const std::exception& e) {
        QMessageBox::warning(this, tr("Validation Error"), e.what());
    }
}

void OrderDialog::onReject() {
    reject();
}

} // namespace UI
} // namespace TapeInventory 