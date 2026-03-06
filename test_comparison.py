import logging

class VersionManagerMock:
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def _compare_versions(self, version1: str, version2: str) -> int:
        """So sánh 2 phiên bản. Trả về 1 nếu v1 > v2, -1 nếu v1 < v2, 0 nếu bằng"""
        try:
            # Chuẩn hóa chuỗi: bỏ qua tiền tố 'v' và khoảng trắng
            v1_str = version1.lstrip('v').strip()
            v2_str = version2.lstrip('v').strip()
            
            # Tách các phần số
            v1_parts = [int(x) for x in v1_str.split('.') if x.isdigit()]
            v2_parts = [int(x) for x in v2_str.split('.') if x.isdigit()]
            
            # Nếu cả hai đều có phần số, so sánh theo kiểu semantic versioning
            if v1_parts and v2_parts:
                max_len = max(len(v1_parts), len(v2_parts))
                v1_parts.extend([0] * (max_len - len(v1_parts)))
                v2_parts.extend([0] * (max_len - len(v2_parts)))
                
                for v1, v2 in zip(v1_parts, v2_parts):
                    if v1 > v2:
                        return 1
                    elif v1 < v2:
                        return -1
                return 0
            
            # Nếu một trong hai không có phần số (ví dụ: 'app'), so sánh chuỗi
            if v1_str != v2_str:
                # Nếu remote (v1_str) khác local (v2_str), mặc định xem là có update
                # để tránh bỏ sót, trừ khi chúng là cùng một chuỗi
                return 1
            
            return 0
        except Exception as e:
            print(f"Error: {e}")
            return 0

vm = VersionManagerMock()

test_cases = [
    ("1.1.0", "1.0.0", 1),
    ("1.0.1", "1.1.0", -1),
    ("1.0.0", "1.0.0", 0),
    ("app", "1.1.0", 1),       # Current issue: remote 'app' vs local '1.1.0'
    ("v1.1.1", "1.1.0", 1),
    ("1.1", "1.1.0", 0),
    ("app", "app", 0),
]

for v1, v2, expected in test_cases:
    result = vm._compare_versions(v1, v2)
    print(f"Compare '{v1}' vs '{v2}': Got {result}, Expected {expected}, {'PASS' if result == expected else 'FAIL'}")
