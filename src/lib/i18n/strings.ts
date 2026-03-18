export const t = {
  home: {
    subtitle: {
      ko: '기술 글쓰기, 여행 이야기, 그리고 작업물.',
      en: 'A personal space for tech writing, travel stories, and work.',
    },
    blog:      { ko: '기술 노트, 가이드, 그리고 실험들.', en: 'Tech notes, guides, and dev experiments.' },
    stories:   { ko: '여행, 일상, 길에서 찍은 사진들.',  en: 'Travel, daily life, photos from the road.' },
    portfolio: { ko: '만들고 출시한 프로젝트들.',        en: 'Projects built and shipped.' },
  },
  blog: {
    title:       { ko: 'Blog',   en: 'Blog' },
    description: { ko: '기술 노트, 가이드, 그리고 실험들.', en: 'Tech notes, guides, and experiments.' },
  },
  stories: {
    title:       { ko: 'Stories', en: 'Stories' },
    description: { ko: '여행, 일상, 그리고 기억할 것들.', en: 'Travel, daily life, and things worth remembering.' },
  },
  portfolio: {
    title:       { ko: 'Portfolio', en: 'Portfolio' },
    description: { ko: '만들고 출시한 것들.', en: "Projects I've built and things I've shipped." },
  },
  search: {
    placeholder: { ko: '제목, 태그, 설명으로 검색…',    en: 'Search by title, tags, or description…' },
    empty:       { ko: '검색 결과가 없습니다.',          en: 'No results found.' },
    count:       { ko: (n: number) => `${n}개`,          en: (n: number) => `${n} result${n === 1 ? '' : 's'}` },
  },
  related: {
    heading: { ko: '관련 글', en: 'Related Posts' },
  },
} as const
