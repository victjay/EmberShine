import StoriesPostForm from '../StoriesPostForm'
import { createStory } from '../actions'

export default function NewStoryPage() {
  return (
    <StoriesPostForm
      action={createStory}
      pageLabel="New story"
      submitLabel="Save as Draft"
    />
  )
}
