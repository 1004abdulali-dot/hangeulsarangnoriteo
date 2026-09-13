import os
import sqlite3
import csv
import json
from io import StringIO
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
DB_PATH = "/workspace/data/app.db"
SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1xuTIe_UQ6cbaqhOdtfoOclqeupftUtkCgpigFt2zb3A/export?format=csv&gid=0"
APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbymJDqtqBOLq6C_faL138tJiFgSP0JPd9orgx4Lec4y2uqMAFrcAwQBFPogtixgr-SWzA/exec"
TEACHER_PASSWORD = "20261004"
GAME_TYPES = {"rain": "1", "spy": "2", "sort": "3"}
GAME_KEYS = {"rain": "game1", "spy": "game2", "sort": "game3"}
def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
def init_db():
    with get_db() as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS account_profiles (
            login_id TEXT PRIMARY KEY,
            student_name TEXT NOT NULL DEFAULT '',
            points INTEGER NOT NULL DEFAULT 0,
            level INTEGER NOT NULL DEFAULT 1,
            title TEXT NOT NULL DEFAULT '한글 새싹',
            records TEXT NOT NULL DEFAULT '{}',
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )''')
app = FastAPI()
init_db()
class ProfilePayload(BaseModel):
    login_id: str
    password: str
    student_name: str = ''
    points: int
    level: int
    title: str
    records: str
class LoginPayload(BaseModel):
    login_id: str
    password: str
class TeacherLoginPayload(BaseModel):
    password: str
class WordPayload(BaseModel):
    game_id: str
    word: str
    meaning: str
    kind: str = ''
    tip: str = ''
def load_sheet_accounts():
    try:
        with urlopen(SHEET_CSV_URL, timeout=8) as response:
            content = response.read().decode('utf-8-sig')
    except (URLError, TimeoutError, OSError):
        raise HTTPException(status_code=503, detail='로그인 명단을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.')
    accounts = []
    for row in csv.DictReader(StringIO(content)):
        login_id = (row.get('아이디') or '').strip()
        password = (row.get('비밀번호') or '').strip()
        if login_id and password:
            accounts.append((login_id, password))
    return accounts
def get_account_profile(conn, login_id):
    conn.execute('INSERT OR IGNORE INTO account_profiles (login_id) VALUES (?)', (login_id,))
    return conn.execute('''SELECT login_id, student_name, points, level, title, records, updated_at
                           FROM account_profiles WHERE login_id = ?''', (login_id,)).fetchone()
def script_json(method='GET', payload=None, query=None):
    url = APPS_SCRIPT_URL
    if query:
        url = f'{url}?{urlencode(query)}'
    try:
        request = Request(
            url,
            data=json.dumps(payload, ensure_ascii=False).encode('utf-8') if payload is not None else None,
            headers={'Content-Type': 'application/json; charset=utf-8'} if payload is not None else {},
            method=method,
        )
        with urlopen(request, timeout=12) as response:
            raw = response.read().decode('utf-8-sig').strip()
            try:
                return json.loads(raw) if raw else {}
            except json.JSONDecodeError as error:
                print(f'[시트 연결] JSON 파싱 오류: {error}; 응답 앞부분: {raw[:300]!r}')
                raise HTTPException(status_code=502, detail='시트에서 문제 자료를 올바르게 받지 못했어요.')
    except HTTPException:
        raise
    except (URLError, TimeoutError, OSError) as error:
        print(f'[시트 연결] 네트워크 오류: {error}')
        raise HTTPException(status_code=502, detail='시트와 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.')
def word_value(item, *names):
    for name in names:
        value = item.get(name)
        if value is not None and str(value).strip():
            return str(value).strip()
    return ''
def normalize_words(data, game_id):
    # 앱스 스크립트는 단어 목록을 {"words": {"game1": [...]}} 형태로 보냅니다.
    # 이전 배포처럼 최상단에 game1이 오는 응답도 함께 지원합니다.
    container = data.get('words', data) if isinstance(data, dict) else {}
    source = container.get(GAME_KEYS[game_id], []) if isinstance(container, dict) else []
    if not isinstance(source, list):
        return []
    words = []
    for index, item in enumerate(source):
        if not isinstance(item, dict):
            continue
        word = word_value(item, 'word', 'text', '단어')
        meaning = word_value(item, 'meaning', '뜻', '뜻_또는_바른말', 'clue')
        extra = word_value(item, 'extra', 'kind', 'tip', 'chosung', '초성', '초성이나 분류', '초성_또는_분류')
        word_type = word_value(item, 'type').lower()
        correction = word_value(item, 'correction')
        good_word = word_value(item, 'goodWord')
        bad_word = word_value(item, 'badWord')
        if word:
            words.append({'id': f'{game_id}-{index}-{word}', 'game_id': game_id, 'word': word, 'meaning': meaning, 'extra': extra, 'type': word_type, 'correction': correction, 'goodWord': good_word, 'badWord': bad_word})
    return words
@app.get('/api/health')
def health():
    return {'ok': True}
@app.post('/api/login')
def login(payload: LoginPayload):
    login_id = payload.login_id.strip()
    password = payload.password.strip()
    if not login_id or not password:
        raise HTTPException(status_code=400, detail='아이디와 비밀번호를 입력해 주세요.')
    if (login_id, password) not in load_sheet_accounts():
        raise HTTPException(status_code=401, detail='시트에 등록된 아이디 또는 비밀번호가 맞지 않아요.')
    with get_db() as conn:
        return dict(get_account_profile(conn, login_id))
@app.get('/api/rankings')
def rankings():
    data = script_json(query={'action': 'getUser', 'id': 'ranking-check'})
    source = data.get('user', data) if isinstance(data, dict) else {}
    raw_rankings = data.get('rankings', source.get('rankings', {})) if isinstance(data, dict) and isinstance(source, dict) else {}
    return {'rankings': raw_rankings if isinstance(raw_rankings, dict) else {}}
@app.get('/api/profile/{login_id}')
def load_profile(login_id: str):
    student_id = login_id.strip()
    if not student_id:
        raise HTTPException(status_code=400, detail='학생 아이디를 확인할 수 없어요.')
    data = script_json(query={'action': 'getUser', 'id': student_id})
    source = data.get('user', data) if isinstance(data, dict) else {}
    if not isinstance(source, dict):
        raise HTTPException(status_code=502, detail='시트에서 학생 기록을 올바르게 받지 못했어요.')
    def score_value(*names):
        for name in names:
            try:
                return max(0, int(source.get(name, 0) or 0))
            except (TypeError, ValueError):
                continue
        return 0
    points = score_value('totalPoints', 'points')
    records = {
        'rain': {'bestScore': score_value('game1Best'), 'bestCombo': 0},
        'spy': {'bestScore': score_value('game2Best'), 'bestCombo': 0},
        'sort': {'bestScore': score_value('game3Best'), 'bestCombo': 0},
    }
    rankings = data.get('rankings', source.get('rankings', {})) if isinstance(data, dict) else {}
    rankings = rankings if isinstance(rankings, dict) else {}
    return {'login_id': student_id, 'points': points, 'records': records, 'rankings': rankings}
@app.put('/api/profile')
def save_profile(payload: ProfilePayload):
    login_id, password = payload.login_id.strip(), payload.password.strip()
    if not login_id or not password:
        raise HTTPException(status_code=400, detail='계정 정보를 확인할 수 없어요.')
    if (login_id, password) not in load_sheet_accounts():
        raise HTTPException(status_code=401, detail='로그인 정보를 다시 확인해 주세요.')
    try:
        records = json.loads(payload.records or '{}')
    except json.JSONDecodeError:
        records = {}
    game1_best = max(0, int(records.get('rain', {}).get('bestScore', 0)))
    game2_best = max(0, int(records.get('spy', {}).get('bestScore', 0)))
    game3_best = max(0, int(records.get('sort', {}).get('bestScore', 0)))
    total_points = max(0, payload.points)
    with get_db() as conn:
        conn.execute('''INSERT INTO account_profiles (login_id, student_name, points, level, title, records, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(login_id) DO UPDATE SET points=excluded.points, level=excluded.level,
                        title=excluded.title, records=excluded.records, updated_at=CURRENT_TIMESTAMP''',
                     (login_id, login_id, total_points, max(1, payload.level), payload.title[:40] or '한글 새싹', payload.records))
    script_json('POST', {'id': login_id, 'password': password, 'totalPoints': total_points, 'game1Best': game1_best, 'game2Best': game2_best, 'game3Best': game3_best})
    return {'ok': True}
@app.post('/api/teacher/login')
def teacher_login(payload: TeacherLoginPayload):
    if payload.password != TEACHER_PASSWORD:
        raise HTTPException(status_code=401, detail='비밀번호가 맞지 않아요. 다시 확인해 주세요.')
    return {'ok': True}
@app.get('/api/teacher/students')
def teacher_students():
    with get_db() as conn:
        rows = conn.execute('SELECT login_id, points, level, title, records, updated_at FROM account_profiles ORDER BY points DESC, login_id ASC').fetchall()
        return [dict(row) for row in rows]
@app.get('/api/words/{game_id}')
def get_words(game_id: str):
    if game_id not in GAME_TYPES:
        raise HTTPException(status_code=404, detail='게임을 찾을 수 없어요.')
    return normalize_words(script_json(), game_id)
@app.get('/api/teacher/words')
def teacher_words():
    data = script_json()
    return [word for game_id in GAME_TYPES for word in normalize_words(data, game_id)]
@app.post('/api/teacher/words')
def create_word(payload: WordPayload):
    game_id, word, meaning = payload.game_id.strip(), payload.word.strip(), payload.meaning.strip()
    if game_id not in GAME_TYPES or not word or not meaning:
        raise HTTPException(status_code=400, detail='게임, 단어, 뜻을 모두 입력해 주세요.')
    extra = (payload.tip if game_id == 'sort' else payload.kind).strip()
    script_json('POST', {'gameType': GAME_TYPES[game_id], 'word': word[:30], 'meaning': meaning[:120], 'extra': extra[:80]})
    return {'ok': True}
