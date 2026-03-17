import BlogPostForm from '../BlogPostForm'
import { createBlogPost } from '../actions'

export default function NewBlogPostPage() {
  return (
    <BlogPostForm
      action={createBlogPost}
      pageLabel="New post"
      submitLabel="Save as Draft"
    />
  )
}
