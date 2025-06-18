#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ocr_parser import parse_ocr_result
import json

def test_ocr_parsing():
    """실제 OCR 결과로 파싱 테스트"""
    
    # 실제 OCR 결과 (이미지에서 추출된 텍스트)
    test_data = [
        "상품등록 40-2018 -0026871",
        "KIWON",
        "기원산업",
        "특허멀등록 제160598676843",
        "특허 제10-1994885호",
        "50e",
        "F승P",
        "치환검",
        "중소벤처기업부",
        "edn",
        "KOSo",
        "VVJgN스Ge)",
        "대표우 태 경 (우남 철)",
        "주소. 우)39859 경북 칠곡군 동명면 백숙로 817",
        "ON",
        "Tel. 054-972-3003",
        "Fax. 054-972-7007",
        "Mobile. 010-9585-7080",
        "E-mail. dnskacjfggg@naver.com",
        "Homepage. http:llwwwkiwonindustrycom",
        "어\"ur"
    ]
    
    print("=== OCR 파싱 테스트 ===")
    print(f"입력 데이터: {test_data}")
    print()
    
    # 파싱 실행
    result = parse_ocr_result(test_data, "test_image.jpg")
    
    print("=== 파싱 결과 ===")
    for key, value in result.items():
        if value and key not in ['ocr_raw_text']:
            print(f"{key}: {value}")
    
    print()
    print("=== 기대 결과와 비교 ===")
    expected = {
        'name': '우태경',
        'position': '대표',
        'company_name': '기원산업',
        'email': 'dnskacjfggg@naver.com',
        'phone': '054-972-3003',
        'mobile': '010-9585-7080'
    }
    
    for key, expected_value in expected.items():
        actual_value = result.get(key)
        status = "✅" if actual_value == expected_value else "❌"
        print(f"{status} {key}: 기대값='{expected_value}', 실제값='{actual_value}'")

if __name__ == "__main__":
    test_ocr_parsing() 