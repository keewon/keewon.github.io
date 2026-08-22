# Organic Pop - Privacy / 개인정보 처리방침

[\[한국어\]](#한국어) [\[English\]](#english)

---

## 한국어

### 요약

Organic Pop은 계정도 로그인도 없습니다. 이름, 나이, 성별, 전화번호, 주소, 연락처,
사진 등 **개인을 식별할 수 있는 정보는 수집하지 않습니다.**

수집하는 것은 게임을 개선하기 위한 플레이 기록, 그리고 광고와 오퍼월을 제공하기
위해 광고 회사들이 사용하는 정보입니다.

### 게임 이용 기록 (Firebase Analytics)

Google의 Firebase Analytics로 다음을 수집합니다.

 - **완성한 분자 목록** 과 **사용한 기능**(Zap, Undo 등) - 어떤 분자가 어렵고 어떤
   기능이 실제로 쓰이는지 파악해 레벨과 난이도를 다듬는 데 씁니다.
 - **앱 인스턴스 ID** - 설치할 때 만들어지는 무작위 식별자입니다. 개인을 가리키지
   않으며 앱을 지우면 사라집니다.
 - **기기 및 앱 정보** - 기기 모델, OS 버전, 앱 버전, 언어 설정
 - **IP 주소와 그로부터 추정한 대략적인 지역** (국가/지역 수준)
 - **실행 횟수, 사용 시간** 등 Firebase가 자동으로 기록하는 항목

### 광고 (Google AdMob, Unity Ads)

게임 안에 광고가 표시됩니다. 광고 회사는 광고를 고르고 집계하기 위해 다음을
사용합니다.

 - **광고 식별자** - iOS는 IDFA, Android는 광고 ID(AAID)입니다. 이름이나 계정과
   연결되지 않으며, 아래 방법으로 언제든 초기화하거나 사용을 막을 수 있습니다.
 - **IP 주소와 그로부터 추정한 대략적인 지역**
 - **기기 정보** - 기기 모델, OS 버전, 화면 해상도
 - **광고 반응** - 광고가 표시된 횟수, 눌린 횟수, 이미 본 광고

### 오퍼월 (Tapjoy)

광고를 보거나 제휴사의 과제를 완료하면 게임 내 보상을 받는 오퍼월이 있습니다.
보상을 정확히 지급하려면 누가 무엇을 완료했는지 확인해야 하므로, Tapjoy는
**광고 식별자, IP 주소, 오퍼 완료 기록**을 사용합니다. 이 과정에서 광고 식별자가
오퍼를 제공하는 **제3자 광고주에게 전달될 수 있습니다.**

오퍼월을 열지 않으면 이 정보는 오가지 않습니다.

### 수집하지 않는 것

 - **이름, 나이, 성별, 전화번호, 주소, 연락처, 사진, 정밀 위치**
 - **계정 정보** - 로그인 기능 자체가 없습니다.

### 제3자 제공

수집된 정보는 아래 회사들이 각자의 서비스로 처리합니다. 그 외 누구에게도 데이터를
판매하거나 제공하지 않습니다.

 - Google (AdMob, Firebase Analytics) -
   [개인정보처리방침](https://policies.google.com/privacy)
 - Unity (Unity Ads) -
   [개인정보처리방침](https://unity.com/legal/game-player-and-app-user-privacy-policy)
 - Tapjoy -
   [개인정보처리방침](https://www.tapjoy.com/legal/end-users/privacy-policy/)

### 권한

사용자에게 따로 묻는 권한(위치, 카메라, 연락처 등)은 요청하지 않습니다. Android에서
설치 시 선언되는 권한은 **인터넷 접속, 네트워크 상태 확인, 광고 ID 접근**이며 모두
위에 적은 용도로 쓰입니다.

### 추적 거부 / 광고 ID 초기화

 - **iOS** - 설정 → 개인정보 보호 및 보안 → 추적에서 이 앱의 추적을 끄면 IDFA가
   제공되지 않습니다. 처음 실행할 때 뜨는 추적 요청 창에서 거부하셔도 됩니다.
 - **Android** - 설정 → 개인정보 보호 → 광고에서 광고 ID를 초기화하거나 삭제할 수
   있습니다. 삭제하면 맞춤 광고가 중단됩니다.
 - 어느 쪽이든 광고 자체는 계속 표시되지만, 관심사 기반 맞춤이 아닌 광고가 나옵니다.

### 문의

[keewon.seo@gmail.com](mailto:keewon.seo@gmail.com)

---

## English

### Summary

Organic Pop has no account and no sign-in. It does **not** collect personally
identifiable information such as your name, age, gender, phone number, address,
contacts, or photos.

What is collected is play history, used to improve the game, and whatever the
advertising services need to show ads and run the offerwall.

### Gameplay (Firebase Analytics)

Collected through Google's Firebase Analytics:

 - **Molecules completed** and **skills used** (Zap, Undo, and so on) - to see
   which molecules are hard and which skills people actually use, and tune the
   levels accordingly.
 - **App instance ID** - a random identifier created at install time. It does not
   identify a person and is gone when the app is uninstalled.
 - **Device and app information** - device model, OS version, app version,
   language.
 - **IP address and the approximate region derived from it** (country/region
   level).
 - **Sessions and time in app**, and similar events Firebase records
   automatically.

### Advertising (Google AdMob, Unity Ads)

The game shows ads. The ad services use the following to select and measure them:

 - **Advertising identifier** - IDFA on iOS, Advertising ID (AAID) on Android. It
   is not tied to your name or any account, and you can reset it or turn it off
   (see below).
 - **IP address and the approximate region derived from it.**
 - **Device information** - model, OS version, screen resolution.
 - **Ad interactions** - impressions, clicks, and which ads you have already
   seen.

### Offerwall (Tapjoy)

The game has an offerwall: watch an ad or complete a partner's offer, get a
reward in the game. Paying the right reward to the right person means confirming
who completed what, so Tapjoy uses your **advertising identifier, IP address, and
a record of completed offers**. In the course of that, your advertising
identifier **may be passed to the third-party advertisers** whose offers appear.

None of this happens if you never open the offerwall.

### Not collected

 - **Name, age, gender, phone number, address, contacts, photos, precise
   location.**
 - **Account information** - there is no sign-in at all.

### Third parties

The information above is processed by the following companies as part of their
own services. Nothing is sold or handed to anyone else.

 - Google (AdMob, Firebase Analytics) -
   [Privacy Policy](https://policies.google.com/privacy)
 - Unity (Unity Ads) -
   [Privacy Policy](https://unity.com/legal/game-player-and-app-user-privacy-policy)
 - Tapjoy -
   [Privacy Policy](https://www.tapjoy.com/legal/end-users/privacy-policy/)

### Permissions

No runtime permissions are requested - no location, camera, or contacts prompts.
On Android the permissions declared at install time are **internet access,
network state, and advertising ID access**, all used for the purposes above.

### Opting out / resetting the advertising identifier

 - **iOS** - Settings → Privacy & Security → Tracking, and turn tracking off for
   this app; the IDFA is then not provided. Declining the tracking prompt on
   first launch does the same.
 - **Android** - Settings → Privacy → Ads lets you reset or delete the
   advertising ID. Deleting it stops personalized advertising.
 - Either way ads still appear, but they are no longer tailored to your
   interests.

### Contact

[keewon.seo@gmail.com](mailto:keewon.seo@gmail.com)
