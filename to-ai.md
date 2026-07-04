worktree가뭐노?
왜 썼노?
왜이렇게 변경사항이 많은걸로 뜨노?
이거 정리가능하노?

그다음
성능지표측정하자

- pr detail 페이지 리팩토링 필수
  PRDetailContainer에있는 로직들을 전부 분리해야함(필수)
  - data: pr state drilling
  - handleRequestReview를 review쪽으로 빼야함 (얘는 왜 여기있는거야대체)
  PRDetailLayout useShallow
    - 컴포넌트와 로직전부분리
    - 훅으로 react query쓰는부분은 무조건 하위에서
    - review 하는 컴포넌트가 어딘지 확인하고 그부분 더 분리할 수 있으면 분리하자


dashboard에서
함수들 계층과 각각의 역할 전부 알려달라고하기
어떻게 그걸가져오는가 바로 DB? 아님 api? (만일 getCached 뭐시기가 바로 DB에 연결되어있다면 api에서 그걸하게하는게 더낫지않나)

- PageContainer, PageHeader를 page.tsx로 빼기
- fetch는 따로 libs에 빼는게 나을듯