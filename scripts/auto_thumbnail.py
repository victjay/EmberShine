#!/usr/bin/env python3
"""
EmberShine Auto Thumbnail Script (Phase 22 v1)

흐름:
1. 변경된 markdown 파일 감지
2. thumbnail frontmatter 없는 파일만 처리
3. thumbnail_locked: true 이면 skip
4. 본문에서 이미지 URL 추출
5. 유효 이미지 필터 적용
6. 유효 이미지 있으면 첫 번째 사용, 없으면 섹션별 기본 썸네일
7. 외부 URL이면 R2 업로드
8. frontmatter 업데이트
9. 실패 시 Telegram 알림

pip deps: requests Pillow boto3 PyYAML
"""

import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime
from io import BytesIO
from pathlib import Path

import boto3
import requests
import yaml
from botocore.config import Config
from PIL import Image


# ── Constants ─────────────────────────────────────────────────────────────────

DEFAULT_THUMBNAILS = {
    'blog':      'thumbnails/defaults/default_blog.jpg',
    'stories':   'thumbnails/defaults/default_stories.jpg',
    'portfolio': 'thumbnails/defaults/default_portfolio.jpg',
}

MIN_WIDTH             = 200
MIN_HEIGHT            = 200
MAX_FILE_SIZE         = 10 * 1024 * 1024  # 10 MB
DOWNLOAD_TIMEOUT      = 10                # seconds
ALERT_SUPPRESS_SECS   = 3600             # 1 hour
ALERT_CACHE_FILE      = '/tmp/auto_thumbnail_alerts.json'

EXCLUDE_URL_KEYWORDS  = ('avatar', 'logo', 'icon')
EXCLUDE_EXTENSIONS    = ('.svg', '.gif')


# ── R2 ────────────────────────────────────────────────────────────────────────

def _r2_client():
    account_id = os.environ['R2_ACCOUNT_ID']
    return boto3.client(
        's3',
        endpoint_url=f'https://{account_id}.r2.cloudflarestorage.com',
        aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
        config=Config(signature_version='s3v4'),
        region_name='auto',
    )


def get_r2_path(section: str, slug: str) -> str:
    timestamp = datetime.now().strftime('%Y%m%dT%H%M%S')
    return f'thumbnails/{section}/{slug}.jpg?v={timestamp}'


def upload_to_r2(img_data: bytes, section: str, slug: str) -> str:
    """JPEG 변환 후 R2에 업로드. 버전 쿼리 포함 경로 반환."""
    # Convert to JPEG
    img = Image.open(BytesIO(img_data)).convert('RGB')
    buf = BytesIO()
    img.save(buf, format='JPEG', quality=85, optimize=True)
    jpeg_data = buf.getvalue()

    r2_key = f'thumbnails/{section}/{slug}.jpg'
    bucket = os.environ['R2_BUCKET_NAME']

    _r2_client().put_object(
        Bucket=bucket,
        Key=r2_key,
        Body=jpeg_data,
        ContentType='image/jpeg',
    )

    return get_r2_path(section, slug)


# ── Frontmatter ───────────────────────────────────────────────────────────────

def parse_frontmatter(text: str) -> tuple[dict, str]:
    """(frontmatter_dict, body) 반환."""
    if not text.startswith('---'):
        return {}, text

    end = text.find('\n---', 3)
    if end == -1:
        return {}, text

    fm_raw = text[3:end].strip()
    body   = text[end + 4:].lstrip('\n')

    try:
        fm = yaml.safe_load(fm_raw) or {}
    except yaml.YAMLError:
        fm = {}

    return fm, body


def update_frontmatter(filepath: str, thumbnail_url: str, source: str):
    """thumbnail / thumbnail_source / thumbnail_locked / thumbnail_generated_at 추가."""
    text    = Path(filepath).read_text(encoding='utf-8')
    fm, body = parse_frontmatter(text)

    fm['thumbnail']              = thumbnail_url
    fm['thumbnail_source']       = source
    fm['thumbnail_locked']       = fm.get('thumbnail_locked', False)
    fm['thumbnail_generated_at'] = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')

    fm_yaml   = yaml.dump(fm, allow_unicode=True, default_flow_style=False, sort_keys=False)
    new_text  = f'---\n{fm_yaml}---\n\n{body}'
    Path(filepath).write_text(new_text, encoding='utf-8')


# ── Image Utilities ───────────────────────────────────────────────────────────

def extract_image_urls(body: str) -> list[str]:
    """마크다운 본문에서 이미지 URL 추출."""
    urls: list[str] = []

    # ![alt](url)
    for m in re.finditer(r'!\[.*?\]\((.+?)\)', body):
        urls.append(m.group(1).strip())

    # <img src="url"> / <img src='url'>
    for m in re.finditer(r'<img\s[^>]*src=["\']([^"\']+)["\']', body, re.IGNORECASE):
        urls.append(m.group(1).strip())

    return urls


def is_valid_thumbnail(url: str, img_data: bytes) -> bool:
    """
    유효 이미지 판별 조건:
    - svg, gif 제외
    - URL에 avatar, logo, icon 포함 시 제외
    - 파일 크기 10MB 초과 시 제외
    - 최소 크기 미달 시 제외 (200x200 미만)
    - 세로 비율 3:1 초과 시 제외 (height/width > 3)
    - 가로 비율 4:1 초과 시 제외 (width/height > 4)
    """
    url_lower = url.lower()

    if any(url_lower.endswith(ext) or f'{ext}?' in url_lower for ext in EXCLUDE_EXTENSIONS):
        return False

    if any(kw in url_lower for kw in EXCLUDE_URL_KEYWORDS):
        return False

    if len(img_data) > MAX_FILE_SIZE:
        return False

    try:
        img = Image.open(BytesIO(img_data))
        w, h = img.size
    except Exception:
        return False

    if w < MIN_WIDTH or h < MIN_HEIGHT:
        return False

    if h / w > 3:
        return False

    if w / h > 4:
        return False

    return True


