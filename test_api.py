import requests
import json
import sys

def test_api():
    owner = "btduy13"
    repo = "Tape-inventory-Management"
    url = f"https://api.github.com/repos/{owner}/{repo}/releases/latest"
    print(f"Testing URL: {url}")
    try:
        response = requests.get(url, timeout=10)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Success! Tag Name: {data.get('tag_name')}")
            print(json.dumps(data, indent=2)[:500] + "...")
        else:
            print(f"Failed with status: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api()
