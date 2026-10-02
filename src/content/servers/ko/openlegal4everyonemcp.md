---
slug: openlegal4everyonemcp
language: ko
name: OpenLegal4Everyone MCP
description: 한국 법률 자료의 검색·조회·인용 검증과 개정본 및 사용자 제공 텍스트 비교를 위한 MCP 서버입니다.
capabilities: [mcp]
codex:
  format: toml
  config: |
    [mcp_servers.openlegal4everyone]
    url = "https://openlegal4everyone.mcp.publicdata.stream/mcp"
claude:
  client: Claude Code
  format: json
  config: |
    {
      "mcpServers": {
        "openlegal4everyone": {
          "type": "http",
          "url": "https://openlegal4everyone.mcp.publicdata.stream/mcp"
        }
      }
    }
chatgptPlugin:
  definitionUrl: https://github.com/PublicData-stream/openlegal4everyoneMCP/tree/2ce26a97b760c4073db46d0d538e0f829981da0d/plugins/openlegal
  instructions: |
    OpenLegal 플러그인은 MCP 연결과 한국 법률 조사, 개정 이력, 텍스트 비교용 스킬을 함께 제공합니다. 매니페스트와 스킬은 오프라인에서 검증됐으며, 실제 Claude·ChatGPT 연결과 공개 디렉토리 등록은 미확인 상태입니다. 선택 사항인 설정 절차는 위 본문을 참고하세요.
---

### 서비스와 이용 상태

OpenLegal4Everyone MCP는 openlegal4everyone.stream의 MCP 인터페이스입니다.
한국 LAW OPEN DATA 어댑터는 국가법령, 행정규칙, 자치법규, 조약, 판례,
헌법재판소 결정례, 법령해석례, 행정심판례를 다룹니다. 이는 구현된 데이터셋
어댑터의 범위이며, 운영 서버에 어떤 자료가 수집되어 있는지를 보장하지 않습니다.
특정 사건에 대한 법률 자문이 아닌 법률 정보 제공을 목적으로 합니다.

**2026-10-02(UTC) 상태 확인:** 운영 호스트를 조회한 결과 서버와 수집 스케줄러는
준비되지 않은 상태였습니다(`Ready 0/1`, `CrashLoopBackOff`). 이번 문서 확인에서는
공개 엔드포인트를 호출하지 않았습니다. 아래 안내는 설정된 접속 주소와 구현된
도구를 설명하며, 현재 공개 서비스 이용 가능 여부, 실제 원천 데이터 수집 성공,
자료 전체의 수집 여부는 미확인입니다. 클라이언트 연결 성공만으로 이를 확인할 수는
없습니다.

### 접속 설정

Streamable HTTP 방식의 원격 MCP를 지원하는 클라이언트를 사용하세요. 설정된
HTTPS 엔드포인트는 다음과 같습니다.

```text
https://openlegal4everyone.mcp.publicdata.stream/mcp
```

문서에 정의된 서버는 사용자 계정, API 토큰, OAuth 로그인 없이 익명으로
접속하도록 설계되어 있습니다. 클라이언트 연결을 설정하기 위해 백엔드를 설치하거나
LAW OPEN DATA 제공자용 인증 정보를 발급받을 필요는 없습니다.

**Codex**에서는 아래 클라이언트 구성 섹션의 TOML 예제를
`~/.codex/config.toml`에 병합하세요. 기존 설정을 보존하고 같은 서버 테이블을
중복으로 추가하지 마세요. 새 Codex 세션을 시작한 뒤 `/mcp`에서 활성 서버를
확인하세요. `codex mcp list`는 설정된 서버 목록을 표시합니다.
[Codex 공식 MCP 안내](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)를 참고하세요.

