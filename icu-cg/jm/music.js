// music.js - music.cpp(FMOD) 대체. HTML5 Audio 로 배경음악 재생/전환.
let audio = null;
let pendingFile = null;   // 자동재생 정책에 막혔을 때 대기 중인 곡

function Init_fmod() {
	audio = new Audio();
	audio.loop = true;        // sound->setLoopCount(-1)
	audio.volume = 0.7;
	return 0;
}

function MusicPlay(file) {
	if (!audio) return;

	MusicStop();
	audio.src = file;
	const p = audio.play();
	if (p && p.catch) {
		p.catch(() => {
			// 사용자 조작 전에는 브라우저가 재생을 막는다. 첫 입력 때 다시 시도.
			pendingFile = file;
			document.getElementById('hint').style.display = 'block';
		});
	}
}

function MusicUpdate() { /* FMOD 의 system->update() 에 해당. 브라우저에선 불필요 */ }

function MusicStop() {
	if (!audio) return;
	audio.pause();
	audio.currentTime = 0;
}

// 첫 키 입력/클릭 시 호출: 막혀 있던 재생을 시작한다.
function MusicResume() {
	if (!audio) return;
	if (pendingFile) {
		const f = pendingFile;
		pendingFile = null;
		document.getElementById('hint').style.display = 'none';
		MusicPlay(f);
	} else if (audio.paused && audio.src) {
		audio.play().catch(() => {});
	}
}
