#pragma once

#include <QMainWindow>
#include <QMenuBar>
#include <QStatusBar>
#include <QString>

class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow() override = default;

private slots:
    void openOrderForm();
    void generateReport();
    void handleDatabaseConnection();

private:
    void setupUI();
    void createMenus();
    void createStatusBar();
    void initializeDatabase();

    QMenuBar *menuBar;
    QStatusBar *statusBar;
    QString databaseUrl;
}; 