# 브라우저(WebAssembly) 빌드

2004년 SDL 1.2 + 고정 파이프라인 OpenGL 코드를 Emscripten으로 컴파일한 버전입니다.
원본 C++가 그대로 소스 오브 트루스이고, 데스크톱 빌드도 계속 됩니다
(브라우저 전용 코드는 전부 `#ifdef __EMSCRIPTEN__`).

## 빌드

```sh
source ~/emsdk/emsdk_env.sh
make -f Makefile.web
```

`file://`로는 안 열립니다(wasm/데이터 fetch가 막힘). HTTP로 띄우세요:

```sh
make -f Makefile.web serve
```

## 배포

`web/` 안의 **index.html, index.js, index.wasm, index.data** 네 개가 한 세트입니다.
`assets/`와 `shell.html`은 빌드 입력이라 업로드할 필요 없습니다.

리소스(`assets/`)는 `index.data`로 패킹되어 가상 파일시스템 루트에 올라갑니다.
그래서 C 코드의 `"homer.pcx"` 같은 경로가 그대로 동작합니다.

## 조작

- ← / → 이동, ↑ 점프(연속 2번 = 더블점프), ↓ 앉기, space 발사
- 화면 오른쪽(반투명 영역)에서 좌클릭 드래그 → 녹색 지형 그리기
- 우클릭 → 마지막 획 지우기
- 동그라미를 그리면 적 탄이 생성됩니다 (원본 제스처 인식 그대로)

## 포팅에서 고친 것들

### 브라우저에서 안 돌던 이유 (증상: 검은 화면)

- **`SDL_RWops` 파일 입출력** — Emscripten의 `SDL_RWFromFile`은 진짜 구조체가 아니라
  정수 id를 돌려줍니다(`IMG_Load_RW` 전용). 그런데 `SDL_RWread`/`SDL_RWseek`는 그
  구조체 안의 함수 포인터를 타고 들어가는 매크로라, 널 포인터를 호출해
  `RuntimeError: null function`으로 죽었습니다.
  → `web_compat.h`에서 stdio(`fopen`/`fread`/`fseek`)로 매핑. MEMFS가 완전 지원합니다.

### 그림이 깨지던 이유

- **`glNormal3f`를 `glBegin` 직후 한 번만 호출** — Emscripten 즉시모드는 프리미티브
  전체에 대해 stride를 하나로 계산하고 모든 정점이 같은 속성을 가진다고 가정합니다.
  법선이 첫 정점에만 붙으면 정점 데이터가 어긋나 대각선 줄무늬가 됩니다.
  (MD2 렌더링은 원래 정점마다 법선을 내보내서 멀쩡했습니다.)
  → `background.cpp`, `bullet.cpp`, `canvas.cpp`에서 정점마다 법선을 재발행.

- **텍스처 없는 지오메트리가 검게 나옴** — `GL_TEXTURE_2D`가 전역으로 켜져 있는데
  배경 렌더 끝에서 `glBindTexture(..., 0)`을 합니다. 데스크톱 GL은 불완전한 텍스처를
  "텍스처링 off"로 처리해 정점 색을 살리지만, WebGL은 불투명 검정을 샘플링해서
  전부 0으로 곱해버립니다. 그래서 녹색 지형 선/점/반투명 사각형이 안 보였습니다.
  → `canvas.cpp`에서 텍스처 없는 구간만 `glDisable(GL_TEXTURE_2D)`.

- **텍스처 이름** — WebGL은 `glGenTextures`가 발급하지 않은 이름을 거부합니다.
  하드코딩된 1~5번을 `texname.h`의 매핑 테이블로 교체.

### 구조 변경

- `main.cpp`: `while` 루프를 `MainIteration()`으로 분리해 `emscripten_set_main_loop()`에
  넘김. 브라우저 탭을 얼리는 `SDL_Delay`/`SDL_WaitEvent`는 제외
  (requestAnimationFrame이 페이싱 담당). `SDL_OPENGLBLIT` → `SDL_OPENGL`.
- WebGL에 없는 `glPolygonMode`/`glShadeModel`/`glHint`/조명 설정 제외
  (`GL_LIGHTING`은 원래도 주석 처리돼 있었음).
- `web_compat.{h,c}`: Emscripten에 없는 `gluScaleImage` 구현, `gluLookAt`,
  `SDL_GetKeyState` → `SDL_GetKeyboardState` 호환.

### 포팅 중 발견한 기존 버그

- `loadTexture`의 `_strlwr((char*)filename)`이 **문자열 리터럴에 직접 쓰고** 있었습니다.
  최신 툴체인에서는 크래시합니다 → 변형하지 않는 확장자 비교로 교체.
- `bullet.h`의 `BulletManager::BulletManager();`는 MSVC 확장 문법이라 표준 C++에서
  컴파일이 안 됩니다.
- `main.h`의 마우스 Y → GL Y 부호가 non-WIN32 분기에서 뒤집혀 있었습니다.
  브라우저는 WIN32 쪽 식을 사용합니다.
- `src/Makefile`(데스크톱)의 `OBJS`에 `bullet.o`가 빠져 있습니다. 손대지 않았습니다.

## 알려진 제약

- `glPointSize`가 WebGL에 없어서, 점 하나짜리 획은 1픽셀로 그려집니다
  (선으로 이어진 획은 정상).
- `-sGL_UNSAFE_OPTS=0`으로 빌드합니다. 지금 증상과는 무관했지만, 즉시모드 에뮬레이션의
  권장 안전 설정이라 켜뒀습니다.
