# 브라우저(WebAssembly) 빌드

2004년 SDL 1.2 + 고정 파이프라인 OpenGL 코드를 Emscripten으로 컴파일한 버전입니다.
원본 C++ 소스가 그대로 소스 오브 트루스이고, 데스크톱 빌드도 계속 됩니다.

## 빌드

```sh
source ~/emsdk/emsdk_env.sh
make -f Makefile.web
```

결과물: `web/index.html`, `index.js`, `index.wasm`, `index.data`

## 실행

`file://`로는 안 됩니다(wasm/데이터 fetch가 막힘). HTTP로 띄우세요.

```sh
make -f Makefile.web serve   # http://localhost:8000/
```

## 조작

- ← / → 이동, ↑ 점프(연속 2번 = 더블점프), ↓ 앉기, space 발사
- 화면 오른쪽 절반에서 좌클릭 드래그 → 지형 그리기
- 우클릭 → 마지막 획 지우기
- 동그라미를 그리면 적 탄이 생성됩니다 (원본 제스처 인식 그대로)

## 포팅 시 변경한 것

- `src/web_compat.{h,c}` (신규): Emscripten에 없는 `gluScaleImage` 구현, `gluLookAt`,
  `SDL_GetKeyState` → `SDL_GetKeyboardState` 호환 매크로
- `src/texname.h` (신규): WebGL은 `glGenTextures`가 발급하지 않은 텍스처 이름을
  거부하므로, 하드코딩된 1~5번을 실제 발급된 이름으로 매핑
- `src/main.cpp`: `while` 루프를 `MainIteration()`으로 분리해
  `emscripten_set_main_loop()`에 넘김. `SDL_Delay`/`SDL_WaitEvent`는 브라우저에서
  탭을 멈추므로 제외. `SDL_OPENGLBLIT` → `SDL_OPENGL`.
  WebGL에 없는 `glPolygonMode`/`glShadeModel`/`glHint`/조명 설정은 제외
  (`GL_LIGHTING`은 원래도 꺼져 있었음)
- `src/main.cpp`: `_strlwr((char*)filename)` 이 문자열 리터럴에 쓰고 있었음
  (최신 툴체인에서는 크래시). 변형하지 않는 확장자 비교로 교체
- `src/main.h`: 마우스 Y → GL Y 부호. 기존 non-WIN32 분기가 뒤집혀 있어서
  브라우저는 WIN32 쪽 식을 사용
- `src/bullet.h`: `BulletManager::BulletManager();` → `BulletManager();`
  (MSVC 확장 문법, 표준 C++에서 컴파일 불가)
- `src/use_opengl.h`: Emscripten 분기 추가

## 알려진 제약

- `glPointSize`는 WebGL에 없어서, 고립된 점 하나짜리 획은 1픽셀로 그려집니다
  (선으로 이어진 획은 정상).