**Claude Code**에서는 아래 JSON 예제를 프로젝트 루트의 `.mcp.json`에 있는
`mcpServers` 객체에 병합하세요. 해당 프로젝트에서 Claude Code를 시작하고,
프로젝트 서버 승인 안내가 표시되면 내용을 검토한 뒤 `/mcp`에서 연결 상태를
확인하세요. `claude mcp get openlegal4everyone`으로 설정된 서버의 상태를 볼 수
있습니다. [Claude Code 공식 MCP 안내](https://code.claude.com/docs/en/mcp)를
참고하세요.

### 연결 확인

1. 클라이언트가 서버 연결 성공을 표시하고 도구 목록을 보여주는지 확인하세요.
2. 클라이언트에 `server_info` 호출을 요청하세요. 서버 식별 정보, 지원 프로토콜,
   라이선스, 해당 버전의 소스 URL을 반환하며 법률 문서를 조회하지 않습니다.
3. 아래 작업을 시도하기 전에 사용 가능한 도구 목록을 확인하세요. 법률 자료와
   텍스트 비교 도구는 선택적 서버 기능입니다. 도구가 없다면 운영 설정이나 서버
   버전이 다를 수 있습니다.
4. 법률 도구가 있다면 식별된 문서와 출처 정보를 조회하여 자료 조회를 별도로
   확인하세요. 결과가 없거나 자료를 읽을 수 없거나 불완전하다면 반환된 상태를
   그대로 설명하세요. 연결 확인을 자료 조회 성공으로 표현하지 마세요.

### 주요 기능과 질문 예시

다음 도구는 참조 프로젝트에 구현되어 있습니다. 실제 활성화된 도구는 연결한
서버의 도구 목록에서 확인하세요.

| 작업 | 도구 | 확인할 내용 |
| --- | --- | --- |
| 법령이나 문구 찾기 | `law.resolve_name`, `database.query`, `database.rg` | 한국 법령명·약칭을 해석하거나 수집된 원문을 검색합니다. |
| 원문 읽기 | `database.get`, `database.get_metadata`, `law.article` | 문서·조문·장·별표와 출처·최신성 정보를 조회합니다. |
| 인용과 참조 확인 | `citation.verify`, `precedent.citing`, `article.impact` | 수집된 인용, 인용 판결, 조문 참조 관계를 확인합니다. |
| 개정 이력 확인 | `database.history`, `database.diff`, `law.in_force_at`, `law.watch`, `law.lineage` | 보관된 개정본 선택·비교, 명칭 변경, 시행 예정 개정을 확인합니다. |
| 직접 제공한 텍스트 비교 | `text.diff` | 두 초안을 줄과 문자 단위로 비교합니다. |
| 누락 자료 수집 요청 | `database.object_status`, `database.request_collection`, `database.collection_status` | 현재 수집 상태를 조회하고 명시적으로 수집을 요청한 뒤 진행 상태를 확인합니다. |

클라이언트에 다음과 같이 요청할 수 있습니다.

- “민법 제750조의 한국어 원문을 읽고 출처 URL, 개정본, 마지막 검증 시각을
  함께 표시해 줘.”
- “수집된 근로기준법 개정본 목록에서 읽을 수 있는 최근 두 버전을 비교해 줘.
  공포일과 시행일을 각각 표시해 줘.”
- “내가 제공하는 글의 법령 조문과 사건번호 인용을 확인해 줘. 검증된 인용과
  아직 수집하지 않은 자료를 구분해 줘.”
- “이 두 조항 초안의 바뀐 부분을 모두 보여줘. 정확한 원문 차이와 요약을
  구분해 줘.”

이는 작업 요청 예시이며 법률 조회 결과 예시가 아닙니다. 영어로 질문해도 한국어
원문이 공식 영문 번역으로 바뀌는 것은 아닙니다.

수집 요청은 백그라운드 작업을 등록하며 법률 원문을 즉시 반환하지 않습니다.
반환된 `request_id`를 보관하고 `database.collection_status`로 확인한 뒤 작업
완료 후 다시 검색하세요. 작업이 완료되어도 요청한 원문이 수집되었다고 보장할 수는
없습니다. 같은 요청은 24시간 동안 합쳐지므로 반복 요청을 보내지 마세요.
`law.watch`는 호출 시 변경을 확인하며, 주기적 실행과 알림은 클라이언트가 담당합니다.

### 출처·일자·수집 범위 확인

인용마다 공식 명칭, 출처 URL, 객체 식별 정보, 개정본, capture ID를 함께
보관하세요. `retrieved_at`, `validated_at`, `freshness`를 표시하고, 번역이나
요약은 원문과 구분하세요. 제공자 원문, 첨부파일 추출문, OCR은 서로 다른 근거
유형입니다. 첨부 누락이나 별표의 텍스트 부족을 알리고 내용을 추정하여 채우지 마세요.

검색 결과에는 수집 범위, 색인 지연, 수집 관련 안내가 포함됩니다. 검색 결과가
0건이어도 다음 페이지 커서가 있다면 이어서 확인해야 합니다. `not_observed`는
이 서버에 관측 자료가 없다는 뜻이며, 법령이나 판결이 없다는 뜻이 아닙니다.
`precedent.citing`의 `none_found`도 해당 판례가 여전히 유효하다는 확인이 아닙니다.

최신 원문이 필요하면 `fresh_only: true`를 사용하고, 최신성 오류를 오래된 자료로
몰래 대체하지 마세요. 공포일·시행일을 정확히 지정하는 selector는 기록된 일자를
가리킵니다. `law.in_force_at`은 지정일 이전 또는 당일에 시행된 보관 개정본에서
선택하며 근거와 이력 수집 상태를 표시합니다. 특정 사실관계에 적용할 법률을
판단하거나 경과조치를 해결하는 도구는 아닙니다.

### 선택 사항: 플러그인 설정

별도로 정의된 OpenLegal 플러그인에는 `korean-law-research`,
`legal-revision-history`, `legal-text-comparison` 스킬이 포함됩니다. 참조 문서상
매니페스트와 스킬은 오프라인 검증을 거쳤으며, 실제 클라이언트 연결, 위젯,
공개 디렉토리 등록은 미확인입니다.

저장소에 안내된 Claude Code 명령은 다음과 같습니다.

```text
/plugin marketplace add PublicData-stream/openlegal4everyoneMCP
/plugin install openlegal@openlegal4everyone
```

도구가 중복 등록되지 않도록 플러그인에 포함된 연결과 위의 수동 연결 중 한 가지를
사용하세요.

ChatGPT에서는 **설정 → 보안 및 로그인**에서 개발자 모드를 켠 뒤
**ChatGPT Plugins**에서 더하기 버튼을 선택하고 위 HTTPS 엔드포인트를 입력하세요.
연결을 만든 뒤 검색된 도구를 검토하세요. 이용 가능 여부는 계정과 워크스페이스
정책에 따라 달라집니다. 이는 MCP 연결을 만드는 절차이며, 별도 OpenLegal
플러그인의 공개 등록이나 포함된 스킬 가져오기를 확인하는 절차는 아닙니다.
[ChatGPT 공식 연결 안내](https://developers.openai.com/plugins/deploy/connect-chatgpt)를
참고하세요.

### 제공한 텍스트와 임시 보관

텍스트 비교 구현에서 업로드한 첨부파일은 최초 업로드로부터 10분 동안 보관되며,
비교 결과와 생성된 첨부파일은 게시 후 10분에 만료됩니다. 읽어도 기한은 연장되지
않습니다. 작업을 마치면 `text.diff.delete`로 비교 결과를,
`text.attachment.delete`로 첨부파일을 더 일찍 삭제할 수 있습니다.
이 도구별 기한은 클라이언트 대화 기록이나 운영자의 모든 데이터 처리 방식을
설명하지 않습니다. 운영자가 승인한 서비스 약관과 개인정보처리방침은 이 디렉토리
항목에 포함되어 있지 않습니다.

### 문제 해결

| 증상 | 확인할 내용 |
| --- | --- |
| 연결 실패 또는 서버 이용 불가 | HTTPS 주소와 `/mcp` 경로, 클라이언트 네트워크 접근, 현재 서비스 상태를 확인하세요. 준비되지 않은 백엔드는 클라이언트 설정만으로 해결되지 않습니다. |
| Claude Code에서 승인 대기 | 프로젝트에서 Claude Code를 열어 서버 승인 안내를 검토하고 `/mcp`를 다시 확인하세요. |
| 안내된 도구가 없음 | 도구 목록과 서버 버전을 확인하고 활성화된 도구만 사용하세요. |
| `not_observed`, `processing_pending`, `collection_incomplete` | `database.object_status`를 확인하세요. 수집 요청 기능이 있으면 명시적으로 요청하고 상태를 추적하세요. 법률 자료 자체가 없다고 해석하지 마세요. |
| `freshness_unavailable` 또는 불완전한 수집 범위 | 한계를 알리고 출처 정보와 수집 안내를 확인하세요. 최신 자료나 전체 결과라고 단정하지 마세요. |
| `rate_limited` 또는 커서·핸들 만료 | 반환된 재시도 안내를 따르세요. 만료된 검색·읽기 세션을 다시 시작하거나 텍스트를 다시 제공하고 반복 호출을 피하세요. |

### 참고 문서

위 기능 설명은 참조 리비전 `2ce26a97b760c4073db46d0d538e0f829981da0d`를
기준으로 하며, 운영 서버 버전이 동일하다는 뜻은 아닙니다.

- [프로젝트 소개와 개발 상태](https://github.com/PublicData-stream/openlegal4everyoneMCP/blob/2ce26a97b760c4073db46d0d538e0f829981da0d/README.md)
- [한국 LAW OPEN DATA 어댑터와 수집 한계](https://github.com/PublicData-stream/openlegal4everyoneMCP/blob/2ce26a97b760c4073db46d0d538e0f829981da0d/docs/providers/kr-law-go-kr.md)
- [자료 검색·조회·이력·최신성](https://github.com/PublicData-stream/openlegal4everyoneMCP/blob/2ce26a97b760c4073db46d0d538e0f829981da0d/docs/database.md)
- [법령명·인용·일자 선택](https://github.com/PublicData-stream/openlegal4everyoneMCP/blob/2ce26a97b760c4073db46d0d538e0f829981da0d/docs/legal-reference.md)
- [조문 조회와 참조 분석](https://github.com/PublicData-stream/openlegal4everyoneMCP/blob/2ce26a97b760c4073db46d0d538e0f829981da0d/docs/legal-analysis.md)
- [텍스트 비교와 보관 기한](https://github.com/PublicData-stream/openlegal4everyoneMCP/blob/2ce26a97b760c4073db46d0d538e0f829981da0d/docs/text-diff.md)
- [플러그인 정의와 설치 상태](https://github.com/PublicData-stream/openlegal4everyoneMCP/tree/2ce26a97b760c4073db46d0d538e0f829981da0d/plugins/openlegal)
