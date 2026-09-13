# 파이썬 환경 설정
FROM python:3.11-slim

WORKDIR /app

# 라이브러리 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 코드 복사
COPY . .

# Cloud Run의 기본 포트 8080으로 서버 실행 (main.py 기준)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]