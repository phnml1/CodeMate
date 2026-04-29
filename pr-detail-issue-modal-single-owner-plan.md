# PR Detail Issue Modal Single Owner Plan

## 1. Current Structure

현재 PR Detail page에는 같은 목적의 issue detail modal이 두 군데에서 따로 관리된다.

```txt
PRDetailLayout
├─ ReviewSection
│  ├─ selectedIssue state
│  └─ IssueDetailModal
│
└─ PRDiffSection
   ├─ selectedIssue state
   └─ IssueDetailModal
```

## 2. Current Problem

`IssueDetailModal`은 "선택된 review issue를 자세히 보여주는 모달"이라는 하나의 역할을 한다.

그런데 현재는 다음 두 컴포넌트가 각각 modal state와 modal dynamic import를 갖는다.

- `components/pulls/detail/ReviewSection.tsx`
- `components/pulls/detail/PRDiffSection.tsx`

이 구조에서는 modal이 닫혀 있어도 PR Detail tree 안에 modal host가 두 개 존재한다. Lighthouse에서도 `IssueDetailModal`, `Dialog`, `BailoutToCSR`가 두 번 나타난다.

## 3. Proposed Structure

`selectedIssue` state와 modal rendering 책임을 `PRDetailLayout` 또는 별도 `IssueModalHost`로 올린다.

```txt
PRDetailLayout
├─ selectedIssue state
├─ handleIssueClick(issue)
│
├─ ReviewSection
│  └─ onIssueClick(issue)
│
├─ PRDiffSection
│  └─ onIssueClick(issue)
│
└─ IssueModalHost
   └─ selectedIssue가 있을 때만 IssueDetailModal lazy render
```

## 4. Responsibility Change

### `PRDetailLayout`

- `selectedIssue`를 한 번만 가진다.
- `handleIssueClick(issue)`를 만든다.
- `ReviewSection`과 `PRDiffSection`에 `onIssueClick`으로 전달한다.
- `selectedIssue !== null`일 때만 `IssueModalHost`를 렌더링한다.

### `ReviewSection`

- `selectedIssue` state를 제거한다.
- `IssueDetailModal` dynamic import를 제거한다.
- review issue 클릭 시 `onIssueClick(issue)`만 호출한다.

### `PRDiffSection`

- `selectedIssue` state를 제거한다.
- `IssueDetailModal` dynamic import를 제거한다.
- diff issue 클릭 시 `onIssueClick(issue)`만 호출한다.

### `IssueModalHost`

- `IssueDetailModal` dynamic import를 한 곳에서만 담당한다.
- `issue`가 없으면 `null`을 반환해서 closed modal code가 초기 렌더링에 끼지 않게 한다.

## 5. Expected Impact

- `IssueDetailModal` / `Dialog` 중복 mount 감소
- `LoadableComponent` / `BailoutToCSR` 중복 감소
- modal 관련 dynamic import가 한 곳으로 단순화
- Review/Diff section의 책임 감소
- Lighthouse의 `IssueDetailModal appears twice` 문제 완화 기대

## 6. Safe Implementation Order

1. `IssueModalHost` 컴포넌트 추가
2. `PRDetailLayout`에 `selectedIssue` state 추가
3. `ReviewSection`에 `onIssueClick` prop 추가
4. `PRDiffSection`에 `onIssueClick` prop 추가
5. 각 section 내부의 modal state/dynamic import 제거
6. deep link, diff issue click, review issue click 동작 확인
