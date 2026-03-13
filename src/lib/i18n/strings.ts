export type Lang = 'KO' | 'EN'

export const t = {
  home: {
    subtitle: {
      KO: '기술 글쓰기, 여행 이야기, 그리고 작업물.',
      EN: 'A personal space for tech writing, travel stories, and work.',
    },
    blog:      { KO: '기술 노트, 가이드, 그리고 실험들.', EN: 'Tech notes, guides, and dev experiments.' },
    stories:   { KO: '여행, 일상, 길에서 찍은 사진들.',  EN: 'Travel, daily life, photos from the road.' },
    portfolio: { KO: '만들고 출시한 프로젝트들.',        EN: 'Projects built and shipped.' },
  },
  blog: {
    title:       { KO: 'Blog',   EN: 'Blog' },
    description: { KO: '기술 노트, 가이드, 그리고 실험들.', EN: 'Tech notes, guides, and experiments.' },
  },
  stories: {
    title:       { KO: 'Stories', EN: 'Stories' },
    description: { KO: '여행, 일상, 그리고 기억할 것들.', EN: 'Travel, daily life, and things worth remembering.' },
  },
  portfolio: {
    title:       { KO: 'Portfolio', EN: 'Portfolio' },
    description: { KO: "만들고 출시한 것들.", EN: "Projects I've built and things I've shipped." },
  },
  search: {
    placeholder: { KO: '제목, 태그, 설명으로 검색…',    EN: 'Search by title, tags, or description…' },
    empty:       { KO: '검색 결과가 없습니다.',          EN: 'No results found.' },
    count:       { KO: (n: number) => `${n}개`,          EN: (n: number) => `${n} result${n === 1 ? '' : 's'}` },
  },
  related: {
    heading: { KO: '관련 글', EN: 'Related Posts' },
  },
} as const