def download_image(url: str) -> bytes | None:
    try:
        resp = requests.get(url, timeout=DOWNLOAD_TIMEOUT)
        resp.raise_for_status()
        return resp.content if resp.content else None
    except Exception:
        return None


# ── Telegram Alerts ───────────────────────────────────────────────────────────

_pending_alerts: list[dict] = []


def _load_alert_cache() -> dict:
    try:
        with open(ALERT_CACHE_FILE) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save_alert_cache(cache: dict):
    with open(ALERT_CACHE_FILE, 'w') as f:
        json.dump(cache, f)


def send_telegram_alert(slug: str, error: str):
    """1시간 내 같은 slug+error 중복 suppress. run 종료 시 일괄 전송."""
    cache = _load_alert_cache()
    key   = f'{slug}::{error}'
    now   = time.time()

    if key in cache and now - cache[key] < ALERT_SUPPRESS_SECS:
        return

    cache[key] = now
    _save_alert_cache(cache)
    _pending_alerts.append({'slug': slug, 'error': error})


def flush_telegram_alerts():
    """run당 1회 요약 알림."""
    if not _pending_alerts:
        return

    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    chat_id   = os.environ.get('TELEGRAM_CHAT_ID', '')
    if not bot_token or not chat_id:
        return

    lines = ['⚠️ *Auto Thumbnail 실패 알림*\n']
    for a in _pending_alerts:
        lines.append(f"• `{a['slug']}`: {a['error']}")

    try:
        requests.post(
            f'https://api.telegram.org/bot{bot_token}/sendMessage',
            json={'chat_id': chat_id, 'text': '\n'.join(lines), 'parse_mode': 'Markdown'},
            timeout=10,
        )
    except Exception as e:
        print(f'[telegram] 알림 전송 실패: {e}', file=sys.stderr)


# ── Git ───────────────────────────────────────────────────────────────────────

def get_changed_md_files() -> list[str]:
    """HEAD~1..HEAD 사이 변경된 .md 파일 반환 (content/ 디렉토리, .en.md 제외)."""
    result = subprocess.run(
        ['git', 'diff', '--name-only', 'HEAD~1', 'HEAD'],
        capture_output=True, text=True,
    )
    files = []
    for line in result.stdout.splitlines():
        line = line.strip()
        if (
            line.startswith('content/')
            and line.endswith('.md')
            and not line.endswith('.en.md')
        ):
            files.append(line)
    return files


def get_section_and_slug(filepath: str) -> tuple[str, str] | None:
    """content/blog/2026-03-20-abc.md → ('blog', '2026-03-20-abc')"""
    parts = Path(filepath).parts
    if len(parts) < 3:
        return None

    section = parts[1]
    slug    = Path(parts[2]).stem

    if section not in DEFAULT_THUMBNAILS:
        return None

    return section, slug


# ── Core ──────────────────────────────────────────────────────────────────────

def process_file(filepath: str):
    info = get_section_and_slug(filepath)
    if info is None:
        return

    section, slug = info

    if not Path(filepath).exists():
        return

    text     = Path(filepath).read_text(encoding='utf-8')
    fm, body = parse_frontmatter(text)

    # 루프 방지 4: thumbnail 이미 있으면 skip
    if fm.get('thumbnail'):
        return

    # thumbnail_locked: true 이면 skip
    if fm.get('thumbnail_locked') is True:
        return

    print(f'[thumbnail] processing: {filepath}')

    # 이미지 후보 수집 (frontmatter image 필드 우선)
    candidates: list[str] = []
    if fm.get('image'):
        candidates.append(str(fm['image']))
    candidates.extend(extract_image_urls(body))

    # 유효 이미지 탐색
    selected_data: bytes | None = None
    for url in candidates:
        if not url.startswith('http'):
            continue
        data = download_image(url)
        if data and is_valid_thumbnail(url, data):
            selected_data = data
            break

    # R2 업로드 또는 기본 썸네일
    try:
        if selected_data is not None:
            thumbnail_path = upload_to_r2(selected_data, section, slug)
            source         = 'first_image'
            print(f'[thumbnail] uploaded → {thumbnail_path}')
        else:
            thumbnail_path = DEFAULT_THUMBNAILS[section]
            source         = 'default'
            print(f'[thumbnail] no valid image, using default → {thumbnail_path}')
    except Exception as e:
        err = str(e)
        print(f'[thumbnail] R2 실패: {err}', file=sys.stderr)
        send_telegram_alert(slug, f'R2 업로드 실패: {err}')
        thumbnail_path = DEFAULT_THUMBNAILS[section]
        source         = 'default'

    update_frontmatter(filepath, thumbnail_path, source)
    print(f'[thumbnail] frontmatter updated: {source}')


def main():
    changed = get_changed_md_files()
    if not changed:
        print('[thumbnail] 변경된 markdown 파일 없음')
        return

    print(f'[thumbnail] 처리 대상: {changed}')

    for filepath in changed:
        try:
            process_file(filepath)
        except Exception as e:
            info = get_section_and_slug(filepath)
            slug = info[1] if info else filepath
            print(f'[thumbnail] 처리 실패 {filepath}: {e}', file=sys.stderr)
            send_telegram_alert(slug, str(e))

    flush_telegram_alerts()


if __name__ == '__main__':
    main()
