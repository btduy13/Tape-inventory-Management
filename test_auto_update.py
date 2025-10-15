"""
Test script cho auto-update system
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.utils.version_manager import VersionManager
from src.utils.auto_update import AutoUpdater

def test_version_manager():
    """Test VersionManager"""
    print("🧪 Testing VersionManager...")
    
    vm = VersionManager("1.0.0")
    
    # Test version comparison
    print(f"✓ Current version: {vm.current_version}")
    
    # Test version comparison
    assert vm._compare_versions("1.0.1", "1.0.0") == 1
    assert vm._compare_versions("1.0.0", "1.0.1") == -1
    assert vm._compare_versions("1.0.0", "1.0.0") == 0
    assert vm._compare_versions("2.0.0", "1.9.9") == 1
    print("✓ Version comparison working")
    
    # Test getting latest version (requires internet)
    try:
        latest_info = vm.get_latest_version_info()
        if latest_info:
            print(f"✓ Latest version: {latest_info['version']}")
            print(f"✓ Download URL: {latest_info['download_url']}")
        else:
            print("⚠️  No latest version info (check internet connection)")
    except Exception as e:
        print(f"⚠️  Could not get latest version: {e}")
    
    print("✅ VersionManager test completed\n")

def test_auto_updater():
    """Test AutoUpdater"""
    print("🧪 Testing AutoUpdater...")
    
    vm = VersionManager("1.0.0")
    updater = AutoUpdater(vm, check_interval_hours=1)
    
    # Test should_check_for_updates
    should_check = updater.should_check_for_updates()
    print(f"✓ Should check for updates: {should_check}")
    
    # Test silent check
    try:
        has_update = updater.check_for_updates_silent()
        print(f"✓ Has update available: {has_update}")
    except Exception as e:
        print(f"⚠️  Silent check failed: {e}")
    
    print("✅ AutoUpdater test completed\n")

def test_configuration():
    """Test configuration"""
    print("🧪 Testing Configuration...")
    
    # Check if all required files exist
    required_files = [
        "src/utils/version_manager.py",
        "src/utils/auto_update.py", 
        "src/ui/forms/update_dialog.py",
        "main.py",
        "requirements.txt"
    ]
    
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"✓ {file_path} exists")
        else:
            print(f"❌ {file_path} missing")
    
    # Check requirements
    with open("requirements.txt", "r") as f:
        content = f.read()
        if "requests" in content:
            print("✓ requests dependency added")
        else:
            print("❌ requests dependency missing")
    
    print("✅ Configuration test completed\n")

def main():
    """Main test function"""
    print("🚀 Auto-Update System Test\n")
    
    try:
        test_configuration()
        test_version_manager()
        test_auto_updater()
        
        print("🎉 All tests completed!")
        print("\n📝 Next steps:")
        print("1. Configure GitHub repository in version_manager.py")
        print("2. Run: python setup_github_release.py")
        print("3. Run: python publish_to_github.py")
        print("4. Test auto-update in your application")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
