"""
YOLO 기반 로고 추출 사용 예제
명함에서 회사 로고를 추출하는 방법을 보여줍니다.
"""

import asyncio
import os
from ocr_processor import OCRProcessor
from logo_extractor import LogoExtractor

async def example_logo_extraction():
    """로고 추출 예제"""
    
    # 업로드 폴더 설정
    upload_folder = "uploads"
    
    # OCR 프로세서 초기화 (로고 추출기 포함)
    processor = OCRProcessor(upload_folder)
    
    # 예제 명함 이미지 경로
    image_path = "example_business_card.jpg"
    
    if not os.path.exists(image_path):
        print("❌ 예제 이미지가 없습니다. 명함 이미지를 준비해주세요.")
        return
    
    print("🔍 명함 처리 시작...")
    
    try:
        # 방법 1: OCR + 로고 추출 통합 처리
        print("\n📋 방법 1: OCR + 로고 통합 처리")
        result = await processor.process_image_with_logo(image_path)
        
        print(f"✅ OCR 결과: {len(result['text'])}개 텍스트 추출")
        print(f"📝 추출된 텍스트: {result['text'][:3]}...")  # 처음 3개만 표시
        
        if result['logo']:
            print(f"🎨 로고 추출 성공!")
            print(f"   - 방법: {result['logo']['method']}")
            print(f"   - 신뢰도: {result['logo']['confidence']:.2f}")
            print(f"   - 저장 경로: {result['logo']['logo_path']}")
            print(f"   - 크기: {result['logo']['logo_size']}")
        else:
            print("❌ 로고를 찾을 수 없습니다.")
        
        # 방법 2: 로고만 추출
        print("\n🎨 방법 2: 로고만 추출")
        logo_only = processor.extract_logo_only(image_path)
        
        if logo_only:
            print(f"✅ 로고 추출 성공!")
            print(f"   - 바운딩박스: {logo_only['bbox']}")
            print(f"   - 신뢰도: {logo_only['confidence']:.2f}")
            print(f"   - 저장 경로: {logo_only['logo_path']}")
        else:
            print("❌ 로고를 찾을 수 없습니다.")
        
        # 방법 3: 직접 LogoExtractor 사용
        print("\n🔧 방법 3: LogoExtractor 직접 사용")
        logo_extractor = LogoExtractor(upload_folder)
        
        # 단일 로고 추출
        single_logo = logo_extractor.extract_logo(image_path)
        if single_logo:
            print(f"✅ 단일 로고 추출: {single_logo['logo_path']}")
        
        # 다중 로고 후보 추출
        multiple_logos = logo_extractor.extract_multiple_logos(image_path, max_logos=3)
        print(f"🎯 로고 후보 {len(multiple_logos)}개 발견")
        
        for i, logo in enumerate(multiple_logos):
            print(f"   후보 {i+1}: 점수 {logo['score']:.1f}, 방법 {logo['method']}")
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")

def test_logo_extractor_only():
    """LogoExtractor만 테스트"""
    
    upload_folder = "uploads"
    image_path = "example_business_card.jpg"
    
    if not os.path.exists(image_path):
        print("❌ 예제 이미지가 없습니다.")
        return
    
    print("🎨 LogoExtractor 단독 테스트...")
    
    try:
        extractor = LogoExtractor(upload_folder)
        
        # YOLO 모델이 제대로 로드되었는지 확인
        if extractor.yolo is None:
            print("❌ YOLO 모델 로드 실패")
            return
        
        print("✅ YOLO 모델 로드 성공")
        
        # 로고 추출 실행
        result = extractor.extract_logo(image_path)
        
        if result:
            print("🎉 로고 추출 성공!")
            print(f"   - 바운딩박스: {result['bbox']}")
            print(f"   - 신뢰도: {result['confidence']:.2f}")
            print(f"   - 방법: {result['method']}")
            print(f"   - 로고 크기: {result['logo_size']}")
            print(f"   - 저장 경로: {result['logo_path']}")
        else:
            print("❌ 로고를 찾을 수 없습니다.")
            print("💡 다음을 확인해보세요:")
            print("   - 명함 이미지에 로고가 있는지")
            print("   - 로고가 상단 영역에 위치하는지")
            print("   - 이미지 품질이 충분한지")
            
    except Exception as e:
        print(f"❌ 오류: {str(e)}")

if __name__ == "__main__":
    print("🚀 YOLO 기반 로고 추출 예제")
    print("=" * 50)
    
    # 비동기 예제 실행
    print("\n📋 통합 처리 예제:")
    asyncio.run(example_logo_extraction())
    
    print("\n" + "=" * 50)
    
    # 동기 예제 실행
    print("\n🎨 로고 추출기 단독 예제:")
    test_logo_extractor_only()
    
    print("\n✅ 예제 실행 완료!") 