"""
Script để thiết lập GitHub repository và tạo release đầu tiên
"""
import os
import subprocess
import sys

def setup_git_repo():
    """Thiết lập Git repository"""
    print("🔧 Thiết lập Git repository...")
    
    try:
        # Khởi tạo git nếu chưa có
        if not os.path.exists(".git"):
            subprocess.run(["git", "init"], check=True)
            print("✅ Khởi tạo Git repository")
        
        # Thêm remote origin
        github_url = input("Nhập URL GitHub repository (ví dụ: https://github.com/username/repo.git): ").strip()
        
        if github_url:
            try:
                subprocess.run(["git", "remote", "add", "origin", github_url], check=True)
                print("✅ Thêm remote origin")
            except subprocess.CalledProcessError:
                # Nếu đã có remote, cập nhật
                subprocess.run(["git", "remote", "set-url", "origin", github_url], check=True)
                print("✅ Cập nhật remote origin")
        
        # Tạo .gitignore nếu chưa có
        if not os.path.exists(".gitignore"):
            gitignore_content = """
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
venv/
env/
ENV/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Application specific
*.db
*.log
logs/
backup/
temp/
tempCodeRunnerFile.py

# Build artifacts
build/
dist/
*.spec
*.exe
installer/
Output/
"""
            with open(".gitignore", "w", encoding="utf-8") as f:
                f.write(gitignore_content.strip())
            print("✅ Tạo .gitignore")
        
        # Add và commit
        subprocess.run(["git", "add", "."], check=True)
        subprocess.run(["git", "commit", "-m", "Initial commit: Tape Inventory Management System"], check=True)
        print("✅ Commit files")
        
        # Push lên GitHub
        subprocess.run(["git", "push", "-u", "origin", "master"], check=True)
        print("✅ Push lên GitHub")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Lỗi Git: {e}")
        return False
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        return False

def create_readme():
    """Tạo README.md"""
    readme_content = """# Tape Inventory Management System

Hệ thống quản lý kho băng keo với giao diện hiện đại và tính năng tự động cập nhật.

## Tính năng chính

- 📦 Quản lý đơn hàng băng keo
- 📊 Dashboard thống kê
- 📈 Báo cáo xuất Excel/PDF
- 🔄 Tự động cập nhật
- 💾 Backup dữ liệu tự động

## Cài đặt

1. Tải file `TapeInventoryManagement_Setup.exe` từ [Releases](https://github.com/your-username/tape-inventory-management/releases)
2. Chạy installer với quyền Administrator
3. Khởi động ứng dụng từ Start Menu hoặc Desktop

## Sử dụng

1. Khởi động ứng dụng
2. Sử dụng menu "Kiểm tra cập nhật" để cập nhật phiên bản mới nhất
3. Tất cả dữ liệu được lưu tự động

## Yêu cầu hệ thống

- Windows 10/11
- .NET Framework 4.7.2 hoặc cao hơn
- Kết nối Internet (để cập nhật)

## Phát triển

```bash
# Clone repository
git clone https://github.com/your-username/tape-inventory-management.git
cd tape-inventory-management

# Cài đặt dependencies
pip install -r requirements.txt

# Chạy ứng dụng
python main.py

# Build installer
python build_release.py
```

## Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng tạo Pull Request hoặc Issue.

## License

MIT License - Xem file [LICENSE](LICENSE) để biết chi tiết.
"""
    
    with open("README.md", "w", encoding="utf-8") as f:
        f.write(readme_content)
    
    print("✅ Tạo README.md")

def main():
    """Main function"""
    print("=== Thiết lập GitHub Repository ===")
    
    # Tạo README
    create_readme()
    
    # Thiết lập Git
    if setup_git_repo():
        print("\n🎉 Hoàn thành! Repository đã được thiết lập.")
        print("\n📝 Bước tiếp theo:")
        print("1. Tạo GitHub Personal Access Token tại: https://github.com/settings/tokens")
        print("2. Chạy: python publish_to_github.py")
        print("3. Nhập thông tin GitHub để publish ứng dụng")
    else:
        print("\n❌ Có lỗi xảy ra. Vui lòng kiểm tra lại.")

if __name__ == "__main__":
    main()
