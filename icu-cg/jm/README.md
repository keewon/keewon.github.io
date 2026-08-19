# JM 웹 포팅 (WebGL)

2006년에 만든 GLUT/OpenGL + FMOD 데스크톱 프로그램(`jm.cpp`, `light.cpp`, `flag.cpp`,
`music.cpp`)을 브라우저에서 그대로 돌아가게 옮긴 것입니다. 원본 리소스(`image/*.bmp`,
`test1.mp3`, `test2.mp3`)를 변환 없이 그대로 씁니다.

## 실행

이미지 텍스처 때문에 `file://` 로는 열 수 없고 로컬 서버가 필요합니다.
프로젝트 루트(이 폴더의 상위)에서:

```sh
python3 -m http.server 8790
```

그 다음 브라우저에서 http://localhost:8790/web/ 를 엽니다.

## 조작

| 키 | 동작 |
| --- | --- |
| ↑ / ↓ | 위/아래 육각기둥 선택 |
| ← / → | 선택한 기둥을 한 칸 돌리기 |
| Space | 두 기둥을 반대 방향으로 랜덤하게 돌리기 |
| Esc | 원본은 종료. 브라우저에서는 음악 정지 |

브라우저 자동재생 정책 때문에 음악은 첫 클릭이나 키 입력 뒤에 시작됩니다.

## 파일 대응

| 원본 | 포팅 |
| --- | --- |
| `jm.cpp` | `web/jm.js` |
| `light.cpp` | `web/light.js` |
| `flag.cpp` | `web/flag.js` |
| `music.cpp` (FMOD) | `web/music.js` (HTML5 Audio) |
| GLUT 창 / glu* / 행렬 스택 | `web/gl.js` |

## 어떻게 옮겼나

WebGL 에는 고정 파이프라인이 없어서 `web/gl.js` 가 그 부분을 대신합니다.

* **행렬** — `glPushMatrix`/`glTranslatef`/`glRotatef`/`gluLookAt`/`gluPerspective` 를
  `MatrixStack` 과 행렬 함수로 다시 구현했습니다.
* **조명** — 정점 셰이더가 OpenGL 1.x 의 정점 단위 조명식을 그대로 계산합니다.
  스포트라이트 cutoff/exponent, `GL_LIGHT_MODEL_LOCAL_VIEWER`, `GL_COLOR_MATERIAL
  (GL_AMBIENT_AND_DIFFUSE)`, `GL_MODULATE` 텍스처 합성까지 포함합니다.
  광원 위치와 방향은 원본처럼 `glLightfv` 호출 시점의 모델뷰로 변환해 시점 좌표계로
  넘깁니다. `SetSpecificLight(0)` 이 호출되지 않는 것도 그대로 두어서 0번 광원은
  OpenGL 기본값인 시점 방향 방향광으로 남습니다.
* **glColor / glNormal / glTexCoord 상태** — 상수 정점 어트리뷰트로 흉내냈습니다.
  덕분에 원본의 상태 누수까지 재현됩니다. 예를 들어 바닥은 텍스처 좌표를 지정하지
  않아 직전 깃발 텍스처의 (1.0, 43/44) 지점 색으로 칠해지고, 깃발과 삼각형은 법선을
  지정하지 않아 육각기둥 마지막 면의 법선을 물려받습니다.
* **바닥 법선** — `srand(0)` 뒤의 MSVC `rand()` 수열을 그대로 재현해(`MsvcRand`)
  원본과 같은 울퉁불퉁한 반사를 만듭니다.
* **BMP 텍스처** — 브라우저가 24비트 BMP 를 그대로 디코딩합니다. BMP 는 아래 줄부터
  저장되므로 `UNPACK_FLIP_Y_WEBGL` 로 OpenGL 과 같은 t 축 방향을 맞췄습니다.
* **루프** — `glutIdleFunc` 는 `requestAnimationFrame`, `glutTimerFunc(100, ...)` 두 개는
  100ms 누적 타이머로 바꿨습니다.

## 원본과 다른 점

* `gluPerspective(22.5f, width/height, ...)` 에서 원본은 `width`, `height` 가 `int` 라
  정수 나눗셈이 일어났습니다(1200x500 이면 종횡비가 2.4 가 아니라 2). 웹 버전은 창
  크기가 자유롭게 바뀌므로 실제 종횡비를 씁니다. 그래서 원본보다 가로로 덜 늘어납니다.
* `Esc` 는 `exit(0)` 대신 음악만 멈춥니다.
* FMOD 스트리밍 대신 `<audio>` 를 쓰고, 자동재생 정책 때문에 첫 사용자 입력 뒤에
  재생이 시작됩니다.
* 깃발이 출렁이는 속도는 프레임 수에 비례하는데(원본도 그렇습니다), 원본의 idle 루프는
  60fps 보다 훨씬 빨리 돌았으므로 웹 쪽이 조금 느리게 흔들립니다.
