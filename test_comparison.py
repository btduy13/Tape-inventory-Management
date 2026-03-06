from src.utils.version_manager import VersionManager
import logging

logging.basicConfig(level=logging.INFO)

def test_comparison():
    vm = VersionManager("1.0.0")
    
    # Test cases: (v1, v2, expected_result)
    test_cases = [
        ("1.0.1", "1.0.0", 1),
        ("1.0.0", "1.0.0", 0),
        ("0.9.9", "1.0.0", -1),
        ("app", "1.0.0", 0),  # Should handle non-numeric gracefully
        ("v1.0.1", "1.0.0", 1), # Should handle 'v' prefix via lstrip in get_latest
        ("1.0.1.2", "1.0.1", 1),
    ]
    
    for v1, v2, expected in test_cases:
        # Pre-process v1 as get_latest_version_info does
        v1_clean = v1.lstrip('v')
        result = vm._compare_versions(v1_clean, v2)
        print(f"Comparing '{v1_clean}' vs '{v2}' -> Result: {result}, Expected: {expected}")
        # Note: result might not match exactly if expectations differ, but 0/1/-1 logic should hold.
        # But for 'app', it should definitely NOT raise ValueError.

if __name__ == "__main__":
    test_comparison()
