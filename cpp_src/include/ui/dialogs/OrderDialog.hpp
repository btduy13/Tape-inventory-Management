#pragma once

#include <QDialog>
#include <QLineEdit>
#include <QDoubleSpinBox>
#include <QDateEdit>
#include <QCheckBox>
#include <QComboBox>
#include <memory>
#include "database/Models.hpp"

namespace TapeInventory {
namespace UI {

class OrderDialog : public QDialog {
    Q_OBJECT

public:
    explicit OrderDialog(QWidget* parent = nullptr);
    void setOrder(const Models::BangKeoInOrder& order);
    Models::BangKeoInOrder getOrder() const;

private slots:
    void onAccept();
    void onReject();
    void updateTotalPrice();

private:
    void setupUI();
    void createFormLayout();
    void createButtons();
    void connectSignals();
    void validateInputs();

    // Form fields
    QLineEdit* idEdit;
    QLineEdit* nameEdit;
    QDateEdit* dateEdit;
    QDateEdit* dueDateEdit;
    
    // Dimensions
    QDoubleSpinBox* widthSpinBox;
    QDoubleSpinBox* lengthSpinBox;
    QDoubleSpinBox* thicknessSpinBox;
    QDoubleSpinBox* rollsSpinBox;
    
    // Quantities and prices
    QDoubleSpinBox* quantitySpinBox;
    QDoubleSpinBox* quantityFeeSpinBox;
    QLineEdit* tapeColorEdit;
    QDoubleSpinBox* tapeFeeSpinBox;
    QDoubleSpinBox* colorFeeSpinBox;
    QDoubleSpinBox* sizeFeeSpinBox;
    QDoubleSpinBox* cutFeeSpinBox;
    
    // Pricing
    QDoubleSpinBox* costPriceSpinBox;
    QDoubleSpinBox* basePriceSpinBox;
    QDoubleSpinBox* sellingPriceSpinBox;
    QDoubleSpinBox* depositSpinBox;
    
    // Additional info
    QLineEdit* paperTypeEdit;
    QLineEdit* packagingEdit;
    QLineEdit* collaboratorEdit;
    QDoubleSpinBox* commissionSpinBox;
    
    // Status
    QCheckBox* deliveredCheckBox;
    QCheckBox* paidCheckBox;
};

} // namespace UI
} // namespace TapeInventory 